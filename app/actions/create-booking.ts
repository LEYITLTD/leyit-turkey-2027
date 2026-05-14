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
  const rand  = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `LUL${rand}`
}

// ─── Input ────────────────────────────────────────────────────────────────────

export interface CreateBookingInput {
  roomTypeId:        string
  adults:            number
  infants:           number
  child46:           number
  child711:          number
  extraNightsBefore: number
  extraNightsAfter:  number
  baseTotal:         number   // pence — retreat price only
  ratePerExtraNight: number   // pence — from PriceBreakdown
  discountCode:      string | null
  discountAmt:       number   // pence
  plan:              'FULL' | 'INSTALMENT'
  occupants:         OccupantDraft[]
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function createBooking(input: CreateBookingInput) {
  // Use getToken (reads JWT directly from cookie) — more reliable than
  // getServerSession in Next.js 15/16 App Router server actions.
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

  const extraCost   = (input.extraNightsBefore + input.extraNightsAfter) * input.ratePerExtraNight
  const totalAmount = Math.max(0, input.baseTotal + extraCost - input.discountAmt)

  const ref = generateRef()

  // ── Create booking + occupants in one transaction ──────────────────────────
  const booking = await prisma.booking.create({
    data: {
      ref,
      userId:    userId,
      roomTypeId: input.roomTypeId,
      adults:    input.adults,
      infants:   input.infants,
      child46:   input.child46,
      child711:  input.child711,
      needsBed:  input.child711 > 0,
      needsCot:  input.infants  > 0,
      totalAmount,
      paidAmount:  0,
      status:      'DEPOSIT_ONLY',
      plan:        input.plan,
      discountCode: input.discountCode,
      discountAmt:  input.discountAmt,
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

  // Atomically claim one room
  await prisma.roomType.update({
    where: { id: input.roomTypeId },
    data:  { roomsBooked: { increment: 1 } },
  })

  // ── Instalment schedule ────────────────────────────────────────────────────
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

  // ── Audit log ──────────────────────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      bookingId: booking.id,
      action:    'BOOKING_CREATED',
      actor:     userEmail,
      newState:  { ref, totalAmount, plan: input.plan },
    },
  })

  // ── Stripe checkout ────────────────────────────────────────────────────────
  const stripe = getStripe()
  const amountNow = input.plan === 'FULL' ? totalAmount : schedule[0].amount

  if (stripe) {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency:     'gbp',
          unit_amount:  amountNow,
          product_data: {
            name: input.plan === 'FULL'
              ? 'Light Upon Light Turkey Retreat 2027 — Full payment'
              : `Light Upon Light Turkey Retreat 2027 — Deposit (25%)`,
            description: `Booking ref: ${ref}`,
          },
        },
        quantity: 1,
      }],
      success_url: `${baseUrl}/book/confirmation/${ref}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/book/review`,
      metadata:    { bookingId: booking.id, bookingRef: ref, instalmentNumber: '1' },
    })
    return { ok: true as const, ref, checkoutUrl: checkout.url! }
  }

  // Stripe not configured yet — booking is saved, payment pending
  return { ok: true as const, ref, checkoutUrl: null }
}
