import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import RolePicker from '@/components/auth/RolePicker'

export default async function RoleSelectPage() {
  const session = await getSession()

  if (!session)              redirect('/login')
  if (session.user.role !== 'BOTH') redirect('/login')

  return <RolePicker />
}
