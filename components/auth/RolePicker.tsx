'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RolePicker() {
  const { data: session } = useSession()
  const router = useRouter()
  const [hovered, setHovered] = useState<'admin' | 'customer' | null>(null)

  if (!session) return null

  const user = session.user
  const initials = user.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '??'

  return (
    <div className="rp-shell">
      <div className="rp-content">
        {/* Who is signed in */}
        <div className="rp-head">
          <div className="rp-avatar">{initials}</div>
          <div>
            <div className="rp-eyebrow">Signed in as</div>
            <div className="rp-name">{user.name}</div>
            <div className="rp-email">{user.email}</div>
          </div>
          <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => signOut({ callbackUrl: '/login' })}>
            Sign out
          </button>
        </div>

        <h2 className="rp-h2">Where to today?</h2>
        <p className="rp-sub">Your account has access to both. Pick where you'd like to go — you can switch any time.</p>

        <div className="rp-cards">
          {/* Admin card */}
          <button
            className={`rp-card rp-card-admin${hovered === 'admin' ? ' hover' : ''}`}
            onMouseEnter={() => setHovered('admin')}
            onMouseLeave={() => setHovered(null)}
            onClick={() => router.push('/admin')}
          >
            <div className="rp-card-icon">
              <DashboardIcon />
            </div>
            <div className="rp-card-tag">Admin · {user.adminRole ?? 'Team'}</div>
            <div className="rp-card-title">Operations workspace</div>
            <div className="rp-card-desc">
              Live revenue dashboard, bookings, inventory, payment links, and exports.
            </div>
            <div className="rp-card-arrow"><ArrowRightIcon /></div>
          </button>

          {/* Customer card */}
          <button
            className={`rp-card rp-card-customer${hovered === 'customer' ? ' hover' : ''}`}
            onMouseEnter={() => setHovered('customer')}
            onMouseLeave={() => setHovered(null)}
            onClick={() => router.push('/my-booking')}
          >
            <div className="rp-card-icon" style={{ background: 'linear-gradient(135deg, var(--gold-light), var(--gold))', color: 'var(--ink)' }}>
              <UserIcon />
            </div>
            <div className="rp-card-tag">Guest</div>
            <div className="rp-card-title">My retreat booking</div>
            <div className="rp-card-desc">
              Payment schedule, receipts, occupants, and pay-early — for your own attendance.
            </div>
            <div className="rp-card-arrow"><ArrowRightIcon /></div>
          </button>
        </div>

        <div className="rp-tip">
          <InfoIcon />
          You can swap roles any time from the avatar menu in the top bar.
        </div>
      </div>

      <style>{rpStyles}</style>
    </div>
  )
}

const rpStyles = `
  .rp-shell {
    min-height: 100vh;
    background:
      radial-gradient(ellipse 800px 600px at 50% 0%, rgba(201,169,97,0.08), transparent 60%),
      var(--bg);
    overflow-y: auto;
  }
  .rp-content {
    width: 100%; max-width: 880px; margin: 0 auto;
    padding: 48px 40px; display: flex; flex-direction: column;
  }
  .rp-head {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 16px; background: var(--surface);
    border: 1px solid var(--line); border-radius: var(--radius);
    margin-bottom: 36px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  }
  .rp-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: linear-gradient(135deg, var(--gold-light), var(--gold));
    color: var(--ink); display: grid; place-items: center;
    font-size: 13px; font-weight: 600; flex-shrink: 0;
  }
  .rp-eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted-2); }
  .rp-name    { font-size: 14px; font-weight: 600; margin-top: 1px; }
  .rp-email   { font-size: 11px; color: var(--muted); margin-top: 1px; }
  .rp-h2  { margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.025em; color: var(--ink); }
  .rp-sub { margin: 10px 0 28px; font-size: 14px; color: var(--muted); line-height: 1.6; max-width: 540px; }
  .rp-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .rp-card {
    position: relative; background: var(--surface);
    border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 26px; text-align: left; cursor: pointer;
    transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1); overflow: hidden;
    font-family: inherit;
  }
  .rp-card::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(201,169,97,0.06), transparent 60%);
    opacity: 0; transition: opacity 200ms; pointer-events: none;
  }
  .rp-card:hover, .rp-card.hover {
    border-color: var(--gold-deep); transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(201,169,97,0.18), 0 0 0 1px var(--gold-deep);
  }
  .rp-card:hover::before, .rp-card.hover::before { opacity: 1; }
  .rp-card-icon {
    width: 44px; height: 44px; border-radius: 11px;
    display: grid; place-items: center; margin-bottom: 18px;
  }
  .rp-card-admin .rp-card-icon { background: var(--ink); color: var(--gold); }
  .rp-card-tag   { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 500; color: var(--muted); margin-bottom: 6px; }
  .rp-card-title { font-size: 18px; font-weight: 600; letter-spacing: -0.015em; color: var(--ink); }
  .rp-card-desc  { font-size: 12.5px; color: var(--muted); line-height: 1.55; margin-top: 8px; margin-bottom: 16px; }
  .rp-card-arrow {
    position: absolute; right: 22px; top: 26px;
    width: 30px; height: 30px; border-radius: 50%;
    border: 1px solid var(--line-2); display: grid; place-items: center;
    color: var(--muted); transition: all 200ms;
  }
  .rp-card:hover .rp-card-arrow, .rp-card.hover .rp-card-arrow {
    background: var(--gold-deep); color: white;
    border-color: var(--gold-deep); transform: translateX(2px);
  }
  .rp-tip {
    margin-top: 22px; display: flex; align-items: center;
    gap: 8px; font-size: 12px; color: var(--muted);
  }
  @media (max-width: 600px) { .rp-cards { grid-template-columns: 1fr; } }
`

function DashboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )
}
function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>
  )
}
function InfoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
    </svg>
  )
}
