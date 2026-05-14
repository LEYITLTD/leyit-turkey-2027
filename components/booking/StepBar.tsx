'use client'

import { usePathname } from 'next/navigation'

const STEPS = [
  { label: 'Room & Guests', path: '/book' },
  { label: 'Occupants',     path: '/book/occupants' },
  { label: 'Your Account',  path: '/book/account' },
  { label: 'Review & Pay',  path: '/book/review' },
]

export function StepBar() {
  const pathname = usePathname()
  const current  = STEPS.findIndex(s => s.path === pathname)

  return (
    <nav aria-label="Booking steps" style={{ padding: '16px 0 14px', overflowX: 'auto' }}>
      <ol style={{
        display: 'flex', alignItems: 'center',
        margin: 0, padding: 0, listStyle: 'none',
        minWidth: 360,
      }}>
        {STEPS.map((step, i) => {
          const done   = i < current
          const active = i === current
          const isLast = i === STEPS.length - 1

          return (
            <li key={step.path} style={{ display: 'flex', alignItems: 'center', flex: isLast ? 0 : 1 }}>
              {/* Node + label */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  background: done
                    ? 'var(--gold-deep)'
                    : active
                      ? 'var(--gold)'
                      : 'var(--surface-2)',
                  color:  done || active ? '#fff' : 'var(--muted)',
                  border: active
                    ? '2px solid var(--gold-deep)'
                    : done
                      ? 'none'
                      : '1.5px solid var(--line-2)',
                  flexShrink: 0,
                  transition: 'all 220ms',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: 10.5,
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--ink)' : done ? 'var(--gold-deep)' : 'var(--muted-2)',
                  whiteSpace: 'nowrap',
                  letterSpacing: active ? '-0.01em' : 0,
                }}>
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {!isLast && (
                <div style={{
                  flex: 1, height: 2,
                  margin: '0 6px',
                  marginBottom: 20,        // aligns with node centre
                  background: done ? 'var(--gold-deep)' : 'var(--line-2)',
                  transition: 'background 300ms',
                  borderRadius: 2,
                }} />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
