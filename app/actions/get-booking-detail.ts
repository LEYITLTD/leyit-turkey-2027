'use server'

import { getToken } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export interface BookingOccupant {
  name:   string
  dob:    string   // ISO
  gender: string   // M / F
  role:   string   // Lead / Adult / Infant / Child46 / Child711
}

export interface BookingDetail {
  id:                string
  ref:               string
  status:            string
  plan:              string
  roomName:          string
  roomCategory:      string
  isSeaview:         boolean
  isBundle:          boolean
  adults:            number
  infants:           number
  child46:           number
  child711:          number
  extraNightsBefore: number
  extraNightsAfter:  number
  totalAmount:       number
  paidAmount:        number
  extraNightsCost:   number
  discountCode:      string | null
  discountAmt:       number
  createdAt:         string
  occupants:         BookingOccupant[]
  instalments: {
    number:  number
    label:   string
    amount:  number
    dueDate: string
    status:  string
    paidAt:  string | null
  }[]
}

export async function getBookingDetail(ref: string): Promise<BookingDetail | null> {
  const cookieStore = await cookies()
  const token = await getToken({
    req:    { cookies: Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value])) } as any,
    secret: process.env.NEXTAUTH_SECRET ?? '',
  })
  if (!token?.sub) return null

  const booking = await prisma.booking.findFirst({
    where: { ref, userId: token.sub },
    include: {
      roomType:            { select: { displayName: true, category: true, isSeaview: true, isBundle: true } },
      occupants:           { orderBy: { createdAt: 'asc' } },
      instalmentSchedules: { orderBy: { number: 'asc' } },
    },
  })

  if (!booking) return null

  return {
    id:                booking.id,
    ref:               booking.ref,
    status:            booking.status,
    plan:              booking.plan,
    roomName:          booking.roomType.displayName,
    roomCategory:      booking.roomType.category,
    isSeaview:         booking.roomType.isSeaview,
    isBundle:          booking.roomType.isBundle,
    adults:            booking.adults,
    infants:           booking.infants,
    child46:           booking.child46,
    child711:          booking.child711,
    extraNightsBefore: booking.extraNightsBefore,
    extraNightsAfter:  booking.extraNightsAfter,
    totalAmount:       booking.totalAmount,
    paidAmount:        booking.paidAmount,
    extraNightsCost:   booking.extraNightsCost,
    discountCode:      booking.discountCode,
    discountAmt:       booking.discountAmt,
    createdAt:         booking.createdAt.toISOString(),
    occupants: booking.occupants.map(o => ({
      name:   o.name,
      dob:    o.dob.toISOString(),
      gender: o.gender,
      role:   o.role,
    })),
    instalments: booking.instalmentSchedules.map(s => ({
      number:  s.number,
      label:   s.label,
      amount:  s.amount,
      dueDate: s.dueDate.toISOString(),
      status:  s.status,
      paidAt:  s.paidAt?.toISOString() ?? null,
    })),
  }
}
