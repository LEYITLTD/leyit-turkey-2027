'use client'

/**
 * BookingFlowProvider — shared state across all 4 booking steps.
 *
 * Persisted to sessionStorage so the draft survives a page refresh.
 * Cleared on booking confirmation (reset()) or when the user starts over.
 *
 * Steps:
 *  1. /book            — room type + party composition + price
 *  2. /book/occupants  — name / DOB / gender for every person
 *  3. /book/account    — create account or sign in
 *  4. /book/review     — payment plan, discount code, Stripe checkout
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import type { PriceBreakdown } from './pricing'

// ─── Draft types ──────────────────────────────────────────────────────────────

export interface OccupantDraft {
  name:   string
  dob:    string                                   // YYYY-MM-DD
  gender: 'M' | 'F'
  role:   'Lead' | 'Adult' | 'Infant' | 'Child46' | 'Child711'
}

export interface BookingDraft {
  // Step 1
  roomTypeId:     string | null
  adults:         number
  infants:        number
  child46:        number
  child711:       number
  priceBreakdown: PriceBreakdown | null

  // Step 2
  occupants: OccupantDraft[]

  // Step 3 — identity handled by NextAuth session (no draft state needed)

  // Step 4
  plan:         'FULL' | 'INSTALMENT' | null
  discountCode: string | null
  discountAmt:  number                              // pence
}

const EMPTY_DRAFT: BookingDraft = {
  roomTypeId:     null,
  adults:         2,
  infants:        0,
  child46:        0,
  child711:       0,
  priceBreakdown: null,
  occupants:      [],
  plan:           null,
  discountCode:   null,
  discountAmt:    0,
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface BookingFlowContextValue {
  draft:    BookingDraft
  setDraft: (patch: Partial<BookingDraft>) => void
  reset:    () => void
}

const BookingFlowContext = createContext<BookingFlowContextValue | null>(null)

const STORAGE_KEY = 'lul_booking_draft'

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BookingFlowProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<BookingDraft>(EMPTY_DRAFT)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from sessionStorage once on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) setDraftState(JSON.parse(raw) as BookingDraft)
    } catch {
      // sessionStorage unavailable or corrupt — start fresh
    }
    setHydrated(true)
  }, [])

  // Persist on every draft change (after hydration)
  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    } catch {}
  }, [draft, hydrated])

  const setDraft = (patch: Partial<BookingDraft>) =>
    setDraftState(prev => ({ ...prev, ...patch }))

  const reset = () => {
    setDraftState(EMPTY_DRAFT)
    try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return (
    <BookingFlowContext.Provider value={{ draft, setDraft, reset }}>
      {children}
    </BookingFlowContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBookingFlow() {
  const ctx = useContext(BookingFlowContext)
  if (!ctx) throw new Error('useBookingFlow must be used inside <BookingFlowProvider>')
  return ctx
}
