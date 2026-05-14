'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useBookingFlow } from '@/lib/booking-flow'
import { buildInstalmentSchedule, formatGBP } from '@/lib/pricing'
import { validateDiscountCode } from '@/app/actions/booking-data'
import { initiatePayment } from '@/app/actions/initiate-payment'
import { PaymentForm } from '@/components/booking/PaymentForm'
import type { RoomTypeData } from '@/app/actions/booking-data'
import type { InstalmentSlot } from '@/lib/pricing'

interface Props { rooms: RoomTypeData[] }

// ─── Instalment schedule ──────────────────────────────────────────────────────

function ScheduleTable({ schedule }: { schedule: InstalmentSlot[] }) {
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="card" style={{ overflow: 'hidden', marginTop: 12 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Your payment schedule
        </div>
      </div>
      <div>
        {schedule.map((s, i) => {
          const isFirst = i === 0
          return (
            <div key={s.number} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 16px',
              borderBottom: i < schedule.length - 1 ? '1px solid var(--line)' : 'none',
              background: isFirst ? 'oklch(0.98 0.012 85)' : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: isFirst ? 'var(--gold-deep)' : 'var(--surface-2)',
                  border: isFirst ? 'none' : '1.5px solid var(--line-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700,
                  color: isFirst ? '#fff' : 'var(--muted)',
                }}>
                  {isFirst ? '✓' : s.number}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: isFirst ? 600 : 400, color: 'var(--ink)' }}>{s.label}</div>
                  <div style={{ fontSize: 11.5, color: isFirst ? 'var(--gold-deep)' : 'var(--muted)', marginTop: 1 }}>
                    {isFirst ? 'Paid today' : `Due ${fmt(s.dueDate)}`}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: isFirst ? 'var(--gold-deep)' : 'var(--ink)' }}>
                {formatGBP(s.amount)}
              </span>
            </div>
          )
        })}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '11px 16px', borderTop: '2px solid var(--line)', background: 'var(--surface-2)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Total</span>
        <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {formatGBP(schedule.reduce((s, i) => s + i.amount, 0))}
        </span>
      </div>
    </div>
  )
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({ selected, title, sub, amount, onClick }: {
  selected: boolean; title: string; sub: string; amount: string; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} style={{
      all: 'unset', boxSizing: 'border-box', minWidth: 0,
      flex: 1, cursor: 'pointer', padding: '14px 16px',
      borderRadius: 'var(--radius-lg)',
      border: selected ? '2px solid var(--gold-deep)' : '1.5px solid var(--line)',
      background: selected ? 'oklch(0.985 0.012 85)' : 'var(--surface)',
      boxShadow: selected ? '0 0 0 3px rgba(168,138,71,0.1)' : 'none',
      transition: 'all 140ms', textAlign: 'left', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 14, right: 14,
        width: 18, height: 18, borderRadius: '50%',
        border: selected ? 'none' : '2px solid var(--line-2)',
        background: selected ? 'var(--gold-deep)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 3, paddingRight: 24 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{sub}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: selected ? 'var(--gold-deep)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
        {amount}
      </div>
    </button>
  )
}

// ─── Payment screen (rendered after initiatePayment succeeds) ────────────────
// Lives outside ReviewStep so it never unmounts when ReviewStep's draft
// state changes after reset().

function PaymentScreen({ clientSecret, bookingRef, amountToday, plan, onSuccess }: {
  clientSecret: string
  bookingRef:   string
  amountToday:  number
  plan:         'FULL' | 'INSTALMENT'
  onSuccess:    () => void
}) {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold-deep)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          Step 4 of 4
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Payment details
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--muted)' }}>
          Booking ref <strong>{bookingRef}</strong> · {formatGBP(amountToday)} {plan === 'INSTALMENT' ? 'deposit' : 'full payment'}
        </p>
      </div>

      <div style={{ maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
        <div className="card card-pad">
          <PaymentForm
            clientSecret={clientSecret}
            bookingRef={bookingRef}
            amountLabel={formatGBP(amountToday)}
            onSuccess={onSuccess}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ReviewStep({ rooms }: Props) {
  const router  = useRouter()
  const { data: session, status } = useSession()
  const { draft, setDraft, reset } = useBookingFlow()
  const [isPending, startTransition] = useTransition()

  const [plan,        setPlan]        = useState<'FULL' | 'INSTALMENT'>(draft.plan ?? 'FULL')
  const [codeInput,   setCodeInput]   = useState(draft.discountCode ?? '')
  const [codeMsg,     setCodeMsg]     = useState<{ ok: boolean; text: string } | null>(null)
  const [discountAmt, setDiscountAmt] = useState(draft.discountAmt)
  const [applyingCode, startCodeTransition] = useTransition()
  const [error,       setError]       = useState<string | null>(null)

  // Payment state — set after initiatePayment succeeds
  const [clientSecret,       setClientSecret]       = useState<string | null>(null)
  const [bookingRef,         setBookingRef]         = useState<string | null>(null)
  // Capture the amount at the moment Pay is clicked so the payment screen
  // can display it even after the draft has been reset()
  const [amountTodayCapture, setAmountTodayCapture] = useState(0)

  // Guards — skip entirely once payment has been initiated (draft will be
  // stale after reset() but we don't want a redirect mid-payment)
  useEffect(() => {
    if (clientSecret) return
    if (status === 'unauthenticated')       router.replace('/book/account')
    else if (!draft.roomTypeId)             router.replace('/book')
    else if (!draft.occupants.length)       router.replace('/book/occupants')
  }, [clientSecret, status, draft.roomTypeId, draft.occupants.length, router])

  // ── Show payment form BEFORE any draft-dependent checks ───────────────────
  // Once clientSecret is set the draft may be cleared; we must not fall
  // through to the spinner or summary which both read draft fields.
  if (clientSecret && bookingRef) {
    return <PaymentScreen
      clientSecret={clientSecret}
      bookingRef={bookingRef}
      amountToday={amountTodayCapture}
      plan={plan}
      onSuccess={() => { reset(); router.push(`/book/confirmation/${bookingRef}`) }}
    />
  }

  if (status === 'loading' || !draft.roomTypeId || !draft.priceBreakdown) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <span className="auth-spin" style={{ width: 20, height: 20, borderTopColor: 'var(--gold-deep)', borderColor: 'var(--line-2)' }} />
      </div>
    )
  }

  const room        = rooms.find(r => r.id === draft.roomTypeId)
  const bd          = draft.priceBreakdown
  const extraNights = draft.extraNightsBefore + draft.extraNightsAfter
  const extraCost   = extraNights * bd.ratePerExtraNight
  const grandTotal  = bd.total + extraCost - discountAmt
  const schedule    = buildInstalmentSchedule(grandTotal, plan)
  const amountToday = plan === 'FULL' ? grandTotal : schedule[0].amount

  // ── Discount code ──────────────────────────────────────────────────────────────
  function handleApplyCode() {
    if (!codeInput.trim()) return
    setCodeMsg(null)
    startCodeTransition(async () => {
      const result = await validateDiscountCode(codeInput)
      if (!result.ok) {
        setCodeMsg({ ok: false, text: result.message })
        setDiscountAmt(0)
        setDraft({ discountCode: null, discountAmt: 0 })
        return
      }
      const amt = result.fixed
        ? result.fixed
        : result.percent
          ? Math.round(grandTotal * result.percent / 100)
          : 0
      setDiscountAmt(amt)
      setCodeMsg({ ok: true, text: `${result.label} applied — saving ${formatGBP(amt)}` })
      setDraft({ discountCode: codeInput.trim().toUpperCase(), discountAmt: amt })
    })
  }

  // ── Initiate payment ─────────────────────────────────────────────────────────
  function handleInitiatePayment() {
    setError(null)
    setDraft({ plan })
    // Snapshot the amount NOW before the draft could change
    const snapshot = amountToday
    startTransition(async () => {
      const result = await initiatePayment({
        roomTypeId:        draft.roomTypeId!,
        adults:            draft.adults,
        infants:           draft.infants,
        child46:           draft.child46,
        child711:          draft.child711,
        extraNightsBefore: draft.extraNightsBefore,
        extraNightsAfter:  draft.extraNightsAfter,
        baseTotal:         bd.total,
        ratePerExtraNight: bd.ratePerExtraNight,
        discountCode:      draft.discountCode,
        discountAmt,
        plan,
        occupants:         draft.occupants,
      })

      if (!result.ok) { setError(result.error); return }

      if (!result.clientSecret) {
        // Stripe not configured — clear draft and go straight to confirmation
        reset()
        router.push(`/book/confirmation/${result.ref}`)
        return
      }

      // Capture amount for the payment screen, then show it.
      // Do NOT call reset() here — the guard reads draft.roomTypeId and
      // would redirect to /book the moment the draft is cleared.
      // reset() is called via onSuccess after confirmPayment succeeds.
      setAmountTodayCapture(snapshot)
      setClientSecret(result.clientSecret)
      setBookingRef(result.ref)
    })
  }

  // ── Order summary + plan selection ────────────────────────────────────────────
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold-deep)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          Step 4 of 4
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Review &amp; pay
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--muted)' }}>
          Check everything looks right before you pay.
        </p>
      </div>

      <div style={{ maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Order summary ── */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Order summary
            </div>
          </div>
          <div style={{ padding: '12px 16px 4px' }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{room?.displayName ?? draft.roomTypeId}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {[
                  `${draft.adults} adult${draft.adults !== 1 ? 's' : ''}`,
                  draft.infants  ? `${draft.infants} infant${draft.infants > 1 ? 's' : ''}`           : null,
                  draft.child46  ? `${draft.child46} child${draft.child46 > 1 ? 'ren' : ''} (4–6)`    : null,
                  draft.child711 ? `${draft.child711} child${draft.child711 > 1 ? 'ren' : ''} (7–11)` : null,
                ].filter(Boolean).join(' · ')}
                {' · '}{bd.nights + extraNights} night{bd.nights + extraNights !== 1 ? 's' : ''} total
              </div>
            </div>

            {[
              { label: `Retreat (${bd.nights} nights)`,                                              amount: bd.total },
              ...(extraNights > 0 ? [{ label: `Extra nights (${extraNights} × ${formatGBP(bd.ratePerExtraNight)})`, amount: extraCost }] : []),
              ...(bd.bundleDiscount < 0 ? [{ label: 'Bundle discount (20%)',                          amount: bd.bundleDiscount }] : []),
              ...(discountAmt > 0       ? [{ label: `Discount code (${draft.discountCode})`,           amount: -discountAmt }] : []),
            ].map((line, i, arr) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
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
            padding: '12px 16px', borderTop: '2px solid var(--line)', background: 'var(--surface-2)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--gold-deep)' }}>
              {formatGBP(grandTotal)}
            </span>
          </div>
        </div>

        {/* ── Discount code ── */}
        <div className="card card-pad">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            Discount code <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeMsg(null) }}
              onKeyDown={e => e.key === 'Enter' && handleApplyCode()}
              placeholder="Enter code"
              className="input"
              style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}
            />
            <button type="button" onClick={handleApplyCode} disabled={applyingCode || !codeInput.trim()} className="btn" style={{ flexShrink: 0 }}>
              {applyingCode ? <span className="auth-spin" style={{ borderTopColor: 'var(--gold-deep)', borderColor: 'var(--line-2)' }} /> : 'Apply'}
            </button>
          </div>
          {codeMsg && (
            <p style={{ margin: '6px 0 0', fontSize: 12.5, color: codeMsg.ok ? 'var(--success)' : 'var(--danger)' }}>
              {codeMsg.ok ? '✓ ' : ''}{codeMsg.text}
            </p>
          )}
        </div>

        {/* ── Payment plan ── */}
        <div className="card card-pad">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>How would you like to pay?</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <PlanCard
              selected={plan === 'FULL'}
              title="Pay in full"
              sub="One payment, nothing more to do"
              amount={formatGBP(grandTotal)}
              onClick={() => setPlan('FULL')}
            />
            <PlanCard
              selected={plan === 'INSTALMENT'}
              title="Pay in instalments"
              sub="Deposit today, 3 monthly payments"
              amount={`${formatGBP(schedule[0].amount)} today`}
              onClick={() => setPlan('INSTALMENT')}
            />
          </div>
          {plan === 'INSTALMENT' && <ScheduleTable schedule={schedule} />}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--danger-soft)', fontSize: 13, color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        {/* ── Pay button ── */}
        <button
          type="button"
          onClick={handleInitiatePayment}
          disabled={isPending}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', justifyContent: 'center', gap: 8 }}
        >
          {isPending ? (
            <><span className="auth-spin" />Preparing payment…</>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Pay {formatGBP(amountToday)} now
            </>
          )}
        </button>

        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
          🔒 Payments are processed securely by Stripe. We never store your card details.
        </p>

      </div>
    </div>
  )
}
