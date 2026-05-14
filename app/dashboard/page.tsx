import { redirect } from 'next/navigation'
import { getToken } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import { getMyBookings } from '@/app/actions/get-my-bookings'
import { DashboardView } from '@/components/dashboard/DashboardView'

export const dynamic = 'force-dynamic'

export function generateMetadata() {
  return { title: 'My Bookings — Light Upon Light Turkey Retreat 2027' }
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = await getToken({
    req:    { cookies: Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value])) } as any,
    secret: process.env.NEXTAUTH_SECRET ?? '',
  })
  if (!token?.sub) redirect('/auth/signin')

  const bookings = await getMyBookings()

  return <DashboardView bookings={bookings} userName={token.name as string ?? ''} />
}
