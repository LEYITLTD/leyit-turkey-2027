'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AdminData, AdminBooking } from '@/app/actions/get-admin-data'

// ── Sidebar palette ───────────────────────────────────────────────────────────
const SB = {
  bg:         '#0F0F0B',
  border:     'rgba(255,255,255,0.07)',
  text:       'rgba(255,255,255,0.72)',
  textDim:    'rgba(255,255,255,0.32)',
  gold:       '#C9A961',
  goldDim:    'rgba(201,169,97,0.14)',
  activeBg:   'rgba(201,169,97,0.13)',
  activeText: '#C9A961',
  badge:      'rgba(201,169,97,0.22)',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
function calcAge(dobIso: string) {
  const dob = new Date(dobIso)
  const now = new Date()
  let a = now.getFullYear() - dob.getFullYear()
  if (now.getMonth() - dob.getMonth() < 0 ||
     (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) a--
  return a
}
function partyLine(b: AdminBooking) {
  return [
    `${b.adults} adult${b.adults !== 1 ? 's' : ''}`,
    b.infants  ? `${b.infants} infant${b.infants  > 1 ? 's' : ''}`        : null,
    b.child46  ? `${b.child46} child${b.child46  > 1 ? 'ren' : ''} (4–6)` : null,
    b.child711 ? `${b.child711} child${b.child711 > 1 ? 'ren' : ''} (7–11)` : null,
  ].filter(Boolean).join(', ')
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── Status pill ───────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  DEPOSIT_ONLY:   { label: 'Deposit paid',   cls: 'pill pill-warning' },
  PARTIALLY_PAID: { label: 'Partially paid', cls: 'pill pill-info'    },
  FULLY_PAID:     { label: 'Fully paid',     cls: 'pill pill-success' },
  CANCELLED:      { label: 'Cancelled',      cls: 'pill pill-muted'   },
}
function StatusPill({ status }: { status: string }) {
  const { label, cls } = STATUS_MAP[status] ?? { label: status, cls: 'pill pill-muted' }
  return <span className={cls}>{label}</span>
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const IC = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.8 } as const
const IconGrid     = () => <svg width="14" height="14" viewBox="0 0 24 24" {...IC}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
const IconUsers    = () => <svg width="14" height="14" viewBox="0 0 24 24" {...IC}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const IconList     = () => <svg width="14" height="14" viewBox="0 0 24 24" {...IC}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
const IconCard     = () => <svg width="14" height="14" viewBox="0 0 24 24" {...IC}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
const IconClock    = () => <svg width="14" height="14" viewBox="0 0 24 24" {...IC}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const IconPin      = () => <svg width="14" height="14" viewBox="0 0 24 24" {...IC}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
const IconMail     = () => <svg width="14" height="14" viewBox="0 0 24 24" {...IC}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
const IconRows     = () => <svg width="14" height="14" viewBox="0 0 24 24" {...IC}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
const IconShield   = () => <svg width="14" height="14" viewBox="0 0 24 24" {...IC}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
const IconSettings = () => <svg width="14" height="14" viewBox="0 0 24 24" {...IC}><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
const IconSearch   = () => <svg width="13" height="13" viewBox="0 0 24 24" {...IC}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IconDownload = () => <svg width="13" height="13" viewBox="0 0 24 24" {...IC}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconChevron  = ({ open }: { open: boolean }) =>
  <svg width="13" height="13" viewBox="0 0 24 24" {...IC} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6"/></svg>

// ── Shared layout pieces ──────────────────────────────────────────────────────

function ScreenHeader({ eyebrow, title, em, sub, actions }: {
  eyebrow: string; title: string; em: string; sub: string; actions?: React.ReactNode
}) {
  return (
    <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 5 }}>
          {eyebrow}
        </div>
        <h1 style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', fontFamily: 'Cormorant Garamond, serif' }}>
          {title} <em style={{ fontStyle: 'italic', color: 'var(--gold-deep)' }}>{em}</em>
        </h1>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>{sub}</p>
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>{actions}</div>}
    </div>
  )
}

function StatCard({ icon, label, value, change, changeDown }: {
  icon: string; label: string; value: string; change?: string; changeDown?: boolean
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
      <div style={{ fontSize: 18, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 5 }}>{value}</div>
      {change && <div style={{ fontSize: 11, color: changeDown ? 'var(--danger)' : 'var(--success)', fontWeight: 500 }}>{change}</div>}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 10 }}>{children}</div>
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="card" style={{ overflow: 'hidden', ...style }}>{children}</div>
}

function CardHead({ title, right }: { title: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{title}</span>
      {right && <span>{right}</span>}
    </div>
  )
}

function RoomBar({ name, booked, total, isSeaview }: { name: string; booked: number; total: number; isSeaview: boolean }) {
  const pct = total > 0 ? Math.round((booked / total) * 100) : 0
  const full = booked >= total
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12.5 }}>
        <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
          {name}
          {isSeaview && <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 700, color: 'var(--info)', background: 'var(--info-soft)', padding: '1px 5px', borderRadius: 3 }}>SEA</span>}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: full ? 'var(--danger)' : 'var(--gold-deep)', fontWeight: 700 }}>{booked}/{total}</span>
      </div>
      <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: full ? 'var(--danger)' : pct >= 75 ? 'var(--warning)' : 'var(--gold-deep)', transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

// ── Booking expanded panel ────────────────────────────────────────────────────
function BookingExpanded({ b }: { b: AdminBooking }) {
  const extraNights = b.extraNightsBefore + b.extraNightsAfter
  const outstanding = Math.max(0, b.totalAmount - b.paidAmount)
  const retreatCost = b.totalAmount - b.extraNightsCost + b.discountAmt

  return (
    <div style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--line)', padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
      {/* Occupants */}
      <div>
        <SectionLabel>Who&apos;s coming</SectionLabel>
        {b.occupants.map((o, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 14 }}>{o.role === 'Infant' ? '👶' : o.role.startsWith('Child') ? '🧒' : '👤'}</span>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: o.role === 'Lead' ? 600 : 400, color: 'var(--ink)' }}>{o.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {o.role === 'Lead' ? 'Lead · ' : ''}{calcAge(o.dob)} yrs · {o.gender === 'M' ? 'Male' : 'Female'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cost */}
      <div>
        <SectionLabel>Cost breakdown</SectionLabel>
        <div style={{ fontSize: 12.5 }}>
          <BRow label="Retreat (4 nights)" value={fmt(retreatCost)} />
          {b.extraNightsCost > 0 && <BRow label={`Extra nights (${extraNights})`} value={`+${fmt(b.extraNightsCost)}`} />}
          {b.discountCode && b.discountAmt > 0 && <BRow label={`Discount (${b.discountCode})`} value={`−${fmt(b.discountAmt)}`} green />}
          <div style={{ borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span style={{ color: 'var(--ink)' }}>Total</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>{fmt(b.totalAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', fontWeight: 500, marginTop: 4 }}>
            <span>Paid</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(b.paidAmount)}</span>
          </div>
          {outstanding > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--warning)', fontWeight: 500 }}>
              <span>Outstanding</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(outstanding)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Instalments */}
      <div>
        <SectionLabel>{b.plan === 'INSTALMENT' ? 'Payment schedule' : 'Payment'}</SectionLabel>
        {b.instalments.length === 0
          ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>No schedule</div>
          : b.instalments.map(ins => {
            const paid = ins.status === 'paid'
            return (
              <div key={ins.number} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7, fontSize: 12 }}>
                <div>
                  <div style={{ color: 'var(--ink)', fontWeight: 500 }}>{ins.label}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 11 }}>
                    {paid ? `Paid ${ins.paidAt ? fmtDateShort(ins.paidAt) : ''}` : `Due ${fmtDateShort(ins.dueDate)}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}>{fmt(ins.amount)}</div>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, fontWeight: 600, background: paid ? 'var(--success-soft)' : 'var(--warning-soft)', color: paid ? 'var(--success)' : 'var(--warning)' }}>
                    {paid ? 'Paid' : ins.status}
                  </span>
                </div>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}

function BRow({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ color: green ? 'var(--success)' : 'var(--muted)' }}>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', color: green ? 'var(--success)' : 'var(--ink)' }}>{value}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'attendees' | 'bookings' | 'finance' | 'checkin' | 'transfers' | 'email' | 'waitlist' | 'discounts' | 'config'

interface NavItem { id: Tab; label: string; icon: React.ReactNode; badge?: number }

function NavBtn({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, width: '100%',
        padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
        background: active ? SB.activeBg : 'transparent',
        color: active ? SB.activeText : SB.text,
        fontSize: 12.5, fontWeight: active ? 500 : 400,
        textAlign: 'left', marginBottom: 1,
      }}
    >
      <span style={{ opacity: active ? 1 : 0.55, flexShrink: 0 }}>{item.icon}</span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {!!item.badge && (
        <span style={{ background: SB.badge, color: SB.gold, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, fontVariantNumeric: 'tabular-nums' }}>
          {item.badge}
        </span>
      )}
    </button>
  )
}

function Sidebar({ active, setActive, data }: { active: Tab; setActive: (t: Tab) => void; data: AdminData }) {
  const { stats, bookings } = data

  const overview: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard',  icon: <IconGrid /> },
    { id: 'attendees', label: 'Attendees',  icon: <IconUsers />, badge: stats.totalGuests },
    { id: 'bookings',  label: 'Bookings',   icon: <IconList />,  badge: stats.activeBookings },
  ]
  const operations: NavItem[] = [
    { id: 'finance',   label: 'Payments',        icon: <IconCard /> },
    { id: 'checkin',   label: 'Check-In',         icon: <IconClock /> },
    { id: 'transfers', label: 'Transfers',         icon: <IconPin /> },
    { id: 'email',     label: 'Email Campaigns',   icon: <IconMail /> },
    { id: 'waitlist',  label: 'Waitlist',           icon: <IconRows /> },
  ]
  const settings: NavItem[] = [
    { id: 'discounts', label: 'Discounts',         icon: <IconShield /> },
    { id: 'config',    label: 'Retreat Config',     icon: <IconSettings /> },
  ]

  // suppress unused warning
  void bookings

  function Group({ label, items }: { label: string; items: NavItem[] }) {
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: SB.textDim, padding: '0 14px', marginBottom: 4 }}>
          {label}
        </div>
        {items.map(item => <NavBtn key={item.id} item={item} active={active === item.id} onClick={() => setActive(item.id)} />)}
      </div>
    )
  }

  return (
    <div style={{ width: 218, flexShrink: 0, background: SB.bg, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${SB.border}`, overflow: 'hidden' }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: `1px solid ${SB.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Light Upon Light</div>
        <div style={{ fontSize: 9, color: SB.gold, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 3 }}>Admin Portal</div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '16px 8px', overflowY: 'auto' }}>
        <Group label="Overview"   items={overview} />
        <Group label="Operations" items={operations} />
        <Group label="Settings"   items={settings} />
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${SB.border}`, padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: SB.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: SB.gold, flexShrink: 0 }}>
            AD
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>Admin</div>
            <div style={{ fontSize: 10, color: SB.textDim, fontFamily: 'monospace' }}>Super Admin</div>
          </div>
          <Link href="/dashboard" style={{ fontSize: 10, color: SB.textDim, textDecoration: 'none', padding: '3px 7px', border: `1px solid ${SB.border}`, borderRadius: 4, flexShrink: 0 }}>
            ← User
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function DashboardScreen({ data }: { data: AdminData }) {
  const { stats, rooms, bookings } = data
  const recent = bookings.slice(0, 5)
  const totalBooked = rooms.reduce((s, r) => s + r.booked, 0)
  const totalRooms  = rooms.reduce((s, r) => s + r.total, 0)
  const occPct = totalRooms > 0 ? Math.round((totalBooked / totalRooms) * 100) : 0

  const months      = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']
  const barHeights  = [12,    22,    18,    38,    52,    68,    78,    88,    96   ]

  return (
    <div>
      <ScreenHeader
        eyebrow="Bismillah · Turkey Retreat 2027"
        title="Admin" em="Dashboard"
        sub={`${stats.activeBookings} confirmed · ${stats.totalGuests} guests · ${occPct}% room occupancy`}
        actions={
          <>
            <button className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
              <IconDownload /> Export CSV
            </button>
            <button className="btn btn-primary btn-sm" style={{ fontSize: 12 }}>+ New Booking</button>
          </>
        }
      />
      <div style={{ padding: '24px 28px' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <StatCard icon="£"  label="Total Revenue"          value={fmt(stats.totalRevenue)}    change={`${fmt(stats.totalPaid)} collected`} />
          <StatCard icon="🕌" label="Bookings Confirmed"     value={String(stats.activeBookings)} change={`${stats.totalGuests} attendees`} />
          <StatCard icon="⚡" label="Outstanding Balance"    value={fmt(stats.totalOutstanding)} change={stats.totalOutstanding > 0 ? `${stats.depositOnly + stats.partiallyPaid} pending` : 'All clear'} changeDown={stats.totalOutstanding > 0} />
          <StatCard icon="🛏" label="Room Occupancy"         value={`${occPct}%`}               change={`${totalBooked}/${totalRooms} rooms`} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

          {/* Recent bookings */}
          <div>
            <SectionLabel>Recent Bookings</SectionLabel>
            <Card>
              <CardHead title="Latest Registrations" right={<button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 8px' }}>View all</button>} />
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    {['Name', 'Room', 'Total', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((b, i) => (
                    <tr key={b.id} style={{ borderBottom: i < recent.length - 1 ? '1px solid var(--line)' : 'none' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{b.guestName}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.guestEmail}</div>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12.5, color: 'var(--ink)' }}>{b.roomName}</td>
                      <td style={{ padding: '10px 16px', fontFamily: 'Cormorant Garamond, serif', fontSize: 16, color: 'var(--gold-deep)', fontWeight: 300 }}>{fmt(b.totalAmount)}</td>
                      <td style={{ padding: '10px 16px' }}><StatusPill status={b.status} /></td>
                      <td style={{ padding: '10px 16px' }}>
                        <Link href={`/booking/${b.ref}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 8px', textDecoration: 'none' }}>View</Link>
                      </td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No bookings yet</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Revenue trend */}
            <div>
              <SectionLabel>Revenue Trend</SectionLabel>
              <Card>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Monthly Intake</span>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, color: 'var(--gold-deep)', fontWeight: 300 }}>{fmt(stats.totalRevenue)}</span>
                </div>
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 72 }}>
                    {months.map((m, i) => (
                      <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ flex: 1 }} />
                        <div style={{ height: `${barHeights[i]}%`, minHeight: 3, borderRadius: '3px 3px 0 0', background: i >= months.length - 2 ? 'var(--gold-deep)' : 'var(--line-2)' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                    {months.map((m, i) => (
                      <div key={m} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: i >= months.length - 2 ? 'var(--gold-deep)' : 'var(--muted-2)', fontFamily: 'monospace' }}>{m}</div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Room availability */}
            <div>
              <SectionLabel>Room Availability</SectionLabel>
              <Card style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {rooms.map(r => <RoomBar key={r.id} name={r.name} booked={r.booked} total={r.total} isSeaview={r.isSeaview} />)}
                </div>
              </Card>
            </div>

            {/* Payment status */}
            <div>
              <SectionLabel>Payment Status</SectionLabel>
              <Card style={{ padding: '14px 16px' }}>
                {[
                  { label: 'Fully paid',     count: stats.fullyPaid,     cls: 'pill-success' },
                  { label: 'Deposit paid',   count: stats.depositOnly,   cls: 'pill-warning' },
                  { label: 'Partially paid', count: stats.partiallyPaid, cls: 'pill-info'    },
                  { label: 'Cancelled',      count: stats.cancelled,     cls: 'pill-muted'   },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span className={`pill ${s.cls}`} style={{ fontSize: 10.5 }}>{s.label}</span>
                    <span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>{s.count}</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: BOOKINGS
// ─────────────────────────────────────────────────────────────────────────────
function BookingsScreen({ bookings, stats }: { bookings: AdminBooking[]; stats: AdminData['stats'] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('ALL')

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase()
    const matchQ = !search || b.ref.toLowerCase().includes(q) || b.guestName.toLowerCase().includes(q) || b.guestEmail.toLowerCase().includes(q) || b.roomName.toLowerCase().includes(q)
    const matchF = filter === 'ALL' || b.status === filter
    return matchQ && matchF
  })

  return (
    <div>
      <ScreenHeader
        eyebrow="Management"
        title="Booking" em="Management"
        sub={`${stats.activeBookings} confirmed · ${stats.depositOnly + stats.partiallyPaid} with outstanding balance`}
        actions={
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)' }}>
              <IconSearch />
              <input type="text" placeholder="Search by name, ref, email…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: 'var(--ink)', width: 200 }} />
            </div>
            <button className="btn btn-primary btn-sm" style={{ fontSize: 12 }}>+ Manual Booking</button>
          </>
        }
      />
      <div style={{ padding: '20px 28px' }}>
        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'ALL',            label: `All (${stats.activeBookings})` },
            { id: 'FULLY_PAID',     label: `Paid (${stats.fullyPaid})` },
            { id: 'PARTIALLY_PAID', label: `Partial (${stats.partiallyPaid})` },
            { id: 'DEPOSIT_ONLY',   label: `Deposit (${stats.depositOnly})` },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '5px 12px', fontSize: 11.5, fontWeight: filter === f.id ? 600 : 400,
              border: `1px solid ${filter === f.id ? 'var(--ink)' : 'var(--line)'}`,
              borderRadius: 99, background: filter === f.id ? 'var(--ink)' : 'var(--surface)',
              color: filter === f.id ? '#fff' : 'var(--muted)', cursor: 'pointer',
            }}>{f.label}</button>
          ))}
          <span style={{ fontSize: 12, color: 'var(--muted-2)', marginLeft: 4 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <Card>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 170px 140px 80px 110px 110px 32px', padding: '9px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            <div>Attendee</div><div>Room</div><div>Status</div><div>Plan</div>
            <div style={{ textAlign: 'right' }}>Total</div>
            <div style={{ textAlign: 'right' }}>Paid</div>
            <div />
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>No bookings match your filter</div>
          ) : filtered.map((b, i) => {
            const open = expandedId === b.id
            const outstanding = Math.max(0, b.totalAmount - b.paidAmount)
            return (
              <div key={b.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <div
                  onClick={() => setExpandedId(open ? null : b.id)}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 170px 140px 80px 110px 110px 32px', padding: '12px 20px', alignItems: 'center', cursor: 'pointer', background: open ? 'oklch(0.985 0.012 85)' : 'transparent' }}
                >
                  {/* Attendee */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--gold-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--gold-deep)', flexShrink: 0 }}>
                      {initials(b.guestName)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{b.guestName}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.guestEmail} · {partyLine(b)}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted-2)', marginTop: 1 }}>
                        <span className="mono" style={{ letterSpacing: '0.04em' }}>{b.ref}</span> · {fmtDate(b.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>{b.roomName}</div>
                  <div><StatusPill status={b.status} /></div>
                  <div><span className="pill pill-muted" style={{ fontSize: 10 }}>{b.plan === 'FULL' ? 'Full' : '4 inst.'}</span></div>
                  <div style={{ textAlign: 'right', fontFamily: 'Cormorant Garamond, serif', fontSize: 16, color: 'var(--gold-deep)', fontWeight: 300 }}>{fmt(b.totalAmount)}</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, color: b.paidAmount >= b.totalAmount ? 'var(--success)' : 'var(--ink)', fontWeight: 300 }}>{fmt(b.paidAmount)}</div>
                    {outstanding > 0 && <div style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 600 }}>−{fmt(outstanding)}</div>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--muted-2)' }}><IconChevron open={open} /></div>
                </div>
                {open && <BookingExpanded b={b} />}
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: FINANCE
// ─────────────────────────────────────────────────────────────────────────────
function FinanceScreen({ data }: { data: AdminData }) {
  const { stats, bookings } = data
  const now = new Date()

  type UpcomingItem = { guestName: string; ref: string; label: string; dueDate: string; amount: number; status: string }
  const upcoming: UpcomingItem[] = bookings
    .flatMap(b => b.instalments
      .filter(i => i.status !== 'paid' && new Date(i.dueDate) >= now)
      .map(i => ({ guestName: b.guestName, ref: b.ref, label: i.label, dueDate: i.dueDate, amount: i.amount, status: i.status }))
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 8)

  type OverdueItem = UpcomingItem
  const overdue: OverdueItem[] = bookings
    .flatMap(b => b.instalments
      .filter(i => i.status !== 'paid' && new Date(i.dueDate) < now)
      .map(i => ({ guestName: b.guestName, ref: b.ref, label: i.label, dueDate: i.dueDate, amount: i.amount, status: i.status }))
    )

  return (
    <div>
      <ScreenHeader
        eyebrow="Financial Operations"
        title="Finance" em="Overview"
        sub="Stripe · BACS · Cash · Instalments"
        actions={
          <>
            <button className="btn btn-sm" style={{ fontSize: 12 }}>Export PDF</button>
            <button className="btn btn-primary btn-sm" style={{ fontSize: 12 }}>Issue Refund</button>
          </>
        }
      />
      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <StatCard icon="£"  label="Total Collected"     value={fmt(stats.totalPaid)}         change="Stripe + BACS + Cash" />
          <StatCard icon="📅" label="Outstanding Balance" value={fmt(stats.totalOutstanding)}   change={`${stats.depositOnly + stats.partiallyPaid} active instalments`} changeDown={stats.totalOutstanding > 0} />
          <StatCard icon="↩"  label="Refunds Issued"      value="£0.00"                         change="No refunds yet" />
          <StatCard icon="✈"  label="Transfer Revenue"    value="£0.00"                         change="Transfers not yet configured" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Upcoming */}
          <div>
            <SectionLabel>Upcoming Instalment Charges</SectionLabel>
            <Card>
              <CardHead title="Auto-Charge Schedule" right={<span className="pill pill-warning" style={{ fontSize: 10 }}>{upcoming.length} pending</span>} />
              {upcoming.length === 0
                ? <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No upcoming charges</div>
                : upcoming.map((ins, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: i < upcoming.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{ins.guestName}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{ins.label} · Due {fmtDate(ins.dueDate)}</div>
                      <span className="pill pill-warning" style={{ fontSize: 10 }}>Pending</span>
                    </div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: 'var(--gold-deep)', fontWeight: 300 }}>{fmt(ins.amount)}</div>
                  </div>
                ))
              }
            </Card>
          </div>

          {/* Overdue */}
          <div>
            <SectionLabel>Failed Payments & Alerts</SectionLabel>
            <Card>
              <CardHead
                title={overdue.length > 0 ? <span style={{ color: 'var(--danger)' }}>⚠ Requires Attention</span> : '✓ All payments on track'}
                right={overdue.length > 0 ? <span className="pill pill-danger" style={{ fontSize: 10 }}>{overdue.length} overdue</span> : undefined}
              />
              {overdue.length === 0
                ? <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No overdue payments 🎉</div>
                : overdue.map((ins, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: i < overdue.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{ins.guestName}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{ins.label} · Was due {fmtDateShort(ins.dueDate)}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" style={{ fontSize: 11, padding: '3px 8px' }}>Retry</button>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 8px' }}>Send Email</button>
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: 'var(--danger)', fontWeight: 300 }}>{fmt(ins.amount)}</div>
                  </div>
                ))
              }
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: ATTENDEES
// ─────────────────────────────────────────────────────────────────────────────
function AttendeesScreen({ bookings }: { bookings: AdminBooking[] }) {
  const [search, setSearch] = useState('')
  const guests = bookings.flatMap(b => b.occupants.map(o => ({ ...o, ref: b.ref, roomName: b.roomName, email: b.guestEmail })))
  const shown  = guests.filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.ref.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <ScreenHeader
        eyebrow="Overview"
        title="All" em="Attendees"
        sub={`${guests.length} registered guests across ${bookings.length} bookings`}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)' }}>
            <IconSearch />
            <input type="text" placeholder="Search attendees…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: 'var(--ink)', width: 180 }} />
          </div>
        }
      />
      <div style={{ padding: '20px 28px' }}>
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 90px 60px 120px', padding: '9px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            <div>Name</div><div>Room</div><div>Role</div><div>Age</div><div>Booking Ref</div>
          </div>
          {shown.length === 0
            ? <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No attendees found</div>
            : shown.map((g, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 90px 60px 120px', padding: '10px 16px', borderBottom: i < shown.length - 1 ? '1px solid var(--line)' : 'none', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{g.email} · {g.gender === 'M' ? 'Male' : 'Female'}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink)' }}>{g.roomName}</div>
                <div><span className="pill pill-muted" style={{ fontSize: 10 }}>{g.role}</span></div>
                <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>{calcAge(g.dob)}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em' }}>{g.ref}</div>
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: CHECK-IN
// ─────────────────────────────────────────────────────────────────────────────
function CheckInScreen({ bookings }: { bookings: AdminBooking[] }) {
  const [filter, setFilter] = useState('ALL')
  const active = bookings.filter(b => b.status !== 'CANCELLED')
  const shown  = filter === 'ALL' ? active : active.filter(b => b.status === filter)

  return (
    <div>
      <ScreenHeader
        eyebrow="Arrivals"
        title="Check-In" em="Scanner"
        sub={`${active.length} confirmed attendees · Retreat: 30 March 2027`}
        actions={
          <>
            <button className="btn btn-sm" style={{ fontSize: 12 }}>Print Manifest</button>
            <button className="btn btn-primary btn-sm" style={{ fontSize: 12 }}>📷 Scan QR</button>
          </>
        }
      />
      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 270px', gap: 20 }}>
          <div>
            <div style={{ background: 'oklch(0.96 0.035 85)', border: '1px solid oklch(0.88 0.06 85)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: 'var(--gold-deep)' }}>
              <span>🕌</span>
              <div>Retreat begins <strong>30 March 2027</strong>. {active.length} attendees confirmed.</div>
            </div>
            <SectionLabel>Arrivals List</SectionLabel>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[
                { id: 'ALL',            label: `All (${active.length})` },
                { id: 'FULLY_PAID',     label: `Paid (${bookings.filter(b=>b.status==='FULLY_PAID').length})` },
                { id: 'DEPOSIT_ONLY',   label: `Deposit (${bookings.filter(b=>b.status==='DEPOSIT_ONLY').length})` },
                { id: 'PARTIALLY_PAID', label: `Partial (${bookings.filter(b=>b.status==='PARTIALLY_PAID').length})` },
              ].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: '4px 11px', fontSize: 11.5, fontWeight: filter===f.id?600:400, border: `1px solid ${filter===f.id?'var(--ink)':'var(--line)'}`, borderRadius: 99, background: filter===f.id?'var(--ink)':'var(--surface)', color: filter===f.id?'#fff':'var(--muted)', cursor: 'pointer' }}>
                  {f.label}
                </button>
              ))}
            </div>
            <Card>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    {['Name', 'Room', 'Party', 'Balance', 'Check-In'].map(h => (
                      <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.length === 0
                    ? <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No attendees</td></tr>
                    : shown.map((b, i) => {
                      const outstanding = Math.max(0, b.totalAmount - b.paidAmount)
                      return (
                        <tr key={b.id} style={{ borderBottom: i < shown.length - 1 ? '1px solid var(--line)' : 'none' }}>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{b.guestName}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.guestEmail}</div>
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: 12.5, color: 'var(--ink)' }}>{b.roomName}</td>
                          <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--muted)' }}>{partyLine(b)}</td>
                          <td style={{ padding: '10px 16px' }}>
                            {outstanding > 0
                              ? <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>{fmt(outstanding)}</span>
                              : <span className="pill pill-success" style={{ fontSize: 10 }}>Cleared</span>
                            }
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <button className="btn btn-sm" style={{ fontSize: 11, padding: '4px 10px' }}>Check In</button>
                          </td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <SectionLabel>QR Check-In</SectionLabel>
              <Card>
                <CardHead title="Scan Attendee QR" />
                <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                  <div style={{ width: 110, height: 110, border: '2px dashed var(--line-2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 32 }}>📷</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Position attendee QR code in frame</div>
                  <button className="btn btn-primary" style={{ width: '100%', fontSize: 13 }}>Open Camera</button>
                </div>
              </Card>
            </div>
            <div>
              <SectionLabel>Check-In Summary</SectionLabel>
              <Card style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink)' }}>Checked In</span>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, color: 'var(--success)', fontWeight: 300 }}>0</span>
                </div>
                <div className="progress" style={{ marginBottom: 10 }}><div className="progress-fill" style={{ width: '0%' }} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                  <span>0 of {active.length} arrived</span>
                  <span>{active.length} expected</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: TRANSFERS
// ─────────────────────────────────────────────────────────────────────────────
function TransfersScreen() {
  const groups = [
    { label: '30 Mar · 10:00–12:00', airport: 'LHR Terminal 3', status: 'Pending' },
    { label: '30 Mar · 13:30–15:00', airport: 'LHR Terminal 5', status: 'Pending' },
    { label: '30 Mar · 15:30–18:00', airport: 'MAN + BHX',      status: 'Pending' },
  ]
  return (
    <div>
      <ScreenHeader
        eyebrow="Airport Transfers"
        title="Transfer" em="Management"
        sub="Arrival groups · Driver assignments · Flight details"
        actions={
          <>
            <button className="btn btn-sm" style={{ fontSize: 12 }}>Export Manifest</button>
            <button className="btn btn-primary btn-sm" style={{ fontSize: 12 }}>Assign Driver</button>
          </>
        }
      />
      <div style={{ padding: '24px 28px' }}>
        <div style={{ background: 'oklch(0.96 0.035 85)', border: '1px solid oklch(0.88 0.06 85)', borderRadius: 'var(--radius)', padding: '14px 18px', fontSize: 13, color: 'var(--gold-deep)', marginBottom: 20 }}>
          ℹ Transfer groups will populate once attendees submit flight details. Configure transfer options in <strong>Retreat Config</strong>.
        </div>
        <SectionLabel>Transfer Groups by Arrival Window</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groups.map((g, i) => (
            <Card key={i}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Group {String.fromCharCode(65 + i)} — {g.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{g.airport}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="pill pill-muted" style={{ fontSize: 10 }}>{g.status}</span>
                  <button className="btn btn-sm" style={{ fontSize: 11, padding: '4px 10px' }}>Plan</button>
                </div>
              </div>
              <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>No attendees assigned to this window yet. Flight details not yet collected.</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: EMAIL CAMPAIGNS
// ─────────────────────────────────────────────────────────────────────────────
function EmailScreen({ stats }: { stats: AdminData['stats'] }) {
  const [name, setName]         = useState('')
  const [audience, setAudience] = useState('all')
  const [body, setBody]         = useState('')

  return (
    <div>
      <ScreenHeader
        eyebrow="Communications"
        title="Email" em="Campaigns"
        sub="Bulk, automated & transactional emails"
        actions={<button className="btn btn-primary btn-sm" style={{ fontSize: 12 }}>+ New Campaign</button>}
      />
      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Builder */}
          <div>
            <SectionLabel>Campaign Builder</SectionLabel>
            <Card>
              <CardHead title="New Campaign" />
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Campaign Name</span>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pre-Retreat Reminder — 30 Days"
                    style={{ padding: '8px 12px', border: '1px solid var(--line-2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', outline: 'none' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Target Audience</span>
                  <select value={audience} onChange={e => setAudience(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid var(--line-2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', outline: 'none' }}>
                    <option value="all">All confirmed attendees ({stats.activeBookings})</option>
                    <option value="overdue">Overdue payments only</option>
                    <option value="deposit">Deposit only ({stats.depositOnly})</option>
                    <option value="partial">Partially paid ({stats.partiallyPaid})</option>
                    <option value="paid">Fully paid ({stats.fullyPaid})</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Message Body</span>
                  <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message here…" rows={7}
                    style={{ padding: '8px 12px', border: '1px solid var(--line-2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm" style={{ fontSize: 12 }}>Save Draft</button>
                  <button className="btn btn-primary btn-sm" style={{ fontSize: 12 }}>Send Campaign</button>
                </div>
              </div>
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Sent campaigns */}
            <div>
              <SectionLabel>Sent Campaigns</SectionLabel>
              <Card>
                <CardHead title="History" />
                <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  <div style={{ fontSize: 26, marginBottom: 8 }}>✉️</div>
                  No campaigns sent yet.<br />
                  <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>Sent campaigns will appear here.</span>
                </div>
              </Card>
            </div>

            {/* Templates */}
            <div>
              <SectionLabel>Quick Templates</SectionLabel>
              <Card style={{ padding: '14px 16px' }}>
                {[
                  { name: 'Payment Reminder',     desc: 'Chase outstanding instalments' },
                  { name: 'Pre-Retreat Pack',      desc: 'What to bring, itinerary, FAQs' },
                  { name: 'Welcome Email',         desc: 'Confirmation + next steps' },
                  { name: 'Check-In Instructions', desc: 'Arrival, room key, schedule' },
                ].map((t, i, arr) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.desc}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>Use</button>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: COMING SOON
// ─────────────────────────────────────────────────────────────────────────────
function ComingSoon({ eyebrow, title, em }: { eyebrow: string; title: string; em: string }) {
  return (
    <div>
      <ScreenHeader eyebrow={eyebrow} title={title} em={em} sub="This section is coming soon" />
      <div style={{ padding: '60px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{title} {em}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Under construction — available soon.</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT: AdminView
// ─────────────────────────────────────────────────────────────────────────────
export function AdminView({ data }: { data: AdminData }) {
  const [tab, setTab] = useState<Tab>('dashboard')

  function screen() {
    switch (tab) {
      case 'dashboard':  return <DashboardScreen data={data} />
      case 'attendees':  return <AttendeesScreen bookings={data.bookings} />
      case 'bookings':   return <BookingsScreen bookings={data.bookings} stats={data.stats} />
      case 'finance':    return <FinanceScreen data={data} />
      case 'checkin':    return <CheckInScreen bookings={data.bookings} />
      case 'transfers':  return <TransfersScreen />
      case 'email':      return <EmailScreen stats={data.stats} />
      case 'waitlist':   return <ComingSoon eyebrow="Operations" title="Waitlist" em="Management" />
      case 'discounts':  return <ComingSoon eyebrow="Settings" title="Discounts &" em="Scholarships" />
      case 'config':     return <ComingSoon eyebrow="Settings" title="Retreat" em="Configuration" />
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar active={tab} setActive={setTab} data={data} />
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: 'var(--bg)' }}>
        {screen()}
      </div>
    </div>
  )
}
