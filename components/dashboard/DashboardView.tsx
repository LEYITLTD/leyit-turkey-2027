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

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  DEPOSIT_ONLY:   { label: 'Deposit paid',    color: '#92400e', bg: '#fef3c7', dot: '#f59e0b' },
  PARTIALLY_PAID: { label: 'Partially paid',  color: '#1e40af', bg: '#dbeafe', dot: '#3b82f6' },
  FULLY_PAID:     { label: 'Fully paid',      color: '#065f46', bg: '#d1fae5', dot: '#10b981' },
  CANCELLED:      { label: 'Cancelled',       color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99,
      fontSize: 12, fontWeight: 500,
      color: s.color, background: s.bg,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function PaymentProgress({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
        <span style={{ color: '#6b7280' }}>Paid</span>
        <span style={{ fontWeight: 600, color: '#1a2744' }}>{fmt(paid)} <span style={{ fontWeight: 400, color: '#9ca3af' }}>of {fmt(total)}</span></span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: '#f3f4f6', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99,
          width: `${pct}%`,
          background: pct === 100 ? '#10b981' : 'var(--color-gold, #c9a961)',
          transition: 'width 400ms',
        }} />
      </div>
    </div>
  )
}

// ── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({ b }: { b: MyBooking }) {
  const extraNights = b.extraNightsBefore + b.extraNightsAfter
  const isInstalment = b.plan === 'INSTALMENT'

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        background: '#f9f7f0',
        borderBottom: '1px solid #eceae2',
        gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, letterSpacing: '0.08em', color: '#1a2744' }}>
            {b.ref}
          </span>
          <StatusBadge status={b.status} />
        </div>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>Booked {fmtDate(b.createdAt)}</span>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Room + party */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'oklch(0.96 0.025 85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17,
          }}>🏨</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2744', marginBottom: 2 }}>
              {b.roomName}
            </div>
            <div style={{ fontSize: 12.5, color: '#6b7280' }}>
              {partyLine(b)}
              {extraNights > 0 && (
                <span style={{ marginLeft: 6, color: '#c9a961', fontWeight: 500 }}>
                  +{extraNights} extra night{extraNights > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Payment progress */}
        <PaymentProgress paid={b.paidAmount} total={b.totalAmount} />

        {/* Plan + next instalment */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#6b7280', flexWrap: 'wrap', gap: 6 }}>
          <span>{b.plan === 'FULL' ? 'Full payment' : 'Instalment plan (4 payments)'}</span>
          {isInstalment && b.nextInstalment && (
            <span>
              Next: <strong style={{ color: '#1a2744' }}>{fmt(b.nextInstalment.amount)}</strong>
              {' '}due <strong style={{ color: '#1a2744' }}>{fmtDate(b.nextInstalment.dueDate)}</strong>
            </span>
          )}
          {isInstalment && !b.nextInstalment && b.status === 'FULLY_PAID' && (
            <span style={{ color: '#10b981', fontWeight: 500 }}>✓ All payments complete</span>
          )}
        </div>

        {/* Discount */}
        {b.discountCode && b.discountAmt > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 10px', borderRadius: 6,
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            fontSize: 12.5, color: '#065f46',
          }}>
            <span>🎟 Discount code <strong>{b.discountCode}</strong> applied</span>
            <span style={{ fontWeight: 600 }}>−{fmt(b.discountAmt)}</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
          <Link href={`/book/confirmation/${b.ref}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '8px 14px', borderRadius: 7,
            background: 'var(--color-gold, #c9a961)', color: '#fff',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>
            View booking
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
    <div style={{
      textAlign: 'center', padding: '60px 20px',
      background: '#fff', border: '1px solid #e5e7eb',
      borderRadius: 14,
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🌙</div>
      <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: '#1a2744' }}>
        No bookings yet
      </h2>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280', maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
        Reserve your place on the Light Upon Light Turkey Retreat 2027.
      </p>
      <Link href="/book" style={{
        display: 'inline-block',
        background: 'var(--color-gold, #c9a961)', color: '#fff',
        padding: '12px 28px', borderRadius: 8,
        fontWeight: 600, fontSize: 14, textDecoration: 'none',
      }}>
        Book now
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
  return (
    <div style={{ minHeight: '100vh', background: '#fafaf7' }}>

      {/* Top nav */}
      <div style={{
        borderBottom: '1px solid #eceae2', background: '#fff',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2744', letterSpacing: '-0.01em' }}>
              Light Upon Light
            </span>
            <span style={{ fontSize: 12, color: '#c9a961', fontWeight: 500 }}>Turkey 2027</span>
          </Link>
          <Link href="/book" style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 7,
            background: 'var(--color-gold, #c9a961)', color: '#fff',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>
            + New booking
          </Link>
        </div>
      </div>

      {/* Page content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px 80px' }}>

        {/* Greeting */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1a2744' }}>
            {userName ? `Welcome back, ${userName.split(' ')[0]}` : 'My bookings'}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
            {bookings.length > 0
              ? `You have ${bookings.length} booking${bookings.length > 1 ? 's' : ''}`
              : 'Your bookings will appear here once you reserve your place.'}
          </p>
        </div>

        {/* Summary strip — only if there are bookings */}
        {bookings.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12, marginBottom: 28,
          }}>
            {[
              {
                label: 'Total paid',
                value: fmt(bookings.reduce((s, b) => s + b.paidAmount, 0)),
                color: '#065f46', bg: '#d1fae5',
              },
              {
                label: 'Outstanding',
                value: fmt(bookings.reduce((s, b) => s + Math.max(0, b.totalAmount - b.paidAmount), 0)),
                color: '#92400e', bg: '#fef3c7',
              },
              {
                label: 'Booking value',
                value: fmt(bookings.reduce((s, b) => s + b.totalAmount, 0)),
                color: '#1a2744', bg: '#f9f7f0',
              },
            ].map(stat => (
              <div key={stat.label} style={{
                background: stat.bg, borderRadius: 10, padding: '14px 16px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: stat.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: stat.color, fontVariantNumeric: 'tabular-nums' }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bookings list */}
        {bookings.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {bookings.map(b => <BookingCard key={b.id} b={b} />)}
          </div>
        )}
      </div>
    </div>
  )
}
