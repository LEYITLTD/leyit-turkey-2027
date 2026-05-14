import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBookingConfirmation } from '@/app/actions/get-booking'
import { ConfirmationView } from '@/components/booking/ConfirmationView'

export const dynamic = 'force-dynamic'

export function generateMetadata() {
  return { title: 'Booking Confirmed — Light Upon Light Turkey Retreat 2027' }
}

interface Props {
  params:      { ref: string }
  searchParams: { session_id?: string }
}

export default async function ConfirmationPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const booking = await getBookingConfirmation(params.ref)
  if (!booking) redirect('/book')

  return <ConfirmationView booking={booking} />
}
