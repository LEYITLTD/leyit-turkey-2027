'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { createAccount } from '@/app/actions/auth'
import { useBookingFlow } from '@/lib/booking-flow'
import { PINNED_COUNTRIES, ALL_COUNTRIES } from '@/lib/country-codes'
import type { Country } from '@/lib/country-codes'

type Mode = 'create' | 'signin'

const DEFAULT_COUNTRY = PINNED_COUNTRIES[0] // 🇬🇧 +44

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

// ─── Phone input with country code picker ────────────────────────────────────

function PhoneInput({
  dialCode, number, onDialCode, onNumber, error,
}: {
  dialCode:   string
  number:     string
  onDialCode: (d: string) => void
  onNumber:   (n: string) => void
  error?:     string
}) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = [...PINNED_COUNTRIES, ...ALL_COUNTRIES].find(c => c.dial === dialCode) ?? DEFAULT_COUNTRY

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const searchLower = search.toLowerCase()
  const allCountries = [...PINNED_COUNTRIES, ...ALL_COUNTRIES]
    .sort((a, b) => a.name.localeCompare(b.name))
  const allFiltered = allCountries.filter(
    c => c.name.toLowerCase().includes(searchLower) || c.dial.includes(search)
  )

  const borderColour = error ? 'var(--danger)' : open ? 'var(--gold-deep)' : 'var(--line-2)'
  const shadow = open ? '0 0 0 3px rgba(201,169,97,0.12)' : 'none'

  return (
    <div ref={ref}>
      <div style={{
        display: 'flex', border: `1px solid ${borderColour}`,
        borderRadius: 'var(--radius-sm)', background: 'var(--surface)',
        boxShadow: shadow, transition: 'border-color 120ms, box-shadow 120ms',
        overflow: 'hidden',
      }}>
        {/* Dial code button */}
        <button
          type="button"
          onClick={() => { setOpen(v => !v); setSearch('') }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 10px', background: 'var(--surface-2)',
            border: 'none', borderRight: `1px solid ${borderColour}`,
            cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
            color: 'var(--ink)', whiteSpace: 'nowrap', flexShrink: 0,
            transition: 'border-color 120ms',
          }}
        >
          <span style={{ fontSize: 16 }}>{selected.flag}</span>
          <span style={{ fontWeight: 500 }}>{selected.dial}</span>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Number field */}
        <input
          type="tel"
          value={number}
          onChange={e => onNumber(e.target.value)}
          placeholder="7700 000000"
          style={{
            flex: 1, border: 'none', outline: 'none',
            padding: '10px 12px', fontSize: 13,
            background: 'transparent', color: 'var(--ink)',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', zIndex: 50,
          background: 'var(--surface)',
          border: '1px solid var(--line-2)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          width: 300, maxHeight: 320,
          display: 'flex', flexDirection: 'column',
          marginTop: 4, overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--line)' }}>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search country…"
              style={{
                width: '100%', border: '1px solid var(--line-2)',
                borderRadius: 'var(--radius-sm)', padding: '6px 10px',
                fontSize: 12.5, outline: 'none', fontFamily: 'inherit',
                background: 'var(--surface-2)',
              }}
            />
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {allFiltered.map(c => (
              <CountryOption key={c.code} country={c} selected={c.dial === dialCode}
                onClick={() => { onDialCode(c.dial); setOpen(false); setSearch('') }} />
            ))}
            {allFiltered.length === 0 && (
              <div style={{ padding: '14px 12px', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                No results
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}

function CountryOption({ country, selected, onClick }: { country: Country; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '8px 12px', border: 'none',
        background: selected ? 'var(--gold-soft)' : 'transparent',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{country.flag}</span>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{country.name}</span>
      <span style={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{country.dial}</span>
    </button>
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
  const [dialCode, setDialCode] = useState(DEFAULT_COUNTRY.dial)
  const [phoneNum, setPhoneNum] = useState('')
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
    if (mode === 'create' && !phoneNum.trim())             errs.phone    = 'Phone number is required.'
    setFieldErr(errs)
    return Object.keys(errs).length === 0
  }

  // ── Create account then auto sign-in ────────────────────────────────────────
  function handleCreate() {
    if (!validate()) return
    setError(null)

    startTransition(async () => {
      const result = await createAccount({
        email, password,
        phone: `${dialCode} ${phoneNum.trim()}`,
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
      // refresh() tells Next.js to re-fetch server components with the new
      // session cookie before we push to the next page
      router.refresh()
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
      router.refresh()
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
            <div style={{ position: 'relative' }}>
              <Label>Phone number</Label>
              <PhoneInput
                dialCode={dialCode}
                number={phoneNum}
                onDialCode={d => { setDialCode(d); setFieldErr(p => ({ ...p, phone: '' })) }}
                onNumber={n => { setPhoneNum(n); setFieldErr(p => ({ ...p, phone: '' })) }}
                error={fieldErr.phone}
              />
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
