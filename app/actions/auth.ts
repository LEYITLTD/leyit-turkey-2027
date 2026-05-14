'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function createAccount({
  email,
  password,
  phone,
  name,
}: {
  email:    string
  password: string
  phone:    string
  name:     string
}) {
  const normalised = email.trim().toLowerCase()

  const existing = await prisma.user.findUnique({ where: { email: normalised } })
  if (existing) {
    return { ok: false as const, error: 'An account with this email already exists. Please sign in instead.' }
  }

  if (password.length < 8) {
    return { ok: false as const, error: 'Password must be at least 8 characters.' }
  }

  const hashed = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: {
      email:    normalised,
      password: hashed,
      name:     name.trim(),
      phone:    phone.trim(),
      role:     'CUSTOMER',
    },
  })

  return { ok: true as const }
}
