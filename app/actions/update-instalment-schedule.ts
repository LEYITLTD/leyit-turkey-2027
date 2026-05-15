'use server'

import { getToken } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { validateInstalmentSchedule } from '@/lib/pricing'

export interface InstalmentEdit {
  id:      string
  amount:  number   // pence
  dueDate: string   // ISO date string, e.g. '2025-07-15'
}

export type UpdateScheduleResult =
  | { ok: true }
  | { ok: false; errors: string[] }

/**
 * Admin-only action to edit the amount and/or due date of any unpaid instalment.
 *
 * Rules enforced:
 *  - Caller must have ADMIN or BOTH role
 *  - Only unpaid (non-'paid') instalments may be edited
 *  - After editing, amounts must still sum exactly to booking.totalAmount
 *  - Due dates must remain in ascending order (no instalment before the previous)
 *
 * The cron job picks up whatever dueDate is in the DB, so changes take effect
 * at the next cron run automatically.
 */
export async function updateInstalmentSchedule(
  bookingId: string,
  edits:     InstalmentEdit[],
): Promise<UpdateScheduleResult> {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const token = await getToken({
    req:    { cookies: Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value])) } as any,
    secret: process.env.NEXTAUTH_SECRET ?? '',
  })
  const role = token?.role as string | undefined
  if (role !== 'ADMIN' && role !== 'BOTH') {
    return { ok: false, errors: ['Unauthorised.'] }
  }

  // ── Load booking + full schedule ─────────────────────────────────────────────
  const booking = await prisma.booking.findUnique({
    where:   { id: bookingId },
    include: { instalmentSchedules: { orderBy: { number: 'asc' } } },
  })
  if (!booking) return { ok: false, errors: ['Booking not found.'] }

  // ── Merge: apply edits over the full schedule ────────────────────────────────
  const editMap = new Map(edits.map(e => [e.id, e]))

  const merged = booking.instalmentSchedules.map(s => {
    const edit = editMap.get(s.id)
    if (!edit) return s
    if (s.status === 'paid') return s   // paid instalments are immutable
    return { ...s, amount: edit.amount, dueDate: new Date(edit.dueDate) }
  })

  // ── Validate ─────────────────────────────────────────────────────────────────
  const validationErrors = validateInstalmentSchedule(
    merged.map(s => ({ number: s.number, label: s.label, amount: s.amount, dueDate: s.dueDate })),
    booking.totalAmount,
  )
  if (validationErrors.length > 0) return { ok: false, errors: validationErrors }

  // ── Persist ──────────────────────────────────────────────────────────────────
  const previousState = booking.instalmentSchedules.map(s => ({
    id: s.id, number: s.number, amount: s.amount, dueDate: s.dueDate.toISOString(), status: s.status,
  }))

  await prisma.$transaction(async (tx) => {
    for (const s of merged) {
      const edit = editMap.get(s.id)
      if (!edit || s.status === 'paid') continue

      await tx.instalmentSchedule.update({
        where: { id: s.id },
        data:  {
          amount:  edit.amount,
          dueDate: new Date(edit.dueDate),
          // If a 'failed' or 'action_required' instalment has its date pushed out,
          // reset it to 'scheduled' so the cron picks it up again.
          ...(s.status !== 'scheduled' && s.status !== 'processing'
            ? { status: 'scheduled' }
            : {}),
        },
      })
    }

    await tx.auditLog.create({
      data: {
        bookingId:     booking.id,
        action:        'INSTALMENT_SCHEDULE_EDITED',
        actor:         token!.email as string ?? token!.sub as string,
        previousState: previousState as any,
        newState:      merged.map(s => ({
          id: s.id, number: s.number, amount: s.amount, dueDate: s.dueDate.toISOString(),
        })) as any,
      },
    })
  })

  return { ok: true }
}
