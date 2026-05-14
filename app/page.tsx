import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Home() {
  const session = await getSession()

  if (!session) redirect('/login')

  const role = session.user.role
  if (role === 'ADMIN')    redirect('/admin')
  if (role === 'CUSTOMER') redirect('/my-booking')
  if (role === 'BOTH')     redirect('/role-select')

  redirect('/login')
}
