'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { calcPrice } from '@/app/actions/booking-data'
import { formatGBP } from '@/lib/pricing'
import { useBookingFlow } from '@/lib/booking-flow'
import type { RoomTypeData } from '@/app/actions/booking-data'
import type { PriceBreakdown } from '@/lib/pricing'

interface Props { rooms: RoomTypeData[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Filter rooms down to only those that can physically fit the party */
function filterRooms(rooms: RoomTypeData[], adults: number, infants: number, child46: number, child711: number) {
  const total = adults + infants + child46 + child711
  return rooms.filter(r => {
    if (r.available <= 0)                         return false
    if (r.maxAdults < adults)                     return false
    if (r.maxTotalPeople < total)                 return false
    if (infants > 0  && !r.addCotAllowed)         return false
    if (child711 > 0 && !r.addBedAllowed)         return false
    if (infants > 0  && child711 > 0 && !r.bothAllowed) return false
    return true
  })
}

// ─── Counter ──────────────────────────────────────────────────────────────────

function Counter({ label, sub, value, onChange, min = 0, max }: {
  label: string; sub?: string; value: number
  onChange: (v: number) => void; min?: number; max?: number
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '11px 0', borderBottom: '1px solid var(--line)',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min} className="btn btn-icon"
          style={{ fontSize: 17, lineHeight: 1 }} aria-label={`Decrease ${label}`}>−</button>
        <span style={{ width: 22, textAlign: 'center', fontWeight: 600, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </span>
        <button type="button" onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
          disabled={max !== undefined && value >= max} className="btn btn-icon"
          style={{ fontSize: 17, lineHeight: 1 }} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  )
}

// ─── Room card ────────────────────────────────────────────────────────────────

const CAT_COLOUR: Record<string, string> = {
  SUPERIOR: 'var(--info)',
  FAMILY:   'var(--success)',
  SUITE:    'var(--gold-deep)',
}

function RoomCard({ room, selected, onSelect }: {
  room: RoomTypeData; selected: boolean; onSelect: () => void
}) {
  const low = room.available > 0 && room.available <= 5
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} style={{
      all: 'unset', display: 'block', width: '100%', cursor: 'pointer',
      borderRadius: 10,
      border: selected ? '2px solid var(--gold-deep)' : '1.5px solid var(--line)',
      background: selected ? 'oklch(0.985 0.012 85)' : 'var(--surface)',
      padding: '12px 14px',
      boxShadow: selected ? '0 0 0 3px rgba(168,138,71,0.1)' : 'none',
      transition: 'all 140ms', textAlign: 'left', position: 'relative',
    }}>
      {selected && (
        <div style={{
          position: 'absolute', top: 9, right: 9,
          width: 18, height: 18, borderRadius: '50%',
          background: 'var(--gold-deep)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 10, fontWeight: 700,
        }}>✓</div>
      )}

      {/* Badges */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 7 }}>
        <span className="pill" style={{ fontSize: 10, color: CAT_COLOUR[room.category], background: 'var(--surface-2)', borderColor: 'transparent' }}>
          {room.category}
        </span>
        {room.isSeaview && <span className="pill pill-info" style={{ fontSize: 10 }}>Sea view</span>}
        {room.isBundle  && <span className="pill pill-warning" style={{ fontSize: 10 }}>Bundle</span>}
        {low && <span className="pill pill-warning" style={{ fontSize: 10 }}>{room.available} left</span>}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{room.displayName}</div>
      {room.description && (
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 9, lineHeight: 1.45 }}>
          {room.description}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          ['👤', `Up to ${room.maxAdults} adult${room.maxAdults > 1 ? 's' : ''}`],
          ['👨‍👩‍👧', `${room.maxTotalPeople} max`],
          ...(room.addCotAllowed ? [['🛏', 'Cot']] : []),
          ...(room.addBedAllowed ? [['➕', 'Extra bed']] : []),
        ].map(([icon, label], i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--muted)' }}>
            <span>{icon}</span>{label}
          </span>
        ))}
      </div>
    </button>
  )
}

// ─── Price breakdown ──────────────────────────────────────────────────────────

function PriceCard({ breakdown, isBundle, onContinue }: {
  breakdown: PriceBreakdown; isBundle: boolean; onContinue: () => void
}) {
  const lines: { label: string; amount: number }[] = [
    ...(breakdown.adultsSubtotal   > 0 ? [{ label: `Adults × ${breakdown.nights} nights`,  amount: breakdown.adultsSubtotal   }] : []),
    ...(breakdown.infantsSubtotal  > 0 ? [{ label: 'Infants (0–3)',                          amount: breakdown.infantsSubtotal  }] : []),
    ...(breakdown.child46Subtotal  > 0 ? [{ label: 'Children (4–6)',                         amount: breakdown.child46Subtotal  }] : []),
    ...(breakdown.child711Subtotal > 0 ? [{ label: 'Children (7–11)',                        amount: breakdown.child711Subtotal }] : []),
    ...(breakdown.seaviewSupplement > 0 ? [{ label: 'Sea view supplement',                   amount: breakdown.seaviewSupplement }] : []),
    ...(breakdown.bundleDiscount   < 0 ? [{ label: `Bundle discount (20%)`,                  amount: breakdown.bundleDiscount   }] : []),
  ]

  return (
    <div className="card" style={{ marginTop: 20, overflow: 'hidden' }}>
      <div style={{
        padding: '14px 18px',
        background: 'linear-gradient(135deg, var(--gold-deep), var(--gold))',
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2 }}>
          Price breakdown
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>
          {formatGBP(breakdown.total)}
        </div>
      </div>

      <div style={{ padding: '2px 18px' }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '9px 0',
            borderBottom: i < lines.length - 1 ? '1px solid var(--line)' : 'none',
            fontSize: 13,
          }}>
            <span style={{ color: line.amount < 0 ? 'var(--success)' : 'var(--muted)' }}>{line.label}</span>
            <span style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: line.amount < 0 ? 'var(--success)' : 'var(--ink)' }}>
              {line.amount < 0 ? `−${formatGBP(Math.abs(line.amount))}` : formatGBP(line.amount)}
            </span>
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '11px 18px', borderTop: '2px solid var(--line)', background: 'var(--surface-2)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Total</span>
        <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatGBP(breakdown.total)}</span>
      </div>

      <div style={{ padding: '10px 18px 6px' }}>
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          {breakdown.nights}-night stay. Pay in full or split into 4 instalments — your choice on the final step.
        </p>
      </div>

      <div style={{ padding: '10px 18px 18px' }}>
        <button type="button" onClick={onContinue}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
          Continue to occupant details
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function RoomPartyStep({ rooms }: Props) {
  const router = useRouter()
  const { draft, setDraft } = useBookingFlow()
  const [isPending, startTransition] = useTransition()

  // Phase 1 — party
  const [adults,  setAdults]  = useState(draft.adults)
  const [infants, setInfants] = useState(draft.infants)
  const [child46, setChild46] = useState(draft.child46)
  const [child711,setChild711]= useState(draft.child711)
  const [partyError, setPartyError] = useState<string | null>(null)

  // Phase 2 — room + price
  const [partyLocked, setPartyLocked] = useState(!!draft.roomTypeId)
  const [filtered,    setFiltered]    = useState<RoomTypeData[]>(
    draft.roomTypeId ? filterRooms(rooms, draft.adults, draft.infants, draft.child46, draft.child711) : []
  )
  const [selectedId,  setSelectedId]  = useState<string | null>(draft.roomTypeId)
  const [breakdown,   setBreakdown]   = useState<PriceBreakdown | null>(draft.priceBreakdown)
  const [calcError,   setCalcError]   = useState<string | null>(null)

  // ── Step A: lock party + show matching rooms ──────────────────────────────
  function handleFindRooms() {
    if (adults < 1) { setPartyError('At least 1 adult is required.'); return }
    setPartyError(null)

    const matches = filterRooms(rooms, adults, infants, child46, child711)
    setFiltered(matches)
    setPartyLocked(true)
    setSelectedId(null)
    setBreakdown(null)
    setCalcError(null)
    setDraft({ adults, infants, child46, child711, roomTypeId: null, priceBreakdown: null })
  }

  function handleEditParty() {
    setPartyLocked(false)
    setSelectedId(null)
    setBreakdown(null)
    setCalcError(null)
    setFiltered([])
  }

  // ── Step B: select room → auto-calculate price ────────────────────────────
  function handleSelectRoom(id: string) {
    setSelectedId(id)
    setBreakdown(null)
    setCalcError(null)

    startTransition(async () => {
      const result = await calcPrice(id, { adults, infants, child46, child711 })
      if (!result.ok) {
        setCalcError(result.errors.map(e => e.message).join(' '))
        return
      }
      setBreakdown(result.breakdown)
      setDraft({ roomTypeId: id, adults, infants, child46, child711, priceBreakdown: result.breakdown })
    })
  }

  function handleContinue() {
    router.push('/book/occupants')
  }

  const selectedRoom = rooms.find(r => r.id === selectedId) ?? null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page heading */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold-deep)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          Step 1 of 4
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Who&apos;s coming?
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--muted)' }}>
          Tell us your group size first — we&apos;ll show only the rooms that fit.
        </p>
      </div>

      {/* ── Phase 1: Party form ── */}
      <div className="card card-pad" style={{ maxWidth: 460, marginBottom: 28, marginLeft: 'auto', marginRight: 'auto' }}>

        {partyLocked ? (
          /* Locked summary */
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Your group</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {[
                  `${adults} adult${adults !== 1 ? 's' : ''}`,
                  infants  ? `${infants} infant${infants > 1 ? 's' : ''}`           : null,
                  child46  ? `${child46} child${child46 > 1 ? 'ren' : ''} (4–6)`    : null,
                  child711 ? `${child711} child${child711 > 1 ? 'ren' : ''} (7–11)` : null,
                ].filter(Boolean).join(', ')}
              </div>
            </div>
            <button type="button" onClick={handleEditParty} className="btn btn-sm">
              Edit
            </button>
          </div>
        ) : (
          /* Editable counters */
          <>
            <h2 style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
              Group size
            </h2>
            <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--muted)' }}>
              Full names and dates of birth are collected on the next step.
            </p>

            <Counter label="Adults"   sub="Age 12+"  value={adults}  onChange={setAdults}  min={1} />
            <Counter label="Infants"  sub="Age 0–3"  value={infants} onChange={setInfants} />
            <Counter label="Children" sub="Age 4–6"  value={child46} onChange={setChild46} />
            <Counter label="Children" sub="Age 7–11" value={child711}onChange={setChild711}/>

            {partyError && (
              <div style={{ margin: '10px 0 0', padding: '9px 12px', borderRadius: 6, background: 'var(--danger-soft)', fontSize: 12.5, color: 'var(--danger)' }}>
                {partyError}
              </div>
            )}

            <button type="button" onClick={handleFindRooms}
              className="btn btn-primary"
              style={{ marginTop: 16, width: '100%', justifyContent: 'center', gap: 8 }}>
              Find available rooms
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ── Phase 2: Room grid (only shown after party locked) ── */}
      {partyLocked && (
        <div style={{ maxWidth: 860, marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {filtered.length > 0
              ? `${filtered.length} room${filtered.length !== 1 ? 's' : ''} available for your group`
              : 'No rooms available for this group size'}
          </h2>

          {filtered.length === 0 ? (
            <div className="card card-pad" style={{ color: 'var(--muted)', fontSize: 13 }}>
              Unfortunately no rooms can accommodate this group. Try adjusting your numbers or{' '}
              <a href="mailto:bookings@lightuponlight.com" style={{ color: 'var(--gold-deep)' }}>contact us</a> directly.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 24,
              marginBottom: 4,
            }}>
              {filtered.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  selected={selectedId === room.id}
                  onSelect={() => handleSelectRoom(room.id)}
                />
              ))}
            </div>
          )}

          {/* Calculating spinner */}
          {isPending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: 'var(--muted)', fontSize: 13 }}>
              <span className="auth-spin" style={{ borderTopColor: 'var(--gold-deep)', borderColor: 'var(--line-2)' }} />
              Calculating your price…
            </div>
          )}

          {calcError && (
            <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 6, background: 'var(--danger-soft)', fontSize: 12.5, color: 'var(--danger)' }}>
              {calcError}
            </div>
          )}

          {/* Price breakdown */}
          {breakdown && selectedRoom && !isPending && (
            <PriceCard
              breakdown={breakdown}
              isBundle={selectedRoom.isBundle}
              onContinue={handleContinue}
            />
          )}
        </div>
      )}
    </div>
  )
}
