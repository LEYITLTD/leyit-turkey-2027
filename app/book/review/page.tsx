import { getAvailableRooms } from '@/app/actions/booking-data'
import { ReviewStep } from '@/components/booking/ReviewStep'

export const metadata = {
  title: 'Review & Pay — Light Upon Light Turkey Retreat 2027',
}

export const dynamic = 'force-dynamic'

export default async function ReviewPage() {
  const rooms = await getAvailableRooms()
  return <ReviewStep rooms={rooms} />
}
