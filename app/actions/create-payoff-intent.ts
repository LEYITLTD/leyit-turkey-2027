'use server'

import { getToken } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

/**
 * Creates a Stripe PaymentIntent for the outstanding balance on a booking.
 *
 * The customer pays this on-session (they're sitting at their browser).
 * The webhook handles marking all remaining instalments as paid when it succeeds
 * because we tag the PI with instalmentNumber: 'PAYOFF'.
 */
export async function createPayoffIntent(bookingRef: string): Promise<
  | { ok: true;  clientSecret: string; amountPence: number }
  | { ok: false; error: string }
> {
  const cookieStore = await cookies()
  const token = await getToken({
    req:    { cookies: Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value])) } as any,
    secret: process.env.NEXTAUTH_SECRET ?? '',
  })
  if (!token?.sub) return { ok: false, error: 'Not signed in.' }

  const booking = await prisma.booking.findFirst({
    where:   { ref: bookingRef, userId: token.sub },
    include: { user: { select: { stripeCustomerId: true } } },
  })

  if (!booking)        return { ok: false, error: 'Booking not found.' }
  if (booking.status === 'FULLY_PAID') return { ok: false, error: 'This booking is already fully paid.' }
  if (booking.status === 'CANCELLED')  return { ok: false, error: 'This booking has been cancelled.' }

  const outstanding = booking.totalAmount - booking.paidAmount
  if (outstanding <= 0) return { ok: false, error: 'No outstanding balance.' }

  const stripe = getStripe()
  if (!stripe) return { ok: false, error: 'Payment system not available.' }

  const stripeCustomerId = booking.user.stripeCustomerId ?? undefined

  const pi = await stripe.paymentIntents.create({
    amount:   outstanding,
    currency: 'gbp',
    ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
    automatic_payment_methods: { enabled: true },
    description: `Light Upon Light Turkey Retreat 2027 — Early payoff (${bookingRef})`,
    metadata: {
      bookingId:        booking.id,
      bookingRef:       bookingRef,
      instalmentNumber: 'PAYOFF',    // webhook checks for this to mark all remaining as paid
      plan:             booking.plan,
    },
  })

  await prisma.auditLog.create({
    data: {
      bookingId: booking.id,
      action:    'PAYOFF_INTENT_CREATED',
      actor:     token.sub,
      newState:  { piId: pi.id, outstanding },
    },
  })

  return { ok: true, clientSecret: pi.client_secret!, amountPence: outstanding }
}
