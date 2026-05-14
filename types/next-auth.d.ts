import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id:        string
      role:      string
      adminRole?: string
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role:      string
    adminRole?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id:        string
    role:      string
    adminRole?: string
  }
}
