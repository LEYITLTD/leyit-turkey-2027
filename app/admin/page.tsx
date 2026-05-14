import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const session = await getSession()

  if (!session) redirect('/login')
  if (session.user.role === 'CUSTOMER') redirect('/my-booking')

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Admin dashboard</p>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>Coming in Phase 3 — foundation is ready.</p>
    </div>
  )
}
