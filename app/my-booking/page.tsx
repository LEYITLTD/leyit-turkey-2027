import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function MyBookingPage() {
  const session = await getSession()

  if (!session) redirect('/login')

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>My booking</p>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>Coming in Phase 5 — foundation is ready.</p>
    </div>
  )
}
