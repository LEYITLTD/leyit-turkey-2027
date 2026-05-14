'use server'

import { getToken } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export interface MyBooking {
  id:                string
  ref:               string
  status:            string
  plan:              string
  roomName:          string
  adults:            number
  infants:           number
  child46:           number
  child711:          number
  extraNightsBefore: number
  extraNightsAfter:  number
  totalAmount:       number
  paidAmount:        number
  discountCode:      string | null
  discountAmt:       number
  createdAt:         string   // ISO
  nextInstalment: {
    label:   string
    amount:  number
    dueDate: string
  } | null
}

export async function getMyBookings(): Promise<MyBooking[]> {
  const cookieStore = await cookies()
  const token = await getToken({
    req:    { cookies: Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value])) } as any,
    secret: process.env.NEXTAUTH_SECRET ?? '',
  })
  if (!token?.sub) return []

  const bookings = await prisma.booking.findMany({
    where:   { userId: token.sub, status: { not: 'CANCELLED' } },
    orderBy: { createdAt: 'desc' },
    include: {
      roomType:            { select: { displayName: true } },
      instalmentSchedules: { orderBy: { number: 'asc' } },
    },
  })

  return bookings.map(b => {
    const nextInstalment = b.instalmentSchedules.find(s => s.status === 'scheduled') ?? null
    return {
      id:                b.id,
      ref:               b.ref,
      status:            b.status,
      plan:              b.plan,
      roomName:          b.roomType.displayName,
      adults:            b.adults,
      infants:           b.infants,
      child46:           b.child46,
      child711:          b.child711,
      extraNightsBefore: b.extraNightsBefore,
      extraNightsAfter:  b.extraNightsAfter,
      totalAmount:       b.totalAmount,
      paidAmount:        b.paidAmount,
      discountCode:      b.discountCode,
      discountAmt:       b.discountAmt,
      createdAt:         b.createdAt.toISOString(),
      nextInstalment:    nextInstalment
        ? {
            label:   nextInstalment.label,
            amount:  nextInstalment.amount,
            dueDate: nextInstalment.dueDate.toISOString(),
          }
        : null,
    }
  })
}
