'use client'

import Link from 'next/link'
import type { MyBooking } from '@/app/actions/get-my-bookings'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function partyLine(b: MyBooking) {
  return [
    `${b.adults} adult${b.adults !== 1 ? 's' : ''}`,
    b.infants  ? `${b.infants} infant${b.infants  > 1 ? 's' : ''}`           : null,
    b.child46  ? `${b.child46} child${b.child46  > 1 ? 'ren' : ''} (4–6)`    : null,
    b.child711 ? `${b.child711} child${b.child711 > 1 ? 'ren' : ''} (7–11)`  : null,
  ].filter(Boolean).join(', ')
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

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({ label, value, soft }: { label: string; value: string; soft: string }) {
  return (
    <div style={{
      background: `var(--${soft})`,
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 18px',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--muted)',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 700,
        color: 'var(--ink)', fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
    </div>
  )
}

// ── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({ b }: { b: MyBooking }) {
  const extraNights  = b.extraNightsBefore + b.extraNightsAfter
  const isInstalment = b.plan === 'INSTALMENT'
  const pct          = b.totalAmount > 0
    ? Math.min(100, Math.round((b.paidAmount / b.totalAmount) * 100))
    : 0

  return (
    <div className="card" style={{ overflow: 'hidden' }}>

      {/* ── Card header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8,
        padding: '12px 18px',
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{
            fontSize: 14, fontWeight: 700,
            letterSpacing: '0.1em', color: 'var(--ink)',
          }}>
            {b.ref}
          </span>
          <StatusPill status={b.status} />
          {b.plan === 'INSTALMENT' && (
            <span className="pill pill-muted" style={{ fontSize: 10 }}>Instalments</span>
          )}
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>
          Booked {fmtDate(b.createdAt)}
        </span>
      </div>

      {/* ── Card body ── */}
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Room + party row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 'var(--radius)',
            background: 'var(--gold-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>
            🏨
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
              {b.roomName}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {partyLine(b)}
              {extraNights > 0 && (
                <span style={{ marginLeft: 6, color: 'var(--gold-deep)', fontWeight: 600 }}>
                  +{extraNights} extra night{extraNights > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Payment progress */}
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginBottom: 6, fontSize: 12,
          }}>
            <span style={{ color: 'var(--muted)' }}>Paid</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              <strong style={{ color: 'var(--ink)' }}>{fmt(b.paidAmount)}</strong>
              <span style={{ color: 'var(--muted-2)' }}> of {fmt(b.totalAmount)}</span>
            </span>
          </div>
          <div className="progress">
            <div
              className="progress-fill"
              style={{
                width: `${pct}%`,
                // Override gradient to green when fully paid
                ...(pct === 100 ? { background: 'var(--success)' } : {}),
              }}
            />
          </div>
        </div>

        {/* Plan / next instalment */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 4,
          fontSize: 12.5, color: 'var(--muted)',
        }}>
          <span>{isInstalment ? '4-instalment plan' : 'Full payment'}</span>
          {isInstalment && b.nextInstalment && (
            <span>
              Next:{' '}
              <strong style={{ color: 'var(--ink)' }}>{fmt(b.nextInstalment.amount)}</strong>
              {' '}due{' '}
              <strong style={{ color: 'var(--ink)' }}>{fmtDate(b.nextInstalment.dueDate)}</strong>
            </span>
          )}
          {isInstalment && !b.nextInstalment && b.status === 'FULLY_PAID' && (
            <span style={{ color: 'var(--success)', fontWeight: 500 }}>✓ All payments complete</span>
          )}
        </div>

        {/* Discount banner */}
        {b.discountCode && b.discountAmt > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 10px', borderRadius: 'var(--radius-sm)',
            background: 'var(--success-soft)',
            fontSize: 12.5, color: 'var(--success)',
          }}>
            <span>🎟 Code <strong>{b.discountCode}</strong> applied</span>
            <span style={{ fontWeight: 600 }}>−{fmt(b.discountAmt)}</span>
          </div>
        )}

        {/* Action */}
        <div>
          <Link href={`/booking/${b.ref}`} className="btn btn-primary btn-sm">
            View booking
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </Link>
        </div>

      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="card card-pad" style={{ textAlign: 'center', padding: '56px 24px' }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>🌙</div>
      <h2 style={{
        margin: '0 0 8px', fontSize: 17, fontWeight: 600, color: 'var(--ink)',
      }}>
        No bookings yet
      </h2>
      <p style={{
        margin: '0 0 24px', fontSize: 13.5, color: 'var(--muted)',
        maxWidth: 300, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6,
      }}>
        Reserve your place on the Light Upon Light Turkey Retreat 2027.
      </p>
      <Link href="/book" className="btn btn-primary">
        Book now
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14M13 6l6 6-6 6"/>
        </svg>
      </Link>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

interface Props {
  bookings: MyBooking[]
  userName: string
}

export function DashboardView({ bookings, userName }: Props) {
  const totalPaid        = bookings.reduce((s, b) => s + b.paidAmount, 0)
  const totalOutstanding = bookings.reduce((s, b) => s + Math.max(0, b.totalAmount - b.paidAmount), 0)
  const totalValue       = bookings.reduce((s, b) => s + b.totalAmount, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Header — matches the booking flow header exactly ── */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '10px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/lul-logo.png"
                alt="Light Upon Light"
                style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'contain' }}
              />
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--gold-deep)',
                }}>
                  Light Upon Light
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.2 }}>
                  Turkey Retreat 2027
                </div>
              </div>
            </Link>

            <Link href="/book" className="btn btn-primary btn-sm">
              + New booking
            </Link>

          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main style={{ maxWidth: 920, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 4,
          }}>
            My account
          </div>
          <h1 style={{
            margin: '0 0 4px', fontSize: 22, fontWeight: 700,
            letterSpacing: '-0.02em', color: 'var(--ink)',
          }}>
            {userName ? `Welcome back, ${userName.split(' ')[0]}` : 'My bookings'}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
            {bookings.length > 0
              ? `You have ${bookings.length} booking${bookings.length > 1 ? 's' : ''}`
              : 'Your bookings will appear here once you reserve your place.'}
          </p>
        </div>

        {/* Stats strip — only when bookings exist */}
        {bookings.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12, marginBottom: 28,
          }}>
            <StatTile label="Total paid"    value={fmt(totalPaid)}        soft="success-soft" />
            <StatTile label="Outstanding"   value={fmt(totalOutstanding)} soft="warning-soft" />
            <StatTile label="Booking value" value={fmt(totalValue)}       soft="surface-2"    />
          </div>
        )}

        {/* Bookings list */}
        {bookings.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {bookings.map(b => <BookingCard key={b.id} b={b} />)}
          </div>
        )}

      </main>
    </div>
  )
}
