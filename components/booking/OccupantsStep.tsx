'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBookingFlow } from '@/lib/booking-flow'
import type { OccupantDraft } from '@/lib/booking-flow'

// ─── Slot definition ──────────────────────────────────────────────────────────

interface OccupantSlot {
  index: number
  role:  OccupantDraft['role']
  label: string
  // Suggested year range for the DOB year picker
  yearMin: number
  yearMax: number
}

// Retreat is 2027 — derive age-band year ranges from that
const RETREAT_YEAR = 2027

function buildSlots(adults: number, infants: number, child46: number, child711: number): OccupantSlot[] {
  const slots: OccupantSlot[] = []
  let i = 0

  // Lead adult
  slots.push({ index: i++, role: 'Lead',     label: 'Lead adult',                yearMin: 1930, yearMax: RETREAT_YEAR - 12 })
  // Additional adults
  for (let a = 1; a < adults; a++)
    slots.push({ index: i++, role: 'Adult',   label: `Adult ${a + 1}`,            yearMin: 1930, yearMax: RETREAT_YEAR - 12 })
  // Children 7–11
  for (let c = 0; c < child711; c++)
    slots.push({ index: i++, role: 'Child711',label: child711 > 1 ? `Child (7–11) ${c + 1}` : 'Child (7–11)', yearMin: RETREAT_YEAR - 11, yearMax: RETREAT_YEAR - 7 })
  // Children 4–6
  for (let c = 0; c < child46; c++)
    slots.push({ index: i++, role: 'Child46', label: child46  > 1 ? `Child (4–6) ${c + 1}`  : 'Child (4–6)',  yearMin: RETREAT_YEAR - 6,  yearMax: RETREAT_YEAR - 4 })
  // Infants 0–3
  for (let c = 0; c < infants; c++)
    slots.push({ index: i++, role: 'Infant',  label: infants  > 1 ? `Infant (0–3) ${c + 1}` : 'Infant (0–3)', yearMin: RETREAT_YEAR - 3,  yearMax: RETREAT_YEAR })

  return slots
}

function emptyOccupant(role: OccupantDraft['role']): OccupantDraft {
  return { name: '', dob: '', gender: 'M', role }
}

// ─── DOB picker ───────────────────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function DOBInput({
  value, onChange, yearMin, yearMax, error,
}: {
  value: string                        // YYYY-MM-DD or ''
  onChange: (v: string) => void
  yearMin: number
  yearMax: number
  error?: string
}) {
  const [day,   setDay]   = useState(value ? value.split('-')[2] : '')
  const [month, setMonth] = useState(value ? value.split('-')[1] : '')
  const [year,  setYear]  = useState(value ? value.split('-')[0] : '')

  function emit(d: string, m: string, y: string) {
    if (d && m && y) {
      const padded = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
      onChange(padded)
    } else {
      onChange('')
    }
  }

  const days   = Array.from({ length: 31 }, (_, i) => i + 1)
  const years  = Array.from({ length: yearMax - yearMin + 1 }, (_, i) => yearMax - i)

  const sel: React.CSSProperties = {
    flex: 1, padding: '9px 10px', fontSize: 13,
    border: `1px solid ${error ? 'var(--danger)' : 'var(--line-2)'}`,
    borderRadius: 'var(--radius-sm)', background: 'var(--surface)',
    color: 'var(--ink)', fontFamily: 'inherit', outline: 'none',
    appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236B6B66' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
    paddingRight: 28,
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        {/* Day */}
        <select value={day} onChange={e => { setDay(e.target.value); emit(e.target.value, month, year) }} style={sel} aria-label="Day">
          <option value="">Day</option>
          {days.map(d => <option key={d} value={String(d)}>{d}</option>)}
        </select>
        {/* Month */}
        <select value={month} onChange={e => { setMonth(e.target.value); emit(day, e.target.value, year) }} style={{ ...sel, flex: 1.6 }} aria-label="Month">
          <option value="">Month</option>
          {MONTHS.map((m, i) => <option key={i} value={String(i + 1).padStart(2,'0')}>{m}</option>)}
        </select>
        {/* Year */}
        <select value={year} onChange={e => { setYear(e.target.value); emit(day, month, e.target.value) }} style={sel} aria-label="Year">
          <option value="">Year</option>
          {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </div>
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}

// ─── Gender toggle ────────────────────────────────────────────────────────────

function GenderToggle({ value, onChange }: { value: 'M' | 'F'; onChange: (v: 'M' | 'F') => void }) {
  const btn = (v: 'M' | 'F', label: string) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      style={{
        flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 500,
        border: '1px solid var(--line-2)', fontFamily: 'inherit',
        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        background: value === v ? 'var(--gold-deep)' : 'var(--surface)',
        color:      value === v ? '#fff'             : 'var(--muted)',
        transition: 'all 120ms',
      }}
    >
      {label}
    </button>
  )
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {btn('M', 'Male')}
      {btn('F', 'Female')}
    </div>
  )
}

// ─── Single occupant card ─────────────────────────────────────────────────────

const ROLE_COLOUR: Record<string, string> = {
  Lead:     'var(--gold-deep)',
  Adult:    'var(--ink-2)',
  Child711: 'var(--info)',
  Child46:  'var(--success)',
  Infant:   'var(--muted)',
}

function OccupantCard({
  slot, data, errors, onChange,
}: {
  slot:     OccupantSlot
  data:     OccupantDraft
  errors:   Record<string, string>
  onChange: (patch: Partial<OccupantDraft>) => void
}) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Card header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--surface-2)',
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: ROLE_COLOUR[slot.role],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0,
        }}>
          {slot.index + 1}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{slot.label}</span>
      </div>

      {/* Fields */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Full name */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 5, letterSpacing: '0.02em' }}>
            Full name
          </label>
          <input
            type="text"
            value={data.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="As it appears on passport"
            className="input"
            style={{ borderColor: errors.name ? 'var(--danger)' : undefined }}
          />
          {errors.name && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--danger)' }}>{errors.name}</p>}
        </div>

        {/* Date of birth */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 5, letterSpacing: '0.02em' }}>
            Date of birth
          </label>
          <DOBInput
            value={data.dob}
            onChange={dob => onChange({ dob })}
            yearMin={slot.yearMin}
            yearMax={slot.yearMax}
            error={errors.dob}
          />
        </div>

        {/* Gender */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 5, letterSpacing: '0.02em' }}>
            Gender
          </label>
          <GenderToggle value={data.gender} onChange={gender => onChange({ gender })} />
        </div>

      </div>
    </div>
  )
}

// ─── Main step ────────────────────────────────────────────────────────────────

export function OccupantsStep() {
  const router = useRouter()
  const { draft, setDraft } = useBookingFlow()

  // Guard — must have completed step 1
  useEffect(() => {
    if (!draft.roomTypeId) router.replace('/book')
  }, [draft.roomTypeId, router])

  const slots = buildSlots(draft.adults, draft.infants, draft.child46, draft.child711)

  // Initialise from saved draft or create fresh empty occupants
  const [occupants, setOccupants] = useState<OccupantDraft[]>(() => {
    if (draft.occupants.length === slots.length) return draft.occupants
    return slots.map(s => {
      const saved = draft.occupants[s.index]
      return saved ?? emptyOccupant(s.role)
    })
  })

  const [fieldErrors, setFieldErrors] = useState<Record<number, Record<string, string>>>({})
  const [submitted,   setSubmitted]   = useState(false)

  function updateOccupant(index: number, patch: Partial<OccupantDraft>) {
    setOccupants(prev => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
    // Clear errors for this field on change
    if (submitted) {
      setFieldErrors(prev => {
        const next = { ...prev }
        const key = Object.keys(patch)[0]
        if (next[index]) { delete next[index][key] }
        return next
      })
    }
  }

  function validate(): boolean {
    const errors: Record<number, Record<string, string>> = {}
    occupants.forEach((occ, i) => {
      const e: Record<string, string> = {}
      if (!occ.name.trim())  e.name = 'Full name is required.'
      if (!occ.dob)          e.dob  = 'Date of birth is required.'
      if (Object.keys(e).length) errors[i] = e
    })
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function handleContinue() {
    setSubmitted(true)
    if (!validate()) {
      // Scroll to first error
      const firstError = document.querySelector('[data-occupant-error]')
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setDraft({ occupants })
    router.push('/book/account')
  }

  if (!draft.roomTypeId) return null  // redirecting

  return (
    <div>
      {/* Heading */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold-deep)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          Step 2 of 4
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Occupant details
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--muted)' }}>
          We need full details for every person. Names must match passports — this goes straight to the hotel.
        </p>
      </div>

      {/* Occupant cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        columnGap: '20px',
        rowGap: '20px',
        marginBottom: 28,
      }}>
        {slots.map((slot, i) => (
          <div key={i} data-occupant-error={fieldErrors[i] ? true : undefined}>
            <OccupantCard
              slot={slot}
              data={occupants[i]}
              errors={fieldErrors[i] ?? {}}
              onChange={patch => updateOccupant(i, patch)}
            />
          </div>
        ))}
      </div>

      {/* Summary + CTA */}
      <div style={{ maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
        {Object.keys(fieldErrors).length > 0 && submitted && (
          <div style={{
            marginBottom: 14, padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--danger-soft)', fontSize: 13, color: 'var(--danger)',
          }}>
            Please fill in all required fields above before continuing.
          </div>
        )}
        <button
          type="button"
          onClick={handleContinue}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', justifyContent: 'center', gap: 8 }}
        >
          Continue to your account
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Your details are stored securely and only shared with the hotel.
        </p>
      </div>
    </div>
  )
}
