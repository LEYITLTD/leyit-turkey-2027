'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { stripePromise } from '@/lib/stripe-client'

// ─── Inner form (must be inside <Elements>) ───────────────────────────────────

function CheckoutForm({ bookingRef, amountLabel }: { bookingRef: string; amountLabel: string }) {
  const stripe   = useStripe()
  const elements = useElements()
  const router   = useRouter()

  const [isPending, setIsPending] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsPending(true)
    setError(null)

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Fallback for payment methods that require a redirect (e.g. 3D Secure)
        return_url: `${window.location.origin}/book/confirmation/${bookingRef}`,
      },
      // Stays on page for card payments — only redirects when required
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed. Please check your details and try again.')
      setIsPending(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      router.push(`/book/confirmation/${bookingRef}`)
      return
    }

    // requires_action handled automatically by stripe.confirmPayment redirect
    setIsPending(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PaymentElement
        options={{
          layout: 'tabs',
          wallets: { applePay: 'auto', googlePay: 'auto' },
        }}
      />

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: '#fef2f2', color: '#991b1b', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isPending}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: (!stripe || isPending) ? '#d1bfa0' : 'var(--color-gold, #c9a961)',
          color: '#fff',
          border: 'none', borderRadius: 8, padding: '14px 0',
          fontSize: 15, fontWeight: 600, cursor: isPending ? 'default' : 'pointer',
          width: '100%', fontFamily: 'inherit',
          transition: 'background 150ms',
        }}
      >
        {isPending ? (
          <>
            <span style={{
              display: 'inline-block', width: 16, height: 16,
              border: '2px solid rgba(255,255,255,0.3)',
              borderTop: '2px solid #fff',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }} />
            Processing…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Pay {amountLabel} securely
          </>
        )}
      </button>

      <p style={{ margin: 0, fontSize: 11.5, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 }}>
        🔒 Payments are processed securely by Stripe. We never store your card details.
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  )
}

// ─── Exported wrapper — applies Elements context + theme ──────────────────────

interface Props {
  clientSecret: string
  bookingRef:   string
  amountLabel:  string
}

export function PaymentForm({ clientSecret, bookingRef, amountLabel }: Props) {
  if (!stripePromise) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
        Payment system is not configured yet. Please contact us to complete your booking.
      </div>
    )
  }

  const options = {
    clientSecret,
    appearance: {
      theme:     'stripe' as const,
      variables: {
        colorPrimary:       '#c9a961',  // gold
        colorBackground:    '#ffffff',
        colorText:          '#1a2744',  // navy
        colorDanger:        '#dc2626',
        fontFamily:         'Inter, system-ui, sans-serif',
        fontSizeBase:       '14px',
        borderRadius:       '8px',
        spacingUnit:        '4px',
      },
      rules: {
        '.Input': {
          border:     '1px solid #e5e7eb',
          boxShadow:  'none',
          padding:    '10px 12px',
        },
        '.Input:focus': {
          border:     '1px solid #c9a961',
          boxShadow:  '0 0 0 3px rgba(201,169,97,0.15)',
        },
        '.Label': {
          fontWeight: '500',
          color:      '#374151',
        },
        '.Tab': {
          border:        '1px solid #e5e7eb',
          borderRadius:  '8px',
        },
        '.Tab--selected': {
          border:        '1px solid #c9a961',
          boxShadow:     '0 0 0 2px rgba(201,169,97,0.2)',
        },
      },
    },
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm bookingRef={bookingRef} amountLabel={amountLabel} />
    </Elements>
  )
}
