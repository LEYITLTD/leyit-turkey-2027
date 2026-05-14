'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { calcAllPrices } from '@/app/actions/booking-data'
import { formatGBP } from '@/lib/pricing'
import { useBookingFlow } from '@/lib/booking-flow'
import type { RoomTypeData } from '@/app/actions/booking-data'
import type { PriceBreakdown } from '@/lib/pricing'

interface Props { rooms: RoomTypeData[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterRooms(
  rooms: RoomTypeData[],
  adults: number, infants: number, child46: number, child711: number,
) {
  const total = adults + infants + child46 + child711
  return rooms.filter(r =>
    r.available > 0 &&
    r.maxAdults >= adults &&
    r.maxTotalPeople >= total &&
    (infants  === 0 || r.addCotAllowed) &&
    (child711 === 0 || r.addBedAllowed) &&
    (infants  === 0 || child711 === 0 || r.bothAllowed)
  )
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
          style={{ fontSize: 17, lineHeight: 1 }}>−</button>
        <span style={{ width: 22, textAlign: 'center', fontWeight: 600, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </span>
        <button type="button" onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
          disabled={max !== undefined && value >= max} className="btn btn-icon"
          style={{ fontSize: 17, lineHeight: 1 }}>+</button>
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

function RoomCard({ room, selected, price, onSelect }: {
  room: RoomTypeData; selected: boolean
  price: PriceBreakdown | null
  onSelect: () => void
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
      {/* Selected tick */}
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
        {room.isSeaview && <span className="pill pill-info"    style={{ fontSize: 10 }}>Sea view</span>}
        {room.isBundle  && <span className="pill pill-warning" style={{ fontSize: 10 }}>Bundle</span>}
        {low            && <span className="pill pill-warning" style={{ fontSize: 10 }}>{room.available} left</span>}
      </div>

      {/* Name */}
      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>{room.displayName}</div>

      {/* Capacity */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
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

      {/* Price ready indicator — subtle, no number shown until selected */}
      {!selected && price && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8, marginTop: 2 }}>
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Tap to see price</span>
        </div>
      )}
      {!selected && !price && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>Loading…</span>
        </div>
      )}
    </button>
  )
}

// ─── Extra nights + price panel (shown after room selected) ───────────────────

function ExtraNightsAndPrice({
  breakdown, nightsBefore, nightsAfter,
  onNightsBefore, onNightsAfter, onContinue,
}: {
  breakdown:      PriceBreakdown
  nightsBefore:   number
  nightsAfter:    number
  onNightsBefore: (v: number) => void
  onNightsAfter:  (v: number) => void
  onContinue:     () => void
}) {
  const totalExtraNights = nightsBefore + nightsAfter
  const extraCost        = totalExtraNights * breakdown.ratePerExtraNight
  const grandTotal       = breakdown.total + extraCost

  return (
    <div className="card" style={{ marginTop: 20, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', overflow: 'hidden' }}>

      {/* Extra nights section */}
      <div style={{ padding: '14px 18px 4px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Extra nights (optional)</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>
          Arrive early or stay late — add extra nights at {formatGBP(breakdown.ratePerExtraNight)}/night.
        </div>

        <Counter
          label="Nights before"
          sub="Arrive before the retreat starts"
          value={nightsBefore}
          onChange={onNightsBefore}
          min={0} max={3}
        />
        <Counter
          label="Nights after"
          sub="Stay on after the retreat ends"
          value={nightsAfter}
          onChange={onNightsAfter}
          min={0} max={3}
        />
      </div>

      {/* Price breakdown */}
      <div style={{ padding: '4px 18px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '9px 0', borderBottom: '1px solid var(--line)',
          fontSize: 13,
        }}>
          <span style={{ color: 'var(--muted)' }}>Retreat ({breakdown.nights} nights)</span>
          <span style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{formatGBP(breakdown.total)}</span>
        </div>

        {totalExtraNights > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '9px 0', borderBottom: '1px solid var(--line)',
            fontSize: 13,
          }}>
            <span style={{ color: 'var(--muted)' }}>
              Extra nights ({totalExtraNights} × {formatGBP(breakdown.ratePerExtraNight)})
            </span>
            <span style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>
              +{formatGBP(extraCost)}
            </span>
          </div>
        )}
      </div>

      {/* Total */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 18px', borderTop: '2px solid var(--line)', background: 'var(--surface-2)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Total</span>
        <span style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--gold-deep)' }}>
          {formatGBP(grandTotal)}
        </span>
      </div>

      {/* Note */}
      <div style={{ padding: '10px 18px 4px' }}>
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          Pay in full or split into 4 instalments — your choice on the final step.
        </p>
      </div>

      {/* CTA */}
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
  const [adults,     setAdults]    = useState(draft.adults)
  const [infants,    setInfants]   = useState(draft.infants)
  const [child46,    setChild46]   = useState(draft.child46)
  const [child711,   setChild711]  = useState(draft.child711)
  const [partyError, setPartyError]= useState<string | null>(null)

  // Phase 2 — rooms (pre-priced)
  const [partyLocked, setPartyLocked] = useState(!!draft.roomTypeId)
  const [filtered,    setFiltered]    = useState<RoomTypeData[]>(
    draft.roomTypeId ? filterRooms(rooms, draft.adults, draft.infants, draft.child46, draft.child711) : []
  )
  const [priceMap, setPriceMap] = useState<Record<string, PriceBreakdown>>(
    draft.roomTypeId && draft.priceBreakdown
      ? { [draft.roomTypeId]: draft.priceBreakdown }
      : {}
  )

  // Phase 3 — selected room + extra nights
  const [selectedId,    setSelectedId]    = useState<string | null>(draft.roomTypeId)
  const [nightsBefore,  setNightsBefore]  = useState(draft.extraNightsBefore)
  const [nightsAfter,   setNightsAfter]   = useState(draft.extraNightsAfter)

  // ── Lock party, filter rooms, pre-calculate ALL prices in one go ──────────
  function handleFindRooms() {
    if (adults < 1) { setPartyError('At least 1 adult is required.'); return }
    setPartyError(null)

    const matches = filterRooms(rooms, adults, infants, child46, child711)
    setFiltered(matches)
    setPartyLocked(true)
    setSelectedId(null)
    setPriceMap({})
    setNightsBefore(0)
    setNightsAfter(0)
    setDraft({ adults, infants, child46, child711, roomTypeId: null, priceBreakdown: null, extraNightsBefore: 0, extraNightsAfter: 0 })

    if (matches.length === 0) return

    startTransition(async () => {
      const prices = await calcAllPrices(matches.map(r => r.id), { adults, infants, child46, child711 })
      setPriceMap(prices)
    })
  }

  function handleEditParty() {
    setPartyLocked(false)
    setSelectedId(null)
    setPriceMap({})
    setFiltered([])
  }

  // ── Select room (instant — price already loaded) ──────────────────────────
  function handleSelectRoom(id: string) {
    setSelectedId(id)
    setNightsBefore(0)
    setNightsAfter(0)
    const bd = priceMap[id] ?? null
    setDraft({ roomTypeId: id, priceBreakdown: bd, extraNightsBefore: 0, extraNightsAfter: 0 })
  }

  function handleNightsBefore(v: number) {
    setNightsBefore(v)
    setDraft({ extraNightsBefore: v })
  }
  function handleNightsAfter(v: number) {
    setNightsAfter(v)
    setDraft({ extraNightsAfter: v })
  }

  function handleContinue() {
    router.push('/book/occupants')
  }

  const selectedBreakdown = selectedId ? (priceMap[selectedId] ?? null) : null

  return (
    <div>
      {/* Heading */}
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

      {/* ── Party card ── */}
      <div className="card card-pad" style={{ maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', marginBottom: 28 }}>
        {partyLocked ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Your group</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {[
                  `${adults} adult${adults !== 1 ? 's' : ''}`,
                  infants  ? `${infants} infant${infants  > 1 ? 's' : ''}`            : null,
                  child46  ? `${child46} child${child46  > 1 ? 'ren' : ''} (4–6)`     : null,
                  child711 ? `${child711} child${child711 > 1 ? 'ren' : ''} (7–11)`   : null,
                ].filter(Boolean).join(', ')}
              </div>
            </div>
            <button type="button" onClick={handleEditParty} className="btn btn-sm">Edit</button>
          </div>
        ) : (
          <>
            <h2 style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 600 }}>Group size</h2>
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
            <button type="button" onClick={handleFindRooms} className="btn btn-primary"
              style={{ marginTop: 16, width: '100%', justifyContent: 'center', gap: 8 }}>
              Find available rooms
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ── Room grid ── */}
      {partyLocked && (
        <div style={{ maxWidth: 860, marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>
            {filtered.length > 0
              ? `${filtered.length} room${filtered.length !== 1 ? 's' : ''} available for your group`
              : 'No rooms available for this group size'}
          </h2>

          {filtered.length === 0 ? (
            <div className="card card-pad" style={{ fontSize: 13, color: 'var(--muted)' }}>
              No rooms can accommodate this group. Try adjusting your numbers or{' '}
              <a href="mailto:bookings@lightuponlight.com" style={{ color: 'var(--gold-deep)' }}>contact us</a>.
            </div>
          ) : (
            <>
              {isPending && Object.keys(priceMap).length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--muted)', fontSize: 12.5 }}>
                  <span className="auth-spin" style={{ borderTopColor: 'var(--gold-deep)', borderColor: 'var(--line-2)' }} />
                  Loading prices…
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', columnGap: '24px', rowGap: '24px' }}>
                {filtered.map(room => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    selected={selectedId === room.id}
                    price={priceMap[room.id] ?? null}
                    onSelect={() => handleSelectRoom(room.id)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Extra nights + price card */}
          {selectedBreakdown && (
            <ExtraNightsAndPrice
              breakdown={selectedBreakdown}
              nightsBefore={nightsBefore}
              nightsAfter={nightsAfter}
              onNightsBefore={handleNightsBefore}
              onNightsAfter={handleNightsAfter}
              onContinue={handleContinue}
            />
          )}
        </div>
      )}
    </div>
  )
}
