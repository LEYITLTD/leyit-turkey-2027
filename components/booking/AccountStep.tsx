'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { createAccount } from '@/app/actions/auth'
import { useBookingFlow } from '@/lib/booking-flow'

type Mode = 'create' | 'signin'

// ─── Small helpers ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', fontSize: 12, fontWeight: 600,
      color: 'var(--ink-2)', marginBottom: 5, letterSpacing: '0.02em',
    }}>
      {children}
    </label>
  )
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--danger)' }}>{msg}</p>
}

function PasswordInput({
  value, onChange, placeholder, error, autoComplete,
}: {
  value: string; onChange: (v: string) => void
  placeholder?: string; error?: string; autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <div className="input-wrap" style={{ borderColor: error ? 'var(--danger)' : undefined }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? 'Password'}
          autoComplete={autoComplete}
          className="input"
        />
        <button
          type="button"
          className="input-trail"
          onClick={() => setShow(v => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
      </div>
      <FieldError msg={error} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AccountStep() {
  const router  = useRouter()
  const { data: session, status } = useSession()
  const { draft } = useBookingFlow()
  const [isPending, startTransition] = useTransition()

  const [mode, setMode] = useState<Mode>('create')

  // Form state
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [phone,    setPhone]    = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({})

  // Guard — must have completed steps 1 & 2
  useEffect(() => {
    if (!draft.roomTypeId)             router.replace('/book')
    else if (!draft.occupants.length)  router.replace('/book/occupants')
  }, [draft.roomTypeId, draft.occupants.length, router])

  // Already signed in — skip straight to review
  useEffect(() => {
    if (status === 'authenticated') router.replace('/book/review')
  }, [status, router])

  const leadName = draft.occupants[0]?.name ?? ''

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!email.trim())                                    errs.email    = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))  errs.email    = 'Enter a valid email address.'
    if (!password)                                        errs.password = 'Password is required.'
    else if (mode === 'create' && password.length < 8)    errs.password = 'Password must be at least 8 characters.'
    if (mode === 'create' && !phone.trim())               errs.phone    = 'Phone number is required.'
    setFieldErr(errs)
    return Object.keys(errs).length === 0
  }

  // ── Create account then auto sign-in ────────────────────────────────────────
  function handleCreate() {
    if (!validate()) return
    setError(null)

    startTransition(async () => {
      const result = await createAccount({
        email, password, phone,
        name: leadName || email,
      })

      if (!result.ok) {
        // Email already exists — nudge to sign in
        if (result.error.includes('already exists')) {
          setMode('signin')
          setError(result.error)
        } else {
          setError(result.error)
        }
        return
      }

      // Auto sign-in after account creation
      const res = await signIn('credentials', {
        email, password, redirect: false,
      })
      if (res?.error) {
        setError('Account created but sign-in failed. Please sign in manually.')
        setMode('signin')
        return
      }
      router.push('/book/review')
    })
  }

  // ── Sign in ─────────────────────────────────────────────────────────────────
  function handleSignIn() {
    if (!validate()) return
    setError(null)

    startTransition(async () => {
      const res = await signIn('credentials', {
        email, password, redirect: false,
      })
      if (res?.error) {
        setError('Incorrect email or password. Please try again.')
        return
      }
      router.push('/book/review')
    })
  }

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <span className="auth-spin" style={{ width: 20, height: 20, borderTopColor: 'var(--gold-deep)', borderColor: 'var(--line-2)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Heading */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold-deep)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          Step 3 of 4
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {mode === 'create' ? 'Create your account' : 'Sign in'}
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--muted)' }}>
          {mode === 'create'
            ? "You'll use this to log in and manage your booking and instalments."
            : 'Welcome back — sign in to continue your booking.'}
        </p>
      </div>

      <div style={{ maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>

        {/* Lead name pill */}
        {leadName && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', marginBottom: 20,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface-2)', border: '1px solid var(--line)',
            fontSize: 13,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--gold-deep)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {leadName[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{leadName}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Lead occupant</div>
            </div>
          </div>
        )}

        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Email */}
          <div>
            <Label>Email address</Label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setFieldErr(p => ({ ...p, email: '' })) }}
              placeholder="your@email.com"
              autoComplete="email"
              className="input"
              style={{ borderColor: fieldErr.email ? 'var(--danger)' : undefined }}
            />
            <FieldError msg={fieldErr.email} />
          </div>

          {/* Phone — create mode only */}
          {mode === 'create' && (
            <div>
              <Label>Phone number</Label>
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setFieldErr(p => ({ ...p, phone: '' })) }}
                placeholder="+44 7700 000000"
                autoComplete="tel"
                className="input"
                style={{ borderColor: fieldErr.phone ? 'var(--danger)' : undefined }}
              />
              <FieldError msg={fieldErr.phone} />
            </div>
          )}

          {/* Password */}
          <div>
            <Label>Password {mode === 'create' && <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(min. 8 characters)</span>}</Label>
            <PasswordInput
              value={password}
              onChange={v => { setPassword(v); setFieldErr(p => ({ ...p, password: '' })) }}
              placeholder={mode === 'create' ? 'Create a password' : 'Your password'}
              autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
              error={fieldErr.password}
            />
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              padding: '10px 12px', borderRadius: 'var(--radius-sm)',
              background: 'var(--danger-soft)', fontSize: 13, color: 'var(--danger)',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={mode === 'create' ? handleCreate : handleSignIn}
            disabled={isPending}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', gap: 8, marginTop: 4 }}
          >
            {isPending ? (
              <><span className="auth-spin" />{mode === 'create' ? 'Creating account…' : 'Signing in…'}</>
            ) : (
              <>
                {mode === 'create' ? 'Create account & continue' : 'Sign in & continue'}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 6l6 6-6 6"/>
                </svg>
              </>
            )}
          </button>

          {/* Mode toggle */}
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
            {mode === 'create' ? (
              <>Already have an account?{' '}
                <button type="button" onClick={() => { setMode('signin'); setError(null); setFieldErr({}) }}
                  style={{ background: 'none', border: 'none', color: 'var(--gold-deep)', fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 'inherit' }}>
                  Sign in instead
                </button>
              </>
            ) : (
              <>Don&apos;t have an account?{' '}
                <button type="button" onClick={() => { setMode('create'); setError(null); setFieldErr({}) }}
                  style={{ background: 'none', border: 'none', color: 'var(--gold-deep)', fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 'inherit' }}>
                  Create one
                </button>
              </>
            )}
          </p>

        </div>

        <p style={{ margin: '14px 0 0', fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
          By continuing you agree to our terms. Your account lets you view your booking and pay future instalments.
        </p>
      </div>
    </div>
  )
}
