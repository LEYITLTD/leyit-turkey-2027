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
  params:       { ref: string }
  searchParams: { paid?: string; redirect_status?: string }
}

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const booking = await getBookingConfirmation(params.ref)
  if (!booking) redirect('/book')

  // paid=true  → came from successful confirmPayment on-page
  // redirect_status=succeeded → came back from a 3DS redirect
  const justPaid =
    searchParams.paid === 'true' ||
    searchParams.redirect_status === 'succeeded'

  return <ConfirmationView booking={booking} justPaid={justPaid} />
}
