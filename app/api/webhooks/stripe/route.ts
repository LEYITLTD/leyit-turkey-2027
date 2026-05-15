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

  // ── Idempotency — skip events we've already processed ────────────────────────
  const alreadyProcessed = await prisma.processedWebhook.findUnique({
    where: { stripeEventId: event.id },
  })
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, skipped: 'duplicate' })
  }

  // ── payment_intent.succeeded ──────────────────────────────────────────────────
  if (event.type === 'payment_intent.succeeded') {
    const pi        = event.data.object
    const bookingId = pi.metadata?.bookingId
    const rawInstNo = pi.metadata?.instalmentNumber   // '1', '2', '3', '4', or 'PAYOFF'

    if (!bookingId) {
      // Test events from the Stripe Dashboard have no metadata — not an error
      await prisma.processedWebhook.create({ data: { stripeEventId: event.id } })
      return NextResponse.json({ received: true })
    }

    const amountPaid = pi.amount_received

    try {
      const booking = await prisma.booking.findUnique({
        where:   { id: bookingId },
        include: {
          instalmentSchedules: { orderBy: { number: 'asc' } },
          user:                { select: { id: true } },
        },
      })

      if (!booking) {
        console.error(`Webhook: booking ${bookingId} not found`)
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }

      const newPaid   = booking.paidAmount + amountPaid
      const isPayoff  = rawInstNo === 'PAYOFF'
      const instalmentNo = isPayoff ? null : Number(rawInstNo ?? '1')

      const isFullyPaid = newPaid >= booking.totalAmount
      const newStatus   = isFullyPaid
        ? 'FULLY_PAID'
        : instalmentNo === 1
          ? 'DEPOSIT_ONLY'
          : 'PARTIALLY_PAID'

      // The payment method ID from this PI — save it for future off-session charges
      const pmId = typeof pi.payment_method === 'string' ? pi.payment_method : null

      await prisma.$transaction(async (tx) => {
        // 1. Update booking: paid amount, status, and save PM if not already stored
        await tx.booking.update({
          where: { id: bookingId },
          data:  {
            paidAmount: newPaid,
            status:     newStatus as any,
            // Only set on first payment — never overwrite once we have a saved card
            ...(pmId && !booking.stripePaymentMethodId ? { stripePaymentMethodId: pmId } : {}),
          },
        })

        // 2. Mark instalment(s) as paid
        const now = new Date()
        if (isPayoff) {
          // Early full payoff — mark every remaining instalment as paid
          await tx.instalmentSchedule.updateMany({
            where: {
              bookingId,
              status: { in: ['scheduled', 'processing', 'action_required'] },
            },
            data: { status: 'paid', paidAt: now },
          })
        } else {
          // Normal single instalment
          const instalment = booking.instalmentSchedules.find(s => s.number === instalmentNo)
          if (instalment) {
            await tx.instalmentSchedule.update({
              where: { id: instalment.id },
              data:  { status: 'paid', paidAt: now },
            })
          }
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
            description:    isPayoff
              ? 'Early full payoff'
              : booking.instalmentSchedules.find(s => s.number === instalmentNo)?.label ?? 'Payment',
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
              instalmentNo:    rawInstNo,
              amountPaid,
              newPaidTotal:    newPaid,
              status:          newStatus,
              savedPM:         pmId ?? 'already_set',
            },
          },
        })

        // 5. Mark this event as processed (idempotency)
        await tx.processedWebhook.create({ data: { stripeEventId: event.id } })
      })

      console.log(
        `Webhook: ${booking.ref} — ${isPayoff ? 'PAYOFF' : `instalment ${instalmentNo}`} ` +
        `£${(amountPaid / 100).toFixed(2)} → ${newStatus}`
      )

    } catch (err) {
      console.error('Webhook: DB error processing payment_intent.succeeded:', err)
      return NextResponse.json(
        { error: 'Internal server error', detail: String(err) },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({ received: true })
}
