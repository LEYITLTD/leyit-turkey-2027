import { redirect } from 'next/navigation'
import { getToken } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import { getBookingDetail } from '@/app/actions/get-booking-detail'
import { BookingDetailView } from '@/components/booking-detail/BookingDetailView'

export const dynamic = 'force-dynamic'

export function generateMetadata() {
  return { title: 'My Booking — Light Upon Light Turkey Retreat 2027' }
}

interface Props {
  params: { ref: string }
}

export default async function BookingDetailPage({ params }: Props) {
  const cookieStore = await cookies()
  const token = await getToken({
    req:    { cookies: Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value])) } as any,
    secret: process.env.NEXTAUTH_SECRET ?? '',
  })
  if (!token?.sub) redirect('/auth/signin')

  const booking = await getBookingDetail(params.ref)
  if (!booking) redirect('/dashboard')

  return <BookingDetailView booking={booking} />
}
