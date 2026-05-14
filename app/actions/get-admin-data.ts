'use server'

import { prisma } from '@/lib/prisma'

export interface AdminOccupant {
  name:   string
  dob:    string
  gender: string
  role:   string
}

export interface AdminInstalment {
  number:  number
  label:   string
  amount:  number
  dueDate: string
  status:  string
  paidAt:  string | null
}

export interface AdminBooking {
  id:                string
  ref:               string
  status:            string
  plan:              string
  guestName:         string
  guestEmail:        string
  roomName:          string
  roomId:            string
  adults:            number
  infants:           number
  child46:           number
  child711:          number
  totalGuests:       number
  extraNightsBefore: number
  extraNightsAfter:  number
  extraNightsCost:   number
  totalAmount:       number
  paidAmount:        number
  discountCode:      string | null
  discountAmt:       number
  createdAt:         string
  occupants:         AdminOccupant[]
  instalments:       AdminInstalment[]
}

export interface AdminRoomStat {
  id:        string
  name:      string
  category:  string
  isSeaview: boolean
  total:     number
  booked:    number
}

export interface AdminStats {
  totalBookings:   number
  activeBookings:  number
  totalRevenue:    number   // pence — total across all bookings
  totalPaid:       number   // pence — sum of paidAmount
  totalOutstanding: number  // pence
  totalGuests:     number
  depositOnly:     number
  partiallyPaid:   number
  fullyPaid:       number
  cancelled:       number
}

export interface AdminData {
  stats:    AdminStats
  rooms:    AdminRoomStat[]
  bookings: AdminBooking[]
}

export async function getAdminData(): Promise<AdminData> {
  const [bookings, rooms] = await Promise.all([
    prisma.booking.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: {
        user:               { select: { name: true, email: true } },
        roomType:           { select: { id: true, displayName: true, category: true, isSeaview: true } },
        occupants:          { orderBy: { createdAt: 'asc' } },
        instalmentSchedules:{ orderBy: { number: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.roomType.findMany({
      where:   { isActive: true },
      orderBy: { displayName: 'asc' },
    }),
  ])

  // ── Stats ───────────────────────────────────────────────────────────────────
  const activeBookings = bookings.filter(b => b.status !== 'CANCELLED')
  const stats: AdminStats = {
    totalBookings:    bookings.length,
    activeBookings:   activeBookings.length,
    totalRevenue:     activeBookings.reduce((s, b) => s + b.totalAmount, 0),
    totalPaid:        activeBookings.reduce((s, b) => s + b.paidAmount, 0),
    totalOutstanding: activeBookings.reduce((s, b) => s + Math.max(0, b.totalAmount - b.paidAmount), 0),
    totalGuests:      activeBookings.reduce((s, b) => s + b.adults + b.infants + b.child46 + b.child711, 0),
    depositOnly:      activeBookings.filter(b => b.status === 'DEPOSIT_ONLY').length,
    partiallyPaid:    activeBookings.filter(b => b.status === 'PARTIALLY_PAID').length,
    fullyPaid:        activeBookings.filter(b => b.status === 'FULLY_PAID').length,
    cancelled:        bookings.filter(b => b.status === 'CANCELLED').length,
  }

  // ── Room stats ──────────────────────────────────────────────────────────────
  const roomStats: AdminRoomStat[] = rooms.map(r => ({
    id:        r.id,
    name:      r.displayName,
    category:  r.category,
    isSeaview: r.isSeaview,
    total:     r.totalInventory,
    booked:    r.roomsBooked,
  }))

  // ── Bookings ────────────────────────────────────────────────────────────────
  const adminBookings: AdminBooking[] = bookings.map(b => ({
    id:                b.id,
    ref:               b.ref,
    status:            b.status,
    plan:              b.plan,
    guestName:         b.user.name,
    guestEmail:        b.user.email,
    roomName:          b.roomType.displayName,
    roomId:            b.roomType.id,
    adults:            b.adults,
    infants:           b.infants,
    child46:           b.child46,
    child711:          b.child711,
    totalGuests:       b.adults + b.infants + b.child46 + b.child711,
    extraNightsBefore: b.extraNightsBefore,
    extraNightsAfter:  b.extraNightsAfter,
    extraNightsCost:   b.extraNightsCost,
    totalAmount:       b.totalAmount,
    paidAmount:        b.paidAmount,
    discountCode:      b.discountCode,
    discountAmt:       b.discountAmt,
    createdAt:         b.createdAt.toISOString(),
    occupants: b.occupants.map(o => ({
      name:   o.name,
      dob:    o.dob.toISOString(),
      gender: o.gender,
      role:   o.role,
    })),
    instalments: b.instalmentSchedules.map(s => ({
      number:  s.number,
      label:   s.label,
      amount:  s.amount,
      dueDate: s.dueDate.toISOString(),
      status:  s.status,
      paidAt:  s.paidAt?.toISOString() ?? null,
    })),
  }))

  return { stats, rooms: roomStats, bookings: adminBookings }
}
