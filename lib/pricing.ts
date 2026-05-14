/**
 * Pricing calculator — pure functions, no DB calls.
 *
 * The caller fetches PricingConfig once (e.g. in a server action or route
 * handler) and passes it in. This keeps the calculator fast, testable, and
 * reusable across the booking flow and admin preview.
 *
 * All monetary values are in PENCE (£1 = 100). Never store or display floats.
 *
 * Pricing rules (source: BookingEngine_Combined_Plan.docx §B.2.2):
 *
 *   Standard rooms
 *   ─────────────
 *   Adults     │ 1 adult  → rateAdultSinglePerNight × nights
 *              │ 2+ adults → adults × rateAdultDoublePerNight × nights
 *   Infants    │ infants × rateInfantPerNight × nights          (age 0–3)
 *   Child 4–6  │ first child  → rateChild46First  (flat, whole stay)
 *              │ each extra   → rateChild46Extra   (flat, whole stay each)
 *   Child 7–11 │ child711 × rateChild711PerNight × nights
 *   Sea view   │ + seaviewSupplement (flat, once, applied after occupant total)
 *
 *   Bundle rooms  (isBundle = true)
 *   ────────────────────────────────
 *   Same structure BUT use the bundle-specific rates, then apply
 *   bundleDiscountPercent on the full subtotal (sea view included).
 *   The bundle discount is always on — no toggle needed.
 *
 *   Discount codes
 *   ─────────────
 *   Applied after bundle discount. Can be % or fixed pence. Total floors at 0.
 */

import type { PricingConfig, RoomType } from '@prisma/client'

// ─── Input types ─────────────────────────────────────────────────────────────

export interface BookingParty {
  adults:  number   // must be >= 1
  infants: number   // age 0–3
  child46: number   // age 4–6
  child711: number  // age 7–11
}

export interface DiscountInput {
  code:    string
  percent?: number  // e.g. 10 = 10% off
  fixed?:   number  // pence — fixed amount off
}

// ─── Output type ─────────────────────────────────────────────────────────────

export interface PriceBreakdown {
  nights:                 number

  // Line items (all positive, in pence)
  adultsSubtotal:         number
  infantsSubtotal:        number
  child46Subtotal:        number
  child711Subtotal:       number
  seaviewSupplement:      number

  // Subtotal before any discounts
  subtotalBeforeDiscount: number

  // Discounts (zero or negative)
  bundleDiscount:         number  // 0 unless isBundle
  discountCodeAmt:        number  // 0 unless a code was applied

  // Final
  total:                  number  // always >= 0
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface PartyValidationError {
  field:   string
  message: string
}

/**
 * Validates a party against room constraints.
 * Returns an array of errors — empty means valid.
 */
export function validateParty(
  party:    BookingParty,
  room:     Pick<RoomType, 'maxAdults' | 'maxTotalPeople' | 'addBedAllowed' | 'addCotAllowed' | 'bothAllowed'>,
): PartyValidationError[] {
  const errors: PartyValidationError[] = []
  const { adults, infants, child46, child711 } = party
  const totalPeople = adults + infants + child46 + child711

  if (adults < 1) {
    errors.push({ field: 'adults', message: 'At least one adult is required.' })
  }

  if (adults > room.maxAdults) {
    errors.push({
      field:   'adults',
      message: `This room type allows a maximum of ${room.maxAdults} adult${room.maxAdults === 1 ? '' : 's'}.`,
    })
  }

  if (totalPeople > room.maxTotalPeople) {
    errors.push({
      field:   'total',
      message: `This room type holds a maximum of ${room.maxTotalPeople} people in total.`,
    })
  }

  // Bed / cot rule checks
  const needsBed = child711 > 0   // 7–11s always need a bed
  const needsCot = infants > 0    // infants always need a cot

  if (needsBed && !room.addBedAllowed) {
    errors.push({
      field:   'child711',
      message: 'This room type does not accommodate children aged 7–11 (extra bed not available).',
    })
  }

  if (needsCot && !room.addCotAllowed) {
    errors.push({
      field:   'infants',
      message: 'This room type does not accommodate infants (cot not available).',
    })
  }

  if (needsBed && needsCot && !room.bothAllowed) {
    errors.push({
      field:   'total',
      message: 'This room type cannot accommodate both an extra bed and a cot at the same time.',
    })
  }

  return errors
}

// ─── Core calculator ─────────────────────────────────────────────────────────

/**
 * Calculates the full price breakdown for a booking.
 *
 * @param party    - Number of people by age band
 * @param room     - Just the flags we need (isSeaview, isBundle)
 * @param config   - Active PricingConfig row from the database
 * @param discount - Optional validated discount code
 */
export function calculatePrice(
  party:    BookingParty,
  room:     Pick<RoomType, 'isSeaview' | 'isBundle'>,
  config:   PricingConfig,
  discount?: DiscountInput,
): PriceBreakdown {
  const { adults, infants, child46, child711 } = party
  const { nights } = config

  // ── Adults ────────────────────────────────────────────────────────────────
  // Bundle rooms use a flat per-adult rate (no single supplement).
  // Standard rooms: 1 adult pays the single rate; 2+ pay the double rate each.
  const adultsSubtotal = room.isBundle
    ? adults * config.bundleRateAdultDouble * nights
    : adults === 1
      ? config.rateAdultSinglePerNight * nights
      : adults * config.rateAdultDoublePerNight * nights

  // ── Infants (0–3) ────────────────────────────────────────────────────────
  // Same rate regardless of room type.
  const infantsSubtotal = infants * config.rateInfantPerNight * nights

  // ── Children 4–6 ─────────────────────────────────────────────────────────
  // First child: flat rate for the whole stay (not per night).
  // Each additional child: a separate flat rate for the whole stay.
  // Bundle rooms use a different "extra" rate; first-child rate is the same.
  let child46Subtotal = 0
  if (child46 >= 1) {
    child46Subtotal += config.rateChild46First                          // first child
    const extraKids = child46 - 1
    if (extraKids > 0) {
      const extraRate = room.isBundle
        ? config.bundleRateChild46Extra
        : config.rateChild46Extra
      child46Subtotal += extraKids * extraRate                          // additional children
    }
  }

  // ── Children 7–11 ────────────────────────────────────────────────────────
  const child711Rate = room.isBundle
    ? config.bundleRateChild711Night
    : config.rateChild711PerNight
  const child711Subtotal = child711 * child711Rate * nights

  // ── Sea view supplement ───────────────────────────────────────────────────
  // Flat, applied once. Same for standard and bundle rooms.
  const seaviewSupplement = room.isSeaview ? config.seaviewSupplement : 0

  // ── Subtotal ──────────────────────────────────────────────────────────────
  const subtotalBeforeDiscount =
    adultsSubtotal +
    infantsSubtotal +
    child46Subtotal +
    child711Subtotal +
    seaviewSupplement

  // ── Bundle discount ───────────────────────────────────────────────────────
  // Always applied on bundle rooms. Calculated on the full subtotal (sea view
  // supplement included). Stored as a negative number for display purposes.
  const bundleDiscount = room.isBundle
    ? -Math.round(subtotalBeforeDiscount * config.bundleDiscountPercent / 100)
    : 0

  const afterBundleDiscount = subtotalBeforeDiscount + bundleDiscount

  // ── Discount code ─────────────────────────────────────────────────────────
  // Applied after bundle discount. Fixed takes priority over percent if both
  // somehow exist (shouldn't happen — DB enforces one or the other).
  let discountCodeAmt = 0
  if (discount) {
    if (discount.fixed) {
      discountCodeAmt = -Math.min(discount.fixed, afterBundleDiscount)
    } else if (discount.percent) {
      discountCodeAmt = -Math.round(afterBundleDiscount * discount.percent / 100)
    }
  }

  const total = Math.max(0, afterBundleDiscount + discountCodeAmt)

  return {
    nights,
    adultsSubtotal,
    infantsSubtotal,
    child46Subtotal,
    child711Subtotal,
    seaviewSupplement,
    subtotalBeforeDiscount,
    bundleDiscount,
    discountCodeAmt,
    total,
  }
}

// ─── Instalment schedule ──────────────────────────────────────────────────────

export interface InstalmentSlot {
  number:  number
  label:   string
  amount:  number   // pence
  dueDate: Date
}

/**
 * Builds the instalment schedule for a booking.
 *
 * Full plan:       single payment of the full total, due immediately.
 * Instalment plan: deposit now, then equal monthly instalments.
 *
 * The deposit is 25% of the total (rounded up to nearest pence).
 * Remaining balance split into 3 equal monthly instalments from booking date.
 * Any rounding remainder is absorbed into the final instalment.
 */
export function buildInstalmentSchedule(
  total:       number,
  plan:        'FULL' | 'INSTALMENT',
  bookedAt:    Date = new Date(),
): InstalmentSlot[] {
  if (plan === 'FULL') {
    return [{
      number:  1,
      label:   'Full payment',
      amount:  total,
      dueDate: bookedAt,
    }]
  }

  // Deposit: 25% rounded up
  const deposit   = Math.ceil(total * 0.25)
  const remaining = total - deposit

  // 3 equal monthly instalments — last absorbs rounding
  const instalment  = Math.floor(remaining / 3)
  const lastInstalment = remaining - instalment * 2

  const addMonths = (date: Date, months: number): Date => {
    const d = new Date(date)
    d.setMonth(d.getMonth() + months)
    return d
  }

  return [
    {
      number:  1,
      label:   'Deposit (25%)',
      amount:  deposit,
      dueDate: bookedAt,
    },
    {
      number:  2,
      label:   'Instalment 2 of 4',
      amount:  instalment,
      dueDate: addMonths(bookedAt, 1),
    },
    {
      number:  3,
      label:   'Instalment 3 of 4',
      amount:  instalment,
      dueDate: addMonths(bookedAt, 2),
    },
    {
      number:  4,
      label:   'Final instalment',
      amount:  lastInstalment,
      dueDate: addMonths(bookedAt, 3),
    },
  ]
}

// ─── Bed / cot derivation ────────────────────────────────────────────────────

/**
 * Derives whether an extra bed and/or cot are needed from the party composition.
 * These are stored on the booking record for the hotel export — not user-facing.
 */
export function deriveRoomExtras(party: BookingParty): { needsBed: boolean; needsCot: boolean } {
  return {
    needsBed: party.child711 > 0,
    needsCot: party.infants  > 0,
  }
}

// ─── Display helpers ─────────────────────────────────────────────────────────

/**
 * Formats a pence amount as a GBP string, e.g. 12875 → "£128.75"
 */
export function formatGBP(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style:    'currency',
    currency: 'GBP',
  }).format(pence / 100)
}

/**
 * Returns a human-readable label for the age band, e.g. "Child (7–11)"
 */
export function ageBandLabel(role: string): string {
  switch (role) {
    case 'Lead':     return 'Lead adult'
    case 'Adult':    return 'Adult'
    case 'Infant':   return 'Infant (0–3)'
    case 'Child46':  return 'Child (4–6)'
    case 'Child711': return 'Child (7–11)'
    default:         return role
  }
}
