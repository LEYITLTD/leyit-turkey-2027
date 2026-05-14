import { redirect } from 'next/navigation'
import { getToken } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import { getAdminData } from '@/app/actions/get-admin-data'
import { AdminView } from '@/components/admin/AdminView'

export const dynamic = 'force-dynamic'

export function generateMetadata() {
  return { title: 'Admin — Light Upon Light Turkey Retreat 2027' }
}

export default async function AdminPage() {
  const cookieStore = await cookies()
  const token = await getToken({
    req:    { cookies: Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value])) } as any,
    secret: process.env.NEXTAUTH_SECRET ?? '',
  })

  // Must be signed in with ADMIN or BOTH role
  if (!token?.sub) redirect('/auth/signin')
  const role = token.role as string | undefined
  if (role !== 'ADMIN' && role !== 'BOTH') redirect('/dashboard')

  const data = await getAdminData()

  return <AdminView data={data} />
}
