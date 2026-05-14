'use server'

import { prisma } from '@/lib/prisma'
import { calculatePrice, validateParty } from '@/lib/pricing'
import type { BookingParty } from '@/lib/pricing'

// ─── Room type data (serialisable — safe to pass to client components) ────────

export interface RoomTypeData {
  id:             string
  displayName:    string
  category:       'SUPERIOR' | 'FAMILY' | 'SUITE'
  view:           'SEA' | 'FOREST' | 'ACCESSIBLE'
  description:    string | null
  totalInventory: number
  roomsBooked:    number
  available:      number
  maxAdults:      number
  maxTotalPeople: number
  addBedAllowed:  boolean
  addCotAllowed:  boolean
  bothAllowed:    boolean
  isSeaview:      boolean
  isBundle:       boolean
}

export async function getAvailableRooms(): Promise<RoomTypeData[]> {
  const rows = await prisma.roomType.findMany({
    where:   { bookableOnline: true, isActive: true },
    orderBy: [{ category: 'asc' }, { isSeaview: 'desc' }],
  })

  return rows.map(r => ({
    id:             r.id,
    displayName:    r.displayName,
    category:       r.category,
    view:           r.view,
    description:    r.description,
    totalInventory: r.totalInventory,
    roomsBooked:    r.roomsBooked,
    available:      r.totalInventory - r.roomsBooked,
    maxAdults:      r.maxAdults,
    maxTotalPeople: r.maxTotalPeople,
    addBedAllowed:  r.addBedAllowed,
    addCotAllowed:  r.addCotAllowed,
    bothAllowed:    r.bothAllowed,
    isSeaview:      r.isSeaview,
    isBundle:       r.isBundle,
  }))
}

// ─── Price calculation (called on form submit, not live) ──────────────────────

export async function calcPrice(roomTypeId: string, party: BookingParty) {
  const [room, config] = await Promise.all([
    prisma.roomType.findUniqueOrThrow({ where: { id: roomTypeId } }),
    prisma.pricingConfig.findUniqueOrThrow({ where: { id: 'active' } }),
  ])

  // Server-side validation before calculating
  const errors = validateParty(party, room)
  if (errors.length > 0) {
    return { ok: false as const, errors }
  }

  const breakdown = calculatePrice(party, room, config)
  return { ok: true as const, breakdown }
}

// ─── Discount code validation ─────────────────────────────────────────────────

export async function validateDiscountCode(code: string) {
  const dc = await prisma.discountCode.findFirst({
    where: {
      code:     { equals: code.trim().toUpperCase() },
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  })

  if (!dc) return { ok: false as const, message: 'Code not found or expired.' }

  if (dc.maxUsage !== null && dc.usageCount >= dc.maxUsage) {
    return { ok: false as const, message: 'This code has reached its usage limit.' }
  }

  return {
    ok:      true as const,
    percent: dc.discountPercent ?? undefined,
    fixed:   dc.discountFixed   ?? undefined,
    label:   dc.description ?? code.toUpperCase(),
  }
}
