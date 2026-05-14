import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })

  const sig    = req.headers.get('stripe-signature') ?? ''
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 })

  let event
  try {
    const rawBody = await req.text()
    event = stripe.webhooks.constructEvent(rawBody, sig, secret)
  } catch (err) {
    console.error('Stripe webhook signature failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ── payment_intent.succeeded ─────────────────────────────────────────────────
  if (event.type === 'payment_intent.succeeded') {
    const pi           = event.data.object
    const bookingId    = pi.metadata?.bookingId
    const instalmentNo = Number(pi.metadata?.instalmentNumber ?? '1')
    const amountPaid   = pi.amount_received   // actual funds captured

    if (!bookingId) {
      // Test events from Stripe Dashboard have no metadata — not an error
      console.log('Webhook: no bookingId in metadata, skipping (likely a test event)')
      return NextResponse.json({ received: true })
    }

    // ── Idempotency guard ───────────────────────────────────────────────────────
    // Stripe retries on failure. Check if we already processed this PaymentIntent
    // to avoid double-counting on retries.
    const existing = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: pi.id },
    })
    if (existing) {
      console.log(`Webhook: PaymentIntent ${pi.id} already processed, skipping`)
      return NextResponse.json({ received: true })
    }

    // ── Process payment ─────────────────────────────────────────────────────────
    try {
      const booking = await prisma.booking.findUnique({
        where:   { id: bookingId },
        include: { instalmentSchedules: { orderBy: { number: 'asc' } } },
      })

      if (!booking) {
        console.error(`Webhook: booking ${bookingId} not found`)
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }

      const newPaid = booking.paidAmount + amountPaid

      // Derive status: fully paid, deposit only (1st instalment), or partially paid
      const isFullyPaid = newPaid >= booking.totalAmount
      const newStatus = isFullyPaid
        ? 'FULLY_PAID'
        : instalmentNo === 1
          ? 'DEPOSIT_ONLY'
          : 'PARTIALLY_PAID'

      // ── All DB writes in a single transaction ─────────────────────────────────
      await prisma.$transaction(async (tx) => {
        // 1. Update booking totals + status
        await tx.booking.update({
          where: { id: bookingId },
          data:  { paidAmount: newPaid, status: newStatus as any },
        })

        // 2. Mark instalment as paid
        const instalment = booking.instalmentSchedules.find(s => s.number === instalmentNo)
        if (instalment) {
          await tx.instalmentSchedule.update({
            where: { id: instalment.id },
            data:  { status: 'paid', paidAt: new Date() },
          })
        }

        // 3. Record the payment
        await tx.payment.create({
          data: {
            bookingId,
            stripePaymentIntentId: pi.id,
            amount:         amountPaid,
            currency:       pi.currency,
            status:         'CAPTURED',
            idempotencyKey: `${booking.ref}-pi-${pi.id}`,
            description:    instalment?.label ?? 'Payment',
          },
        })

        // 4. Audit log
        await tx.auditLog.create({
          data: {
            bookingId,
            action:   'PAYMENT_RECEIVED',
            actor:    'stripe-webhook',
            newState: {
              paymentIntentId: pi.id,
              instalmentNo,
              amountPaid,
              newPaidTotal: newPaid,
              status: newStatus,
            },
          },
        })
      })

      console.log(`Webhook: processed payment for booking ${booking.ref} — £${(amountPaid / 100).toFixed(2)} — status: ${newStatus}`)

    } catch (err) {
      console.error('Webhook: DB error processing payment_intent.succeeded:', err)
      return NextResponse.json(
        { error: 'Internal server error processing payment', detail: String(err) },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ received: true })
}
