'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { calcPrice } from '@/app/actions/booking-data'
import { formatGBP } from '@/lib/pricing'
import { useBookingFlow } from '@/lib/booking-flow'
import type { RoomTypeData } from '@/app/actions/booking-data'
import type { PriceBreakdown } from '@/lib/pricing'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  rooms: RoomTypeData[]
}

// ─── Counter sub-component ────────────────────────────────────────────────────

function Counter({
  label, sub, value, onChange, min = 0, max,
}: {
  label: string
  sub?: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '11px 0', borderBottom: '1px solid var(--line)',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="btn btn-icon"
          style={{ fontSize: 16, lineHeight: 1 }}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span style={{
          width: 20, textAlign: 'center',
          fontWeight: 600, fontSize: 15,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
          disabled={max !== undefined && value >= max}
          className="btn btn-icon"
          style={{ fontSize: 16, lineHeight: 1 }}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

// ─── Room type card ───────────────────────────────────────────────────────────

function RoomCard({
  room, selected, onSelect,
}: {
  room:     RoomTypeData
  selected: boolean
  onSelect: () => void
}) {
  const soldOut = room.available <= 0
  const lowStock = room.available > 0 && room.available <= 5

  const categoryColour: Record<string, string> = {
    SUPERIOR: 'var(--info)',
    FAMILY:   'var(--success)',
    SUITE:    'var(--gold-deep)',
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={soldOut}
      style={{
        all: 'unset',
        display: 'block',
        width: '100%',
        cursor: soldOut ? 'not-allowed' : 'pointer',
        borderRadius: 'var(--radius-lg)',
        border: selected
          ? '2px solid var(--gold-deep)'
          : '1.5px solid var(--line)',
        background: selected ? 'oklch(0.98 0.015 85)' : 'var(--surface)',
        padding: '14px 16px',
        transition: 'border-color 150ms, background 150ms, box-shadow 150ms',
        boxShadow: selected ? '0 0 0 3px rgba(168,138,71,0.12)' : 'none',
        opacity: soldOut ? 0.5 : 1,
        textAlign: 'left',
        position: 'relative',
      }}
      aria-pressed={selected}
    >
      {/* Selected checkmark */}
      {selected && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 20, height: 20, borderRadius: '50%',
          background: 'var(--gold-deep)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 11, fontWeight: 700,
        }}>
          ✓
        </div>
      )}

      {/* Badges row */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
        <span className="pill" style={{
          color: categoryColour[room.category],
          borderColor: 'transparent',
          background: 'var(--surface-2)',
          fontSize: 10,
        }}>
          {room.category}
        </span>
        {room.isSeaview && (
          <span className="pill pill-info" style={{ fontSize: 10 }}>Sea view</span>
        )}
        {room.isBundle && (
          <span className="pill pill-warning" style={{ fontSize: 10 }}>Bundle</span>
        )}
        {soldOut && (
          <span className="pill pill-danger" style={{ fontSize: 10 }}>Sold out</span>
        )}
        {lowStock && !soldOut && (
          <span className="pill pill-warning" style={{ fontSize: 10 }}>
            {room.available} left
          </span>
        )}
      </div>

      {/* Room name */}
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
        {room.displayName}
      </div>

      {/* Description */}
      {room.description && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.45 }}>
          {room.description}
        </div>
      )}

      {/* Capacity row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <CapIcon icon="👤" label={`Up to ${room.maxAdults} adult${room.maxAdults > 1 ? 's' : ''}`} />
        <CapIcon icon="👨‍👩‍👧‍👦" label={`${room.maxTotalPeople} people max`} />
        {room.addCotAllowed && <CapIcon icon="🛏" label="Cot available" />}
        {room.addBedAllowed && <CapIcon icon="➕" label="Extra bed" />}
      </div>
    </button>
  )
}

function CapIcon({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)' }}>
      <span style={{ fontSize: 12 }}>{icon}</span>
      {label}
    </div>
  )
}

// ─── Price breakdown card ─────────────────────────────────────────────────────

function PriceCard({
  breakdown,
  room,
  onContinue,
}: {
  breakdown: PriceBreakdown
  room:      RoomTypeData
  onContinue: () => void
}) {
  const lines: { label: string; amount: number; muted?: boolean }[] = []

  if (breakdown.adultsSubtotal > 0)
    lines.push({ label: `Adults × ${breakdown.nights} nights`, amount: breakdown.adultsSubtotal })
  if (breakdown.infantsSubtotal > 0)
    lines.push({ label: 'Infants (0–3)', amount: breakdown.infantsSubtotal })
  if (breakdown.child46Subtotal > 0)
    lines.push({ label: 'Children (4–6)', amount: breakdown.child46Subtotal })
  if (breakdown.child711Subtotal > 0)
    lines.push({ label: 'Children (7–11)', amount: breakdown.child711Subtotal })
  if (breakdown.seaviewSupplement > 0)
    lines.push({ label: 'Sea view supplement', amount: breakdown.seaviewSupplement })
  if (breakdown.bundleDiscount < 0)
    lines.push({ label: `Bundle discount (${room.isBundle ? 20 : 0}%)`, amount: breakdown.bundleDiscount })

  return (
    <div className="card" style={{ marginTop: 24, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        background: 'linear-gradient(135deg, var(--gold-deep), var(--gold))',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Price breakdown
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {formatGBP(breakdown.total)}
          </div>
        </div>
      </div>

      {/* Line items */}
      <div style={{ padding: '4px 18px' }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 0',
            borderBottom: i < lines.length - 1 ? '1px solid var(--line)' : 'none',
            fontSize: 13,
          }}>
            <span style={{ color: line.amount < 0 ? 'var(--success)' : 'var(--muted)' }}>
              {line.label}
            </span>
            <span style={{
              fontWeight: 500,
              color: line.amount < 0 ? 'var(--success)' : 'var(--ink)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {line.amount < 0 ? `−${formatGBP(Math.abs(line.amount))}` : formatGBP(line.amount)}
            </span>
          </div>
        ))}
      </div>

      {/* Total row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 18px',
        borderTop: '2px solid var(--line)',
        background: 'var(--surface-2)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Total</span>
        <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {formatGBP(breakdown.total)}
        </span>
      </div>

      {/* Note */}
      <div style={{ padding: '0 18px 14px' }}>
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          Prices are for a <strong>{breakdown.nights}-night</strong> stay. You can choose to pay
          in full or split into 4 instalments on the final step.
        </p>
      </div>

      {/* CTA */}
      <div style={{ padding: '0 18px 18px' }}>
        <button
          type="button"
          onClick={onContinue}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', justifyContent: 'center', gap: 8, fontSize: 14 }}
        >
          Continue to occupant details
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RoomPartyStep({ rooms }: Props) {
  const router = useRouter()
  const { draft, setDraft } = useBookingFlow()
  const [isPending, startTransition] = useTransition()

  // Local form state (synced to draft on submit)
  const [selectedId, setSelectedId] = useState<string | null>(draft.roomTypeId)
  const [adults,     setAdults]     = useState(draft.adults)
  const [infants,    setInfants]    = useState(draft.infants)
  const [child46,    setChild46]    = useState(draft.child46)
  const [child711,   setChild711]   = useState(draft.child711)

  const [fieldErrors, setFieldErrors] = useState<{ field: string; message: string }[]>([])
  const [serverError, setServerError] = useState<string | null>(null)
  const [breakdown,   setBreakdown]   = useState<PriceBreakdown | null>(draft.priceBreakdown)

  const selectedRoom = rooms.find(r => r.id === selectedId) ?? null

  // When a room is selected, clear the breakdown so the user re-submits
  function handleSelectRoom(id: string) {
    setSelectedId(id)
    setBreakdown(null)
    setFieldErrors([])
    setServerError(null)
  }

  // Adjust party counts when room changes to respect new max
  function safeSetAdults(v: number) {
    setAdults(v)
    setBreakdown(null)
  }

  function handleSubmit() {
    if (!selectedId) {
      setServerError('Please select a room type first.')
      return
    }

    setFieldErrors([])
    setServerError(null)

    startTransition(async () => {
      const result = await calcPrice(selectedId, { adults, infants, child46, child711 })

      if (!result.ok) {
        setFieldErrors(result.errors)
        return
      }

      setBreakdown(result.breakdown)
      // Persist step 1 to draft
      setDraft({
        roomTypeId: selectedId,
        adults, infants, child46, child711,
        priceBreakdown: result.breakdown,
      })
    })
  }

  function handleContinue() {
    router.push('/book/occupants')
  }

  const maxAdults = selectedRoom?.maxAdults ?? 6

  const errorFor = (field: string) =>
    fieldErrors.find(e => e.field === field)?.message

  return (
    <div>
      {/* Page heading */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold-deep)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          Step 1 of 4
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
          Choose your room
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--muted)' }}>
          Select a room type, then tell us who's coming. We'll calculate your exact price.
        </p>
      </div>

      {/* ── Room grid ── */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', letterSpacing: '-0.01em' }}>
          Available rooms
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 10,
        }}>
          {rooms.map(room => (
            <RoomCard
              key={room.id}
              room={room}
              selected={selectedId === room.id}
              onSelect={() => handleSelectRoom(room.id)}
            />
          ))}
        </div>
        {!selectedId && (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--muted)' }}>
            ↑ Tap a room to select it
          </p>
        )}
      </div>

      {/* ── Party form ── */}
      <div className="card card-pad" style={{ maxWidth: 480 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
          Who's coming?
        </h2>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--muted)' }}>
          Full names and dates of birth are collected on the next step.
        </p>

        <Counter
          label="Adults"
          sub="Age 12+"
          value={adults}
          onChange={safeSetAdults}
          min={1}
          max={maxAdults}
        />
        {errorFor('adults') && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--danger)' }}>{errorFor('adults')}</p>
        )}

        <Counter
          label="Infants"
          sub="Age 0–3"
          value={infants}
          onChange={v => { setInfants(v); setBreakdown(null) }}
        />
        {errorFor('infants') && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--danger)' }}>{errorFor('infants')}</p>
        )}

        <Counter
          label="Children"
          sub="Age 4–6"
          value={child46}
          onChange={v => { setChild46(v); setBreakdown(null) }}
        />
        {errorFor('child46') && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--danger)' }}>{errorFor('child46')}</p>
        )}

        <Counter
          label="Children"
          sub="Age 7–11"
          value={child711}
          onChange={v => { setChild711(v); setBreakdown(null) }}
        />
        {errorFor('child711') && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--danger)' }}>{errorFor('child711')}</p>
        )}

        {errorFor('total') && (
          <div style={{
            margin: '10px 0 0',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--danger-soft)',
            fontSize: 12.5,
            color: 'var(--danger)',
          }}>
            {errorFor('total')}
          </div>
        )}

        {serverError && (
          <div style={{
            margin: '10px 0 0',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--danger-soft)',
            fontSize: 12.5,
            color: 'var(--danger)',
          }}>
            {serverError}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedId || isPending}
          className="btn btn-primary"
          style={{ marginTop: 16, width: '100%', justifyContent: 'center', gap: 8 }}
        >
          {isPending ? (
            <>
              <span className="auth-spin" />
              Calculating…
            </>
          ) : (
            <>
              Show my price
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </>
          )}
        </button>
      </div>

      {/* ── Price breakdown ── */}
      {breakdown && selectedRoom && (
        <PriceCard
          breakdown={breakdown}
          room={selectedRoom}
          onContinue={handleContinue}
        />
      )}
    </div>
  )
}
