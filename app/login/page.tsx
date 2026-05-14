import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in — Light Upon Light Turkey 2027',
}

export default async function LoginPage() {
  const session = await getSession()

  if (session) {
    const role = session.user.role
    if (role === 'ADMIN')    redirect('/admin')
    if (role === 'CUSTOMER') redirect('/my-booking')
    if (role === 'BOTH')     redirect('/role-select')
  }

  return <LoginForm />
}
