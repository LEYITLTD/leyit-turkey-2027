'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface ConfirmationData {
  ref:          string
  status:       string
  plan:         string
  totalAmount:  number
  paidAmount:   number
  roomName:     string
  adults:       number
  infants:      number
  child46:      number
  child711:     number
  leadName:     string
  instalments:  {
    number:  number
    label:   string
    amount:  number
    dueDate: string   // ISO string
    status:  string
  }[]
}

export async function getBookingConfirmation(ref: string): Promise<ConfirmationData | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const booking = await prisma.booking.findFirst({
    where: {
      ref,
      userId: session.user.id,   // can only see your own booking
    },
    include: {
      roomType:            { select: { displayName: true } },
      occupants:           { where: { role: 'Lead' }, take: 1 },
      instalmentSchedules: { orderBy: { number: 'asc' } },
    },
  })

  if (!booking) return null

  return {
    ref:         booking.ref,
    status:      booking.status,
    plan:        booking.plan,
    totalAmount: booking.totalAmount,
    paidAmount:  booking.paidAmount,
    roomName:    booking.roomType.displayName,
    adults:      booking.adults,
    infants:     booking.infants,
    child46:     booking.child46,
    child711:    booking.child711,
    leadName:    booking.occupants[0]?.name ?? '',
    instalments: booking.instalmentSchedules.map(s => ({
      number:  s.number,
      label:   s.label,
      amount:  s.amount,
      dueDate: s.dueDate.toISOString(),
      status:  s.status,
    })),
  }
}
