'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { BookingDetail } from '@/app/actions/get-booking-detail'
import { createPayoffIntent } from '@/app/actions/create-payoff-intent'
import { PaymentForm } from '@/components/booking/PaymentForm'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function age(dobIso: string): number {
  const dob  = new Date(dobIso)
  const today = new Date()
  let a = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--
  return a
}

const ROLE_LABEL: Record<string, string> = {
  Lead:     'Lead guest',
  Adult:    'Adult',
  Infant:   'Infant',
  Child46:  'Child (4–6)',
  Child711: 'Child (7–11)',
}

const ROLE_ICON: Record<string, string> = {
  Lead:     '👤',
  Adult:    '👤',
  Infant:   '👶',
  Child46:  '🧒',
  Child711: '🧒',
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    DEPOSIT_ONLY:   { label: 'Deposit paid',   cls: 'pill pill-warning' },
    PARTIALLY_PAID: { label: 'Partially paid', cls: 'pill pill-info'    },
    FULLY_PAID:     { label: 'Fully paid',     cls: 'pill pill-success' },
    CANCELLED:      { label: 'Cancelled',      cls: 'pill pill-muted'   },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'pill pill-muted' }
  return <span className={cls}>{label}</span>
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: 'var(--gold-deep)',
      marginBottom: 12,
    }}>
      {children}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

interface Props { booking: BookingDetail }

// Retreat runs 4 nights — hardcoded known dates for Turkey 2027
const RETREAT_START = 'June 2027'   // Update when exact dates confirmed
const RETREAT_NIGHTS = 4

export function BookingDetailView({ booking }: Props) {
  const extraNights  = booking.extraNightsBefore + booking.extraNightsAfter
  const totalNights  = RETREAT_NIGHTS + extraNights
  const isInstalment = booking.plan === 'INSTALMENT'
  const outstanding  = Math.max(0, booking.totalAmount - booking.paidAmount)
  const pct          = booking.totalAmount > 0
    ? Math.min(100, Math.round((booking.paidAmount / booking.totalAmount) * 100))
    : 0

  // ── Early payoff state ───────────────────────────────────────────────────────
  const [payoffSecret,  setPayoffSecret]  = useState<string | null>(null)
  const [payoffAmount,  setPayoffAmount]  = useState(0)
  const [payoffError,   setPayoffError]   = useState<string | null>(null)
  const [isPending,     startTransition]  = useTransition()

  function handlePayoff() {
    setPayoffError(null)
    startTransition(async () => {
      const result = await createPayoffIntent(booking.ref)
      if (result.ok) {
        setPayoffAmount(result.amountPence)
        setPayoffSecret(result.clientSecret)
      } else {
        setPayoffError(result.error)
      }
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '10px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/lul-logo.png" alt="Light Upon Light"
                style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'contain' }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-deep)' }}>
                  Light Upon Light
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.2 }}>
                  Turkey Retreat 2027
                </div>
              </div>
            </Link>
            <Link href="/dashboard" className="btn btn-sm btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              My bookings
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* ── Page title ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 4 }}>
            Booking details
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="mono" style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink)' }}>
              {booking.ref}
            </h1>
            <StatusPill status={booking.status} />
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            Booked {fmtDate(booking.createdAt)}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Retreat summary ── */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: 'var(--gold-soft)', borderBottom: '1px solid var(--line)' }}>
              <SectionHeading>Your retreat</SectionHeading>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
                    {booking.roomName}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    <span className="pill pill-muted">{booking.roomCategory}</span>
                    {booking.isSeaview && <span className="pill pill-info">Sea view</span>}
                    {booking.isBundle  && <span className="pill pill-warning">Bundle</span>}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 2 }}>Retreat period</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{RETREAT_START}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                    {totalNights} night{totalNights !== 1 ? 's' : ''} total
                    {extraNights > 0 && (
                      <span style={{ color: 'var(--gold-deep)', fontWeight: 500 }}>
                        {' '}({RETREAT_NIGHTS} retreat + {extraNights} extra)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Extra nights detail */}
            {extraNights > 0 && (
              <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)', display: 'flex', gap: 20, fontSize: 13, color: 'var(--muted)' }}>
                {booking.extraNightsBefore > 0 && (
                  <span>🌙 {booking.extraNightsBefore} night{booking.extraNightsBefore > 1 ? 's' : ''} arriving early</span>
                )}
                {booking.extraNightsAfter > 0 && (
                  <span>🌙 {booking.extraNightsAfter} night{booking.extraNightsAfter > 1 ? 's' : ''} staying late</span>
                )}
              </div>
            )}
          </div>

          {/* ── Who's coming ── */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
              <SectionHeading>Who's coming</SectionHeading>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {booking.adults} adult{booking.adults !== 1 ? 's' : ''}
                {booking.infants  > 0 && `, ${booking.infants} infant${booking.infants  > 1 ? 's' : ''}`}
                {booking.child46  > 0 && `, ${booking.child46} child${booking.child46  > 1 ? 'ren' : ''} (4–6)`}
                {booking.child711 > 0 && `, ${booking.child711} child${booking.child711 > 1 ? 'ren' : ''} (7–11)`}
              </div>
            </div>
            <div>
              {booking.occupants.map((o, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 20px',
                  borderBottom: i < booking.occupants.length - 1 ? '1px solid var(--line)' : 'none',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: o.role === 'Lead' ? 'var(--gold-soft)' : 'var(--surface-2)',
                    border: o.role === 'Lead' ? '2px solid var(--gold-deep)' : '1.5px solid var(--line-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                  }}>
                    {ROLE_ICON[o.role] ?? '👤'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{o.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                      {ROLE_LABEL[o.role] ?? o.role} · Age {age(o.dob)} · {o.gender === 'M' ? 'Male' : 'Female'}
                    </div>
                  </div>
                  {o.role === 'Lead' && (
                    <span className="pill pill-warning" style={{ fontSize: 10 }}>Lead</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Payment summary ── */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
              <SectionHeading>Payment</SectionHeading>
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Progress bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>Paid</span>
                  <span>
                    <strong style={{ color: 'var(--ink)' }}>{fmt(booking.paidAmount)}</strong>
                    <span style={{ color: 'var(--muted-2)' }}> of {fmt(booking.totalAmount)}</span>
                  </span>
                </div>
                <div className="progress">
                  <div className="progress-fill" style={{
                    width: `${pct}%`,
                    ...(pct === 100 ? { background: 'var(--success)' } : {}),
                  }} />
                </div>
              </div>

              {/* Cost breakdown */}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                {/* retreatCost = totalAmount − extraNightsCost + discountAmt */}
                {(() => {
                  const retreatCost = booking.totalAmount - booking.extraNightsCost + booking.discountAmt
                  return (
                    <>
                      <Row label={`Retreat (${RETREAT_NIGHTS} nights)`} value={fmt(retreatCost)} />
                      {booking.extraNightsCost > 0 && (
                        <Row
                          label={`Extra nights (${extraNights} night${extraNights > 1 ? 's' : ''})`}
                          value={`+${fmt(booking.extraNightsCost)}`}
                        />
                      )}
                      {booking.discountCode && booking.discountAmt > 0 && (
                        <Row
                          label={`Discount (${booking.discountCode})`}
                          value={`−${fmt(booking.discountAmt)}`}
                          highlight="success"
                        />
                      )}
                    </>
                  )
                })()}

                <div style={{ borderTop: '2px solid var(--line)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
                  <span style={{ color: 'var(--ink)' }}>Total</span>
                  <span style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{fmt(booking.totalAmount)}</span>
                </div>

                {outstanding > 0 && (
                  <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--warning-soft)', fontSize: 12.5, color: 'oklch(0.45 0.12 60)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Outstanding balance</span>
                    <strong>{fmt(outstanding)}</strong>
                  </div>
                )}

              {/* ── Early payoff ── */}
              {outstanding > 0 && isInstalment && !payoffSecret && (
                <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
                    Want to pay off your remaining balance now?
                  </div>
                  <button
                    onClick={handlePayoff}
                    disabled={isPending}
                    className="btn btn-primary"
                    style={{ fontSize: 13, width: '100%', justifyContent: 'center' }}
                  >
                    {isPending ? 'Preparing payment…' : `Pay remaining ${fmt(outstanding)}`}
                  </button>
                  {payoffError && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: 12.5 }}>
                      {payoffError}
                    </div>
                  )}
                </div>
              )}

              {/* ── Payoff payment form ── */}
              {payoffSecret && (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 14 }}>
                    Pay remaining balance — {fmt(payoffAmount)}
                  </div>
                  <PaymentForm
                    clientSecret={payoffSecret}
                    bookingRef={booking.ref}
                    amountLabel={fmt(payoffAmount)}
                    onSuccess={() => window.location.reload()}
                  />
                </div>
              )}
              </div>

              {/* Plan */}
              <div style={{ fontSize: 12.5, color: 'var(--muted)', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                {isInstalment ? '4-instalment plan' : 'Paid in full'}
              </div>
            </div>
          </div>

          {/* ── Instalment schedule ── */}
          {isInstalment && booking.instalments.length > 0 && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                <SectionHeading>Payment schedule</SectionHeading>
              </div>
              <div>
                {booking.instalments.map((ins, i) => {
                  const isPaid = ins.status === 'paid'
                  return (
                    <div key={ins.number} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 20px',
                      borderBottom: i < booking.instalments.length - 1 ? '1px solid var(--line)' : 'none',
                      background: i === 0 ? 'oklch(0.985 0.012 85)' : 'transparent',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: isPaid ? 'var(--success)' : i === 0 ? 'var(--gold-deep)' : 'var(--surface-2)',
                        border: isPaid || i === 0 ? 'none' : '1.5px solid var(--line-2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: isPaid || i === 0 ? '#fff' : 'var(--muted)',
                      }}>
                        {isPaid ? '✓' : ins.number}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: 'var(--ink)' }}>
                          {ins.label}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
                          {isPaid
                            ? `Paid ${ins.paidAt ? fmtDateShort(ins.paidAt) : ''}`
                            : `Due ${fmtDateShort(ins.dueDate)}`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: i === 0 ? 'var(--gold-deep)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(ins.amount)}
                        </div>
                        {isPaid
                          ? <span className="pill pill-success" style={{ fontSize: 10 }}>Paid</span>
                          : ins.status === 'scheduled'
                            ? <span className="pill pill-warning" style={{ fontSize: 10 }}>Scheduled</span>
                            : <span className="pill pill-muted" style={{ fontSize: 10 }}>{ins.status}</span>
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ padding: '10px 20px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)', fontSize: 11.5, color: 'var(--muted-2)' }}>
                Your saved card is charged automatically on each due date. You can also pay off the full remaining balance early above.
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <Link href="/dashboard" className="btn btn-primary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Back to my bookings
            </Link>
          </div>

        </div>
      </main>
    </div>
  )
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function Row({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  const color = highlight === 'success' ? 'var(--success)' : 'var(--muted)'
  const valColor = highlight === 'success' ? 'var(--success)' : 'var(--ink)'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
      <span style={{ color }}>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', color: valColor }}>{value}</span>
    </div>
  )
}
