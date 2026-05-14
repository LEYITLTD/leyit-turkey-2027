'use client'

import Link from 'next/link'
import type { ConfirmationData } from '@/app/actions/get-booking'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function partyLine(b: ConfirmationData) {
  const parts: string[] = []
  if (b.adults)  parts.push(`${b.adults} adult${b.adults > 1 ? 's' : ''}`)
  if (b.child711) parts.push(`${b.child711} child${b.child711 > 1 ? 'ren' : ''} (7–11)`)
  if (b.child46)  parts.push(`${b.child46} child${b.child46 > 1 ? 'ren' : ''} (4–6)`)
  if (b.infants)  parts.push(`${b.infants} infant${b.infants > 1 ? 's' : ''}`)
  return parts.join(', ')
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { booking: ConfirmationData }

export function ConfirmationView({ booking }: Props) {
  const isPaid   = booking.status === 'FULLY_PAID'
  const isDeposit = booking.status === 'DEPOSIT_ONLY'
  const deposit  = booking.instalments[0]

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 16px 80px' }}>

      {/* ── Tick + heading ── */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--color-gold)', marginBottom: 20,
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
               stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px', color: 'var(--color-navy)' }}>
          {isPaid ? 'Payment confirmed!' : 'Booking received!'}
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
          {isPaid
            ? 'Your place on the retreat is secured. See you in Turkey, in shā Allāh!'
            : isDeposit
              ? 'Your deposit has been received. Remaining instalments are detailed below.'
              : 'Your booking is being processed. You\'ll receive a confirmation email shortly.'}
        </p>
      </div>

      {/* ── Ref pill ── */}
      <div style={{
        background: '#f9f7f0', border: '1px solid #e9e0c8', borderRadius: 10,
        padding: '16px 20px', marginBottom: 24, textAlign: 'center',
      }}>
        <p style={{ margin: '0 0 4px', fontSize: 13, color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Booking reference
        </p>
        <p style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--color-navy)' }}>
          {booking.ref}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>
          Keep this safe — you'll need it for any queries
        </p>
      </div>

      {/* ── Summary card ── */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
        padding: '20px 24px', marginBottom: 24,
      }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: 'var(--color-navy)' }}>
          Booking summary
        </h2>

        <Row label="Guest"      value={booking.leadName} />
        <Row label="Room"       value={booking.roomName} />
        <Row label="Party"      value={partyLine(booking)} />
        <Row label="Plan"       value={booking.plan === 'FULL' ? 'Full payment' : 'Instalment plan'} />
        <div style={{ borderTop: '1px solid #f3f4f6', margin: '12px 0' }} />
        <Row label="Total"      value={fmt(booking.totalAmount)} bold />
        <Row label="Paid so far" value={fmt(booking.paidAmount)} />
      </div>

      {/* ── Instalment schedule (if applicable) ── */}
      {booking.instalments.length > 0 && (
        <div style={{
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
          padding: '20px 24px', marginBottom: 32,
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: 'var(--color-navy)' }}>
            Payment schedule
          </h2>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['', 'Due date', 'Amount', 'Status'].map(h => (
                  <th key={h} style={{
                    textAlign: h === 'Amount' || h === 'Status' ? 'right' : 'left',
                    paddingBottom: 10, color: '#9ca3af', fontWeight: 500,
                    borderBottom: '1px solid #f3f4f6',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {booking.instalments.map((ins, i) => {
                const isFirst = i === 0
                const paid    = ins.status === 'paid'
                return (
                  <tr key={ins.number} style={{
                    background: isFirst ? '#fdf9ed' : 'transparent',
                  }}>
                    <td style={{ padding: '10px 0', paddingRight: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {ins.label}
                    </td>
                    <td style={{ padding: '10px 0', color: '#374151' }}>
                      {fmtDate(ins.dueDate)}
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: isFirst ? 600 : 400,
                      color: isFirst ? 'var(--color-gold)' : '#374151' }}>
                      {fmt(ins.amount)}
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>
                      <StatusBadge status={ins.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {booking.plan === 'INSTALMENT' && (
            <p style={{ margin: '16px 0 0', fontSize: 12, color: '#9ca3af' }}>
              Upcoming instalments will be charged automatically to your saved payment method.
            </p>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <Link href="/dashboard" style={{
          display: 'inline-block',
          background: 'var(--color-gold)', color: '#fff',
          padding: '14px 40px', borderRadius: 8,
          fontWeight: 600, fontSize: 15, textDecoration: 'none',
          textAlign: 'center', width: '100%', maxWidth: 320,
        }}>
          Go to my bookings
        </Link>
        <Link href="/" style={{
          fontSize: 14, color: '#9ca3af', textDecoration: 'underline',
        }}>
          Return to homepage
        </Link>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 14 }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: bold ? 600 : 400, color: bold ? 'var(--color-navy)' : '#374151' }}>
        {value}
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    paid:      { label: 'Paid',      color: '#065f46', bg: '#d1fae5' },
    scheduled: { label: 'Scheduled', color: '#92400e', bg: '#fef3c7' },
    failed:    { label: 'Failed',    color: '#991b1b', bg: '#fee2e2' },
    cancelled: { label: 'Cancelled', color: '#6b7280', bg: '#f3f4f6' },
  }
  const { label, color, bg } = map[status] ?? { label: status, color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 99,
      fontSize: 12, fontWeight: 500, color, background: bg,
    }}>
      {label}
    </span>
  )
}
