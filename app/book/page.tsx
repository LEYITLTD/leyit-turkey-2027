import { getAvailableRooms } from '@/app/actions/booking-data'
import { RoomPartyStep } from '@/components/booking/RoomPartyStep'

export const dynamic = 'force-dynamic'   // always fetch fresh inventory

export default async function BookPage() {
  const rooms = await getAvailableRooms()
  return <RoomPartyStep rooms={rooms} />
}
