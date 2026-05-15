/**
 * POST /api/cron/charge-instalments
 * GET  /api/cron/charge-instalments   (Vercel Cron invokes as GET)
 *
 * Charges all instalment payments that are now due.
 *
 * Rules:
 *  - Only charges instalments with status = 'scheduled'
 *  - Only charges the lowest-numbered due instalment per booking (sequential)
 *  - All prior instalments for that booking must already be 'paid'
 *  - Sets status → 'processing' before calling Stripe (prevents double-charge
 *    if cron fires twice before webhook confirms)
 *  - On Stripe error: reverts to 'scheduled' (retry next run) or 'failed' / 'action_required'
 *  - Audit log entry for every attempt
 *
 * Timing:
 *  The instalment dueDate is set by buildInstalmentSchedule() in lib/pricing.ts.
 *  INSTALMENT_INTERVAL_DAYS env var controls the gap:
 *    unset → calendar months (production)
 *    1     → 1 day           (testing)
 *  The cron always respects whatever dueDate is in the DB — no special modes here.
 *
 * Security:
 *  Requires Authorization: Bearer <CRON_SECRET> header.
 *  Vercel sends this automatically when CRON_SECRET env var is set.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

async function run() {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const now = new Date()

  // ── Find all scheduled instalments that are now due ──────────────────────────
  const due = await prisma.instalmentSchedule.findMany({
    where: {
      status:  'scheduled',
      dueDate: { lte: now },
    },
    include: {
      booking: {
        include: {
          instalmentSchedules: { orderBy: { number: 'asc' } },
          user:                { select: { id: true, stripeCustomerId: true } },
        },
      },
    },
    orderBy: [{ bookingId: 'asc' }, { number: 'asc' }],
  })

  // ── Per booking: only the first eligible instalment (sequential charging) ────
  // An instalment is eligible only if every instalment before it is 'paid'.
  const seenBookings = new Set<string>()
  const toCharge = due.filter(inst => {
    if (seenBookings.has(inst.bookingId)) return false   // already queued one for this booking

    const allPriorPaid = inst.booking.instalmentSchedules
      .filter(s => s.number < inst.number)
      .every(s => s.status === 'paid')

    if (!allPriorPaid) return false

    seenBookings.add(inst.bookingId)
    return true
  })

  const results: object[] = []

  for (const instalment of toCharge) {
    const { booking }           = instalment
    const stripeCustomerId      = booking.user.stripeCustomerId
    const stripePaymentMethodId = booking.stripePaymentMethodId

    // ── Skip bookings that don't yet have a saved payment method ─────────────
    if (!stripeCustomerId || !stripePaymentMethodId) {
      results.push({
        ref:       booking.ref,
        instalment: instalment.number,
        status:    'skipped',
        reason:    !stripeCustomerId ? 'no_stripe_customer' : 'no_saved_payment_method',
      })
      continue
    }

    // ── Mark as 'processing' BEFORE hitting Stripe ───────────────────────────
    // This prevents a second cron run from charging the same instalment while
    // we are waiting for the Stripe webhook to confirm success.
    await prisma.instalmentSchedule.update({
      where: { id: instalment.id },
      data:  { status: 'processing' },
    })

    try {
      // ── Create and immediately confirm an off-session PaymentIntent ─────────
      const pi = await stripe.paymentIntents.create(
        {
          amount:         instalment.amount,
          currency:       'gbp',
          customer:       stripeCustomerId,
          payment_method: stripePaymentMethodId,
          off_session:    true,
          confirm:        true,
          description:    `Light Upon Light Turkey Retreat 2027 — ${instalment.label} (${booking.ref})`,
          metadata: {
            bookingId:        booking.id,
            bookingRef:       booking.ref,
            instalmentNumber: String(instalment.number),
            plan:             booking.plan,
          },
        },
        {
          // Idempotency key: unique per instalment — safe to retry if Stripe times out
          idempotencyKey: `cron-${instalment.idempotencyKey}`,
        },
      )

      // PI accepted — the webhook (payment_intent.succeeded) will set status → 'paid'
      await prisma.auditLog.create({
        data: {
          bookingId: booking.id,
          action:    'INSTALMENT_CHARGE_INITIATED',
          actor:     'cron',
          newState:  {
            instalmentNumber: instalment.number,
            amount:           instalment.amount,
            piId:             pi.id,
            piStatus:         pi.status,
          },
        },
      })

      results.push({
        ref:        booking.ref,
        instalment: instalment.number,
        status:     'processing',
        piId:       pi.id,
      })

    } catch (err: any) {
      // ── Categorise the Stripe error and set the right status ─────────────
      const code       = err.code as string | undefined
      const isDeclined = code === 'card_declined' || !!err.decline_code
      const is3DS      = code === 'authentication_required'
      const nextStatus = is3DS      ? 'action_required'
                       : isDeclined ? 'failed'
                       :              'scheduled'   // transient error — retry next run

      await prisma.instalmentSchedule.update({
        where: { id: instalment.id },
        data:  { status: nextStatus },
      })

      await prisma.auditLog.create({
        data: {
          bookingId: booking.id,
          action:    'INSTALMENT_CHARGE_FAILED',
          actor:     'cron',
          newState:  {
            instalmentNumber: instalment.number,
            amount:           instalment.amount,
            stripeCode:       code ?? null,
            stripeMessage:    err.message ?? null,
            nextStatus,
          },
        },
      })

      results.push({
        ref:        booking.ref,
        instalment: instalment.number,
        status:     nextStatus,
        error:      err.message,
      })
    }
  }

  return NextResponse.json({
    ranAt:     now.toISOString(),
    evaluated: due.length,
    eligible:  toCharge.length,
    results,
  })
}

// Vercel Cron fires GET; manual test triggers can use POST
export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  return run()
}

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  return run()
}
