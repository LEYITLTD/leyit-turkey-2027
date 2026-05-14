import { BookingFlowProvider } from '@/lib/booking-flow'
import { StepBar } from '@/components/booking/StepBar'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Book — Light Upon Light Turkey Retreat 2027',
}

export default function BookLayout({ children }: { children: ReactNode }) {
  return (
    <BookingFlowProvider>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

        {/* ── Header ── */}
        <header style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--line)',
        }}>
          <div style={{ maxWidth: 920, margin: '0 auto', padding: '10px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 12 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Secure booking
              </div>
            </div>
          </div>
        </header>

        {/* ── Step bar ── */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
          <div style={{ maxWidth: 920, margin: '0 auto', padding: '0 20px' }}>
            <StepBar />
          </div>
        </div>

        {/* ── Page ── */}
        <main style={{ maxWidth: 920, margin: '0 auto', padding: '32px 20px 80px' }}>
          {children}
        </main>

      </div>
    </BookingFlowProvider>
  )
}
