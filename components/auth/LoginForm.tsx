'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginForm() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [keepMe,   setKeepMe]   = useState(true)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await signIn('credentials', {
      email:    email.toLowerCase(),
      password,
      redirect: false,
    })

    setLoading(false)

    if (!res?.ok) {
      setError("We don't recognise that email or password.")
      return
    }

    // Fetch fresh session to read role and route correctly
    const session = await fetch('/api/auth/session').then(r => r.json())
    const role = session?.user?.role

    if (role === 'ADMIN')    router.push('/admin')
    else if (role === 'BOTH') router.push('/role-select')
    else                      router.push('/my-booking')
  }

  return (
    <div className="auth-shell">
      {/* ── Left — brand panel ── */}
      <div className="auth-brand">
        <div className="auth-brand-inner">
          <div className="auth-brand-mark">
            <Image src="/lul-logo.png" alt="Light Upon Light" width={72} height={72} />
          </div>
          <div className="auth-brand-titles">
            <div className="auth-brand-eyebrow">Light Upon Light</div>
            <h1 className="auth-brand-title">Turkey Retreat 2027</h1>
          </div>
        </div>
      </div>

      {/* ── Right — sign in form ── */}
      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-head">
            <div className="auth-eyebrow">Sign in</div>
            <h2 className="auth-h2">Welcome back</h2>
            <p className="auth-sub">
              One sign-in for guests and team. We'll route you to the right place.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Email */}
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span className="field-label">Email address</span>
              <div className="input-wrap">
                <MailIcon />
                <input
                  className="input"
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </label>

            {/* Password */}
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span className="field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                Password
                <a href="/forgot-password" style={{ fontSize: 11, color: 'var(--gold-deep)', textDecoration: 'none' }}>Forgot?</a>
              </span>
              <div className="input-wrap">
                <LockIcon />
                <input
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="input-trail" onClick={() => setShowPwd(s => !s)}>
                  <EyeIcon />
                </button>
              </div>
            </label>

            {/* Keep signed in */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={keepMe}
                onChange={e => setKeepMe(e.target.checked)}
                style={{ accentColor: 'var(--gold-deep)' }}
              />
              Keep me signed in on this device
            </label>

            {/* Error */}
            {error && (
              <div className="auth-error">
                <AlertIcon />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || !email || !password}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? (
                <><div className="auth-spin" /> Signing you in…</>
              ) : (
                <><LockIcon size={13} /> Sign in securely</>
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{authStyles}</style>
    </div>
  )
}

// ─── Inline styles (matching auth.css from design) ───────────────────────────
const authStyles = `
  .auth-shell {
    width: 100vw; height: 100vh;
    display: grid; grid-template-columns: 1fr 1fr;
    background: var(--bg); overflow: hidden;
  }
  .auth-brand {
    background:
      radial-gradient(ellipse 60% 50% at 20% 100%, rgba(201,169,97,0.18), transparent 60%),
      radial-gradient(ellipse 50% 60% at 80% 0%, rgba(201,169,97,0.12), transparent 55%),
      linear-gradient(160deg, #181410 0%, #0A0A0A 50%, #14110D 100%);
    color: #FAFAF7; position: relative; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  .auth-brand::before {
    content: ''; position: absolute; inset: 0;
    background-image:
      linear-gradient(to right,  rgba(201,169,97,0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(201,169,97,0.04) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse 70% 100% at 50% 50%, black 30%, transparent 75%);
    pointer-events: none;
  }
  .auth-brand-inner {
    position: relative; z-index: 2;
    display: flex; flex-direction: column;
    align-items: center; text-align: center; padding: 40px;
  }
  .auth-brand-mark {
    width: 96px; height: 96px; border-radius: 22px;
    background: linear-gradient(135deg, var(--gold) 0%, var(--gold-deep) 100%);
    display: grid; place-items: center; padding: 12px;
    box-shadow: 0 12px 36px rgba(201,169,97,0.32);
    margin-bottom: 36px;
  }
  .auth-brand-mark img { filter: brightness(0) !important; }
  .auth-brand-eyebrow {
    font-size: 12px; font-weight: 500; letter-spacing: 0.22em;
    text-transform: uppercase; color: var(--gold); margin-bottom: 16px;
  }
  .auth-brand-title {
    margin: 0; font-size: 44px; font-weight: 600;
    letter-spacing: -0.025em; line-height: 1.05; color: #FAFAF7;
  }
  .auth-panel {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 48px 40px; overflow-y: auto;
  }
  .auth-card { width: 100%; max-width: 400px; }
  .auth-card-head { margin-bottom: 28px; }
  .auth-eyebrow {
    font-size: 11px; font-weight: 500; letter-spacing: 0.16em;
    text-transform: uppercase; color: var(--gold-deep); margin-bottom: 10px;
  }
  .auth-h2 {
    margin: 0; font-size: 30px; font-weight: 600;
    letter-spacing: -0.025em; color: var(--ink);
  }
  .auth-sub { margin-top: 10px; font-size: 13.5px; color: var(--muted); line-height: 1.55; }
  .auth-form { display: flex; flex-direction: column; gap: 16px; }
  .auth-error {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--danger);
    background: var(--danger-soft); padding: 8px 12px; border-radius: 6px;
  }
  @media (max-width: 720px) {
    .auth-shell { grid-template-columns: 1fr; }
    .auth-brand { display: none; }
  }
`

// ─── Minimal inline icons ─────────────────────────────────────────────────────
function MailIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  )
}
function LockIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
function AlertIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}
