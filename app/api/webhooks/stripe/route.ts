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
  // Fired when a PaymentIntent is successfully confirmed (card payments,
  // 3D Secure redirect returns, etc.)
  if (event.type === 'payment_intent.succeeded') {
    const pi           = event.data.object
    const bookingId    = pi.metadata?.bookingId
    const instalmentNo = Number(pi.metadata?.instalmentNumber ?? '1')
    const amountPaid   = pi.amount_received   // actual funds captured

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId in metadata' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where:   { id: bookingId },
      include: { instalmentSchedules: { orderBy: { number: 'asc' } } },
    })
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const newPaid     = booking.paidAmount + amountPaid
    const isFullyPaid = newPaid >= booking.totalAmount
    const newStatus   = isFullyPaid ? 'FULLY_PAID' : 'DEPOSIT_ONLY'

    await prisma.booking.update({
      where: { id: bookingId },
      data:  { paidAmount: newPaid, status: newStatus as any },
    })

    const instalment = booking.instalmentSchedules.find(s => s.number === instalmentNo)
    if (instalment) {
      await prisma.instalmentSchedule.update({
        where: { id: instalment.id },
        data:  { status: 'paid', paidAt: new Date() },
      })
    }

    await prisma.payment.create({
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

    await prisma.auditLog.create({
      data: {
        bookingId,
        action:   'PAYMENT_RECEIVED',
        actor:    'stripe-webhook',
        newState: {
          paymentIntentId: pi.id,
          amountPaid,
          newPaidTotal: newPaid,
          status: newStatus,
        },
      },
    })
  }

  return NextResponse.json({ received: true })
}
