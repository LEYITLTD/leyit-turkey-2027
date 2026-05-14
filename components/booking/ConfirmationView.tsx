'use client'

import Link from 'next/link'
import type { ConfirmationData } from '@/app/actions/get-booking'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function partyLine(b: ConfirmationData) {
  const parts: string[] = []
  if (b.adults)   parts.push(`${b.adults} adult${b.adults > 1 ? 's' : ''}`)
  if (b.child711) parts.push(`${b.child711} child${b.child711 > 1 ? 'ren' : ''} (7–11)`)
  if (b.child46)  parts.push(`${b.child46} child${b.child46 > 1 ? 'ren' : ''} (4–6)`)
  if (b.infants)  parts.push(`${b.infants} infant${b.infants > 1 ? 's' : ''}`)
  return parts.join(', ')
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  booking:  ConfirmationData
  justPaid: boolean   // true when arriving directly from a successful payment
}

export function ConfirmationView({ booking, justPaid }: Props) {
  const isFull       = booking.plan === 'FULL'
  const isFullyPaid  = booking.status === 'FULLY_PAID'
  // Consider payment received if webhook already fired OR we came straight
  // from confirmPayment (justPaid) — webhook may be a few seconds behind
  const paymentReceived = isFullyPaid || justPaid

  // ── Heading & sub-message ──────────────────────────────────────────────────
  let heading: string
  let subMessage: string

  if (isFull) {
    if (paymentReceived) {
      heading    = 'Payment confirmed!'
      subMessage = 'Your full payment has been received. Your place on the retreat is secured. See you in Turkey, in shā Allāh!'
    } else {
      heading    = 'Booking received!'
      subMessage = 'Your booking is confirmed. Your payment is being processed and will be reflected shortly.'
    }
  } else {
    // INSTALMENT
    if (paymentReceived) {
      heading    = 'Deposit received!'
      subMessage = 'Your 25% deposit has been received and your place is reserved. Your remaining instalments are shown below.'
    } else {
      heading    = 'Booking received!'
      subMessage = 'Your booking is confirmed. Your deposit payment is being processed and will be reflected shortly.'
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 16px 80px' }}>

      {/* ── Tick + heading ── */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 72, height: 72, borderRadius: '50%',
          background: paymentReceived ? 'var(--color-gold, #c9a961)' : '#6b7280',
          marginBottom: 20,
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
               stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px', color: '#1a2744' }}>
          {heading}
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
          {subMessage}
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
        <p style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '0.15em', color: '#1a2744' }}>
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
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1a2744' }}>
          Booking summary
        </h2>

        <Row label="Guest"  value={booking.leadName} />
        <Row label="Room"   value={booking.roomName} />
        <Row label="Party"  value={partyLine(booking)} />
        <Row label="Plan"   value={isFull ? 'Full payment' : 'Instalment plan (25% deposit)'} />
        <div style={{ borderTop: '1px solid #f3f4f6', margin: '12px 0' }} />
        <Row label="Total"  value={fmt(booking.totalAmount)} bold />

        {/* Only show "Paid so far" for instalment plans or when webhook has confirmed */}
        {(!isFull || isFullyPaid) && (
          <Row
            label="Paid so far"
            value={paymentReceived && isFull ? fmt(booking.totalAmount) : fmt(booking.paidAmount)}
          />
        )}

        {/* For full payment just made, show a processing note */}
        {isFull && justPaid && !isFullyPaid && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 6,
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            fontSize: 12.5, color: '#166534',
          }}>
            ✓ Payment submitted — your booking is secured. Confirmation will update within a few seconds.
          </div>
        )}
      </div>

      {/* ── Payment schedule — instalment plans only ── */}
      {!isFull && booking.instalments.length > 0 && (
        <div style={{
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
          padding: '20px 24px', marginBottom: 32,
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1a2744' }}>
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
                const isFirst     = i === 0
                // Consider first instalment paid if justPaid (webhook lags)
                const effectivePaid = ins.status === 'paid' || (isFirst && justPaid)
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
                    <td style={{ padding: '10px 0', textAlign: 'right',
                      fontWeight: isFirst ? 600 : 400,
                      color: isFirst ? '#c9a961' : '#374151' }}>
                      {fmt(ins.amount)}
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>
                      <StatusBadge status={effectivePaid ? 'paid' : ins.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <p style={{ margin: '16px 0 0', fontSize: 12, color: '#9ca3af' }}>
            Remaining instalments will be charged automatically on their due dates.
          </p>
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <Link href="/dashboard" style={{
          display: 'inline-block',
          background: '#c9a961', color: '#fff',
          padding: '14px 40px', borderRadius: 8,
          fontWeight: 600, fontSize: 15, textDecoration: 'none',
          textAlign: 'center', width: '100%', maxWidth: 320,
        }}>
          Go to my bookings
        </Link>
        <Link href="/" style={{ fontSize: 14, color: '#9ca3af', textDecoration: 'underline' }}>
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
      <span style={{ fontWeight: bold ? 600 : 400, color: bold ? '#1a2744' : '#374151' }}>
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
