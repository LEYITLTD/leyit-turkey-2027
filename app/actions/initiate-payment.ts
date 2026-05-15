'use server'

import { getToken } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'
import { buildInstalmentSchedule } from '@/lib/pricing'
import type { OccupantDraft } from '@/lib/booking-flow'

// ─── Ref generator ────────────────────────────────────────────────────────────

function generateRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'LUL' + Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

// ─── Input ────────────────────────────────────────────────────────────────────

export interface InitiatePaymentInput {
  roomTypeId:        string
  adults:            number
  infants:           number
  child46:           number
  child711:          number
  extraNightsBefore: number
  extraNightsAfter:  number
  baseTotal:         number   // pence
  ratePerExtraNight: number   // pence
  discountCode:      string | null
  discountAmt:       number   // pence
  plan:              'FULL' | 'INSTALMENT'
  occupants:         OccupantDraft[]
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function initiatePayment(input: InitiatePaymentInput) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const token = await getToken({
    req:    { cookies: Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value])) } as any,
    secret: process.env.NEXTAUTH_SECRET ?? '',
  })
  if (!token?.sub) {
    return { ok: false as const, error: 'You must be signed in to complete a booking.' }
  }

  const userId    = token.sub
  const userEmail = (token.email as string | undefined) ?? token.sub

  // ── Totals ───────────────────────────────────────────────────────────────────
  const extraNightsTotal = input.extraNightsBefore + input.extraNightsAfter
  const extraCost        = extraNightsTotal * input.ratePerExtraNight
  const totalAmount      = Math.max(0, input.baseTotal + extraCost - input.discountAmt)

  const ref = generateRef()

  // ── Booking + occupants ──────────────────────────────────────────────────────
  const booking = await prisma.booking.create({
    data: {
      ref,
      userId,
      roomTypeId:  input.roomTypeId,
      adults:      input.adults,
      infants:     input.infants,
      child46:     input.child46,
      child711:    input.child711,
      needsBed:          input.child711 > 0,
      needsCot:          input.infants  > 0,
      extraNightsBefore: input.extraNightsBefore,
      extraNightsAfter:  input.extraNightsAfter,
      extraNightsCost:   extraCost,
      totalAmount,
      paidAmount:        0,
      status:            'DEPOSIT_ONLY',
      plan:              input.plan,
      discountCode:      input.discountCode,
      discountAmt:       input.discountAmt,
      occupants: {
        create: input.occupants.map(o => ({
          name:   o.name,
          dob:    new Date(o.dob),
          gender: o.gender,
          role:   o.role,
        })),
      },
    },
  })

  // ── Claim room atomically ────────────────────────────────────────────────────
  await prisma.roomType.update({
    where: { id: input.roomTypeId },
    data:  { roomsBooked: { increment: 1 } },
  })

  // ── Instalment schedule ──────────────────────────────────────────────────────
  const schedule = buildInstalmentSchedule(totalAmount, input.plan)
  await prisma.instalmentSchedule.createMany({
    data: schedule.map(s => ({
      bookingId:      booking.id,
      number:         s.number,
      label:          s.label,
      amount:         s.amount,
      dueDate:        s.dueDate,
      idempotencyKey: `${ref}-${s.number}`,
    })),
  })

  // ── Audit log ────────────────────────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      bookingId: booking.id,
      action:    'BOOKING_CREATED',
      actor:     userEmail,
      newState:  { ref, totalAmount, plan: input.plan },
    },
  })

  // ── Stripe PaymentIntent ─────────────────────────────────────────────────────
  const stripe    = getStripe()
  const amountNow = input.plan === 'FULL' ? totalAmount : schedule[0].amount

  // ── Human-readable pence → £ helper for metadata strings ───────────────────
  const gbp = (pence: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100)

  if (stripe) {
    // ── Find or create a Stripe Customer for this user ───────────────────────
    // The Customer is needed to vault the payment method for future
    // off-session instalment charges.
    const dbUser = await prisma.user.findUnique({
      where:  { id: userId },
      select: { stripeCustomerId: true, name: true },
    })

    let stripeCustomerId = dbUser?.stripeCustomerId ?? null

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email:    userEmail,
        name:     dbUser?.name ?? undefined,
        metadata: { userId },
      })
      stripeCustomerId = customer.id
      await prisma.user.update({
        where: { id: userId },
        data:  { stripeCustomerId },
      })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   amountNow,
      currency: 'gbp',
      customer: stripeCustomerId,
      // save card for future off-session instalment charges
      setup_future_usage: 'off_session',
      // Required for PaymentElement to dynamically show all payment methods
      // configured in the Stripe Dashboard (cards, Apple Pay, Google Pay, etc.)
      automatic_payment_methods: { enabled: true },
      description: input.plan === 'FULL'
        ? `Light Upon Light Turkey Retreat 2027 — Full payment (${ref})`
        : `Light Upon Light Turkey Retreat 2027 — Deposit 25% (${ref})`,
      metadata: {
        // ── Booking identity ──────────────────────────────────────────────────
        bookingRef:       ref,
        bookingId:        booking.id,
        instalmentNumber: '1',
        plan:             input.plan,

        // ── Customer ──────────────────────────────────────────────────────────
        customer_name:  input.occupants.find(o => o.role === 'Lead')?.name ?? '',
        customer_email: userEmail,

        // ── Party ─────────────────────────────────────────────────────────────
        adults:    String(input.adults),
        infants:   String(input.infants),
        child46:   String(input.child46),
        child711:  String(input.child711),

        // ── Cost breakdown (pence + formatted) ────────────────────────────────
        cost_retreat:           String(input.baseTotal),
        cost_retreat_fmt:       gbp(input.baseTotal),

        ...(extraNightsTotal > 0 ? {
          extra_nights_before:  String(input.extraNightsBefore),
          extra_nights_after:   String(input.extraNightsAfter),
          extra_nights_rate:    gbp(input.ratePerExtraNight),
          cost_extra_nights:    String(extraCost),
          cost_extra_nights_fmt: gbp(extraCost),
        } : {}),

        ...(input.discountAmt > 0 ? {
          discount_code:      input.discountCode ?? '',
          cost_discount:      String(-input.discountAmt),
          cost_discount_fmt:  `-${gbp(input.discountAmt)}`,
        } : {}),

        cost_total:     String(totalAmount),
        cost_total_fmt: gbp(totalAmount),

        // ── What's being charged now ──────────────────────────────────────────
        charge_today:     String(amountNow),
        charge_today_fmt: gbp(amountNow),
      },
    })

    return {
      ok:           true  as const,
      ref,
      bookingId:    booking.id,
      clientSecret: paymentIntent.client_secret!,
    }
  }

  // Stripe not yet configured — booking saved, skip payment step
  return { ok: true as const, ref, bookingId: booking.id, clientSecret: null }
}
