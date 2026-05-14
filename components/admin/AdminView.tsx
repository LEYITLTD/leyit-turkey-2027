'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AdminData, AdminBooking } from '@/app/actions/get-admin-data'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function age(dobIso: string) {
  const dob = new Date(dobIso)
  const today = new Date()
  let a = today.getFullYear() - dob.getFullYear()
  if (today.getMonth() - dob.getMonth() < 0 ||
     (today.getMonth() - dob.getMonth() === 0 && today.getDate() < dob.getDate())) a--
  return a
}

function partyLine(b: AdminBooking) {
  return [
    `${b.adults} adult${b.adults !== 1 ? 's' : ''}`,
    b.infants  ? `${b.infants} infant${b.infants  > 1 ? 's' : ''}`          : null,
    b.child46  ? `${b.child46} child${b.child46  > 1 ? 'ren' : ''} (4–6)`   : null,
    b.child711 ? `${b.child711} child${b.child711 > 1 ? 'ren' : ''} (7–11)` : null,
  ].filter(Boolean).join(', ')
}

// ── Status pill ───────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  DEPOSIT_ONLY:   { label: 'Deposit paid',   cls: 'pill pill-warning' },
  PARTIALLY_PAID: { label: 'Partially paid', cls: 'pill pill-info'    },
  FULLY_PAID:     { label: 'Fully paid',     cls: 'pill pill-success' },
  CANCELLED:      { label: 'Cancelled',      cls: 'pill pill-muted'   },
}

function StatusPill({ status }: { status: string }) {
  const { label, cls } = STATUS_MAP[status] ?? { label: status, cls: 'pill pill-muted' }
  return <span className={cls}>{label}</span>
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 'var(--radius-lg)', padding: '16px 20px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color ?? 'var(--ink)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--muted-2)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ── Room occupancy bar ────────────────────────────────────────────────────────

function RoomBar({ name, booked, total, isSeaview }: { name: string; booked: number; total: number; isSeaview: boolean }) {
  const pct = total > 0 ? Math.round((booked / total) * 100) : 0
  const full = booked >= total
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12.5 }}>
          <span style={{ color: 'var(--ink)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
            {isSeaview && <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--info)', fontWeight: 600 }}>SEA</span>}
          </span>
          <span style={{ color: full ? 'var(--danger)' : 'var(--muted)', fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>
            {booked}/{total}
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${pct}%`,
            background: full ? 'var(--danger)' : pct >= 75 ? 'var(--warning)' : 'var(--success)',
            transition: 'width 0.3s',
          }} />
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-2)', width: 36, textAlign: 'right' }}>
        {pct}%
      </div>
    </div>
  )
}

// ── Expanded booking row ──────────────────────────────────────────────────────

function BookingExpanded({ b }: { b: AdminBooking }) {
  const extraNights = b.extraNightsBefore + b.extraNightsAfter
  const outstanding = Math.max(0, b.totalAmount - b.paidAmount)

  return (
    <div style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--line)', padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

      {/* Occupants */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 10 }}>
          Who's coming
        </div>
        {b.occupants.map((o, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 13 }}>{o.role === 'Infant' ? '👶' : o.role.startsWith('Child') ? '🧒' : '👤'}</span>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: o.role === 'Lead' ? 600 : 400, color: 'var(--ink)' }}>{o.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {o.role === 'Lead' ? 'Lead · ' : ''}{age(o.dob)} yrs · {o.gender === 'M' ? 'Male' : 'Female'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cost breakdown */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 10 }}>
          Cost breakdown
        </div>
        {(() => {
          const retreatCost = b.totalAmount - b.extraNightsCost + b.discountAmt
          return (
            <div style={{ fontSize: 12.5 }}>
              <BreakdownRow label="Retreat (4 nights)" value={fmt(retreatCost)} />
              {b.extraNightsCost > 0 && (
                <BreakdownRow label={`Extra nights (${extraNights})`} value={`+${fmt(b.extraNightsCost)}`} />
              )}
              {b.discountCode && b.discountAmt > 0 && (
                <BreakdownRow label={`Discount (${b.discountCode})`} value={`−${fmt(b.discountAmt)}`} highlight />
              )}
              <div style={{ borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span style={{ color: 'var(--ink)' }}>Total</span>
                <span style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{fmt(b.totalAmount)}</span>
              </div>
              <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', color: 'var(--success)', fontWeight: 500 }}>
                <span>Paid</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(b.paidAmount)}</span>
              </div>
              {outstanding > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--warning)', fontWeight: 500 }}>
                  <span>Outstanding</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(outstanding)}</span>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Instalment schedule */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 10 }}>
          {b.plan === 'INSTALMENT' ? 'Payment schedule' : 'Payment'}
        </div>
        {b.instalments.length > 0 ? (
          b.instalments.map(ins => {
            const paid = ins.status === 'paid'
            return (
              <div key={ins.number} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12 }}>
                <div>
                  <div style={{ color: 'var(--ink)', fontWeight: paid ? 400 : ins.number === 1 ? 600 : 400 }}>{ins.label}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 11 }}>
                    {paid ? `Paid ${ins.paidAt ? fmtDateShort(ins.paidAt) : ''}` : `Due ${fmtDateShort(ins.dueDate)}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: 'var(--ink)' }}>{fmt(ins.amount)}</div>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 99, fontWeight: 600,
                    background: paid ? 'var(--success-soft)' : 'var(--warning-soft)',
                    color: paid ? 'var(--success)' : 'var(--warning)',
                  }}>
                    {paid ? 'Paid' : ins.status}
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>No schedule</div>
        )}
      </div>

    </div>
  )
}

function BreakdownRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ color: highlight ? 'var(--success)' : 'var(--muted)' }}>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', color: highlight ? 'var(--success)' : 'var(--ink)' }}>{value}</span>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

interface Props { data: AdminData }

export function AdminView({ data }: Props) {
  const { stats, rooms, bookings } = data
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Filter bookings
  const filtered = bookings.filter(b => {
    const matchSearch = !search ||
      b.ref.toLowerCase().includes(search.toLowerCase()) ||
      b.guestName.toLowerCase().includes(search.toLowerCase()) ||
      b.guestEmail.toLowerCase().includes(search.toLowerCase()) ||
      b.roomName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalRooms  = rooms.reduce((s, r) => s + r.total, 0)
  const totalBooked = rooms.reduce((s, r) => s + r.booked, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '10px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/lul-logo.png" alt="Light Upon Light" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-deep)' }}>
                  Light Upon Light
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Admin · Turkey Retreat 2027</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 99, background: 'var(--danger-soft)', color: 'var(--danger)', fontWeight: 700, letterSpacing: '0.06em' }}>
                ADMIN
              </span>
              <Link href="/dashboard" className="btn btn-sm" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none', padding: '5px 10px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)' }}>
                Customer view
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 80px' }}>

        {/* ── Page title ── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Bookings overview
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            30 March 2027 · Bodrum, Turkey
          </p>
        </div>

        {/* ── Stats grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatTile label="Total bookings"  value={String(stats.activeBookings)}  sub={`${stats.totalBookings} incl. cancelled`} />
          <StatTile label="Total revenue"   value={fmt(stats.totalRevenue)}        color="var(--ink)" />
          <StatTile label="Total paid"      value={fmt(stats.totalPaid)}           color="var(--success)" />
          <StatTile label="Outstanding"     value={fmt(stats.totalOutstanding)}    color={stats.totalOutstanding > 0 ? 'var(--warning)' : 'var(--success)'} />
          <StatTile label="Total guests"    value={String(stats.totalGuests)}      sub="across all bookings" />
          <StatTile label="Rooms sold"      value={`${totalBooked}/${totalRooms}`} sub={`${Math.round((totalBooked/Math.max(totalRooms,1))*100)}% occupancy`} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 24 }}>

          {/* ── Payment status breakdown ── */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 14 }}>
              Payment status
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Fully paid',     count: stats.fullyPaid,      cls: 'pill-success' },
                { label: 'Deposit only',   count: stats.depositOnly,    cls: 'pill-warning' },
                { label: 'Partially paid', count: stats.partiallyPaid,  cls: 'pill-info'    },
                { label: 'Cancelled',      count: stats.cancelled,      cls: 'pill-muted'   },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`pill ${s.cls}`}>{s.label}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Room occupancy ── */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 14 }}>
              Room occupancy
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rooms.map(r => (
                <RoomBar key={r.id} name={r.name} booked={r.booked} total={r.total} isSeaview={r.isSeaview} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Bookings table ── */}
        <div className="card" style={{ overflow: 'hidden' }}>

          {/* Table toolbar */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                type="search"
                placeholder="Search ref, guest, room…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '7px 12px', fontSize: 13,
                  border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface)', color: 'var(--ink)', outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['ALL', 'DEPOSIT_ONLY', 'PARTIALLY_PAID', 'FULLY_PAID'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: '5px 10px', fontSize: 11, fontWeight: 600,
                    border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)',
                    background: statusFilter === s ? 'var(--ink)' : 'var(--surface)',
                    color: statusFilter === s ? '#fff' : 'var(--muted)',
                    cursor: 'pointer',
                  }}
                >
                  {s === 'ALL' ? 'All' : s === 'DEPOSIT_ONLY' ? 'Deposit' : s === 'PARTIALLY_PAID' ? 'Partial' : 'Paid'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-2)', marginLeft: 4 }}>
              {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
              No bookings match your filter
            </div>
          ) : (
            <div>
              {/* Header row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 160px 120px 80px 110px 110px 32px',
                gap: 0, padding: '9px 20px',
                background: 'var(--surface-2)', borderBottom: '1px solid var(--line)',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: 'var(--muted)',
              }}>
                <div>Ref</div>
                <div>Guest</div>
                <div>Room</div>
                <div>Status</div>
                <div>Plan</div>
                <div style={{ textAlign: 'right' }}>Total</div>
                <div style={{ textAlign: 'right' }}>Paid</div>
                <div />
              </div>

              {filtered.map((b, i) => {
                const isExpanded = expandedId === b.id
                const isLast     = i === filtered.length - 1
                return (
                  <div key={b.id} style={{ borderBottom: isLast ? 'none' : '1px solid var(--line)' }}>
                    {/* Main row */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : b.id)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '110px 1fr 160px 120px 80px 110px 110px 32px',
                        gap: 0, padding: '12px 20px',
                        alignItems: 'center',
                        cursor: 'pointer',
                        background: isExpanded ? 'oklch(0.985 0.012 85)' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      {/* Ref */}
                      <div className="mono" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink)' }}>
                        {b.ref}
                      </div>

                      {/* Guest */}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{b.guestName}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {b.guestEmail} · {partyLine(b)}
                          {(b.extraNightsBefore + b.extraNightsAfter) > 0 && (
                            <span style={{ color: 'var(--gold-deep)', fontWeight: 600 }}>
                              {' '}+{b.extraNightsBefore + b.extraNightsAfter} extra nights
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--muted-2)', marginTop: 1 }}>
                          Booked {fmtDate(b.createdAt)}
                        </div>
                      </div>

                      {/* Room */}
                      <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>{b.roomName}</div>

                      {/* Status */}
                      <div><StatusPill status={b.status} /></div>

                      {/* Plan */}
                      <div>
                        <span className="pill pill-muted" style={{ fontSize: 10 }}>
                          {b.plan === 'FULL' ? 'Full' : '4 inst.'}
                        </span>
                      </div>

                      {/* Total */}
                      <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(b.totalAmount)}
                      </div>

                      {/* Paid */}
                      <div style={{ textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums',
                        color: b.paidAmount >= b.totalAmount ? 'var(--success)' : 'var(--ink)' }}>
                        {fmt(b.paidAmount)}
                      </div>

                      {/* Chevron */}
                      <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--muted-2)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </div>
                    </div>

                    {/* Expanded panel */}
                    {isExpanded && <BookingExpanded b={b} />}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
