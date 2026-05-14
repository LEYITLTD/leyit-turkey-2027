import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user) return null

        const passwordMatch = await bcrypt.compare(credentials.password, user.password)
        if (!passwordMatch) return null

        return {
          id:        user.id,
          email:     user.email,
          name:      user.name,
          role:      user.role,
          adminRole: user.adminRole ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id        = user.id
        token.role      = (user as any).role
        token.adminRole = (user as any).adminRole
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id        = token.id as string
        session.user.role      = token.role as string
        session.user.adminRole = token.adminRole as string | undefined
      }
      return session
    },
  },
}

export const getSession = () => getServerSession(authOptions)
