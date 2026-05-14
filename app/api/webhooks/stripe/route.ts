import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

// Stripe sends raw body — Next.js must not parse it
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const sig    = req.headers.get('stripe-signature') ?? ''
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 })
  }

  let event
  try {
    const rawBody = await req.text()
    event = stripe.webhooks.constructEvent(rawBody, sig, secret)
  } catch (err) {
    console.error('Stripe webhook signature failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ── Handle checkout.session.completed ─────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session      = event.data.object
    const bookingId    = session.metadata?.bookingId
    const instalmentNo = Number(session.metadata?.instalmentNumber ?? '1')
    const amountPaid   = session.amount_total ?? 0

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId in metadata' }, { status: 400 })
    }

    // Fetch booking and its schedule
    const booking = await prisma.booking.findUnique({
      where:   { id: bookingId },
      include: { instalmentSchedules: { orderBy: { number: 'asc' } } },
    })
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const newPaid    = booking.paidAmount + amountPaid
    const isFullyPaid = newPaid >= booking.totalAmount

    // Determine new booking status
    const newStatus = isFullyPaid ? 'FULLY_PAID' : 'DEPOSIT_ONLY'

    // Update booking paid amount + status
    await prisma.booking.update({
      where: { id: bookingId },
      data:  { paidAmount: newPaid, status: newStatus as any },
    })

    // Mark the matching instalment as paid
    const instalment = booking.instalmentSchedules.find(s => s.number === instalmentNo)
    if (instalment) {
      await prisma.instalmentSchedule.update({
        where: { id: instalment.id },
        data:  { status: 'paid', paidAt: new Date() },
      })
    }

    // Record the payment
    await prisma.payment.create({
      data: {
        bookingId,
        stripePaymentIntentId: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
        amount:         amountPaid,
        currency:       session.currency ?? 'gbp',
        status:         'CAPTURED',
        idempotencyKey: `${booking.ref}-stripe-${session.id}`,
        description:    instalment?.label ?? 'Payment',
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        bookingId,
        action:   'PAYMENT_RECEIVED',
        actor:    'stripe-webhook',
        newState: {
          stripeSessionId: session.id,
          amountPaid,
          newPaidTotal: newPaid,
          status: newStatus,
        },
      },
    })
  }

  return NextResponse.json({ received: true })
}
