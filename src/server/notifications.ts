import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { notificationPreference, pushSubscription } from '@/db/schema'
import { env } from '@/env'
import { m } from '@/paraglide/messages.js'
import { getLocale } from '@/paraglide/runtime.js'
import { authMiddleware } from '@/server/auth'

// Settings, Notifications (I-08). Push reminders need the server's VAPID keys; the weekly
// email needs a confirmed address and no demo account.
export const getNotificationSettings = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const [preference] = await db
      .select()
      .from(notificationPreference)
      .where(eq(notificationPreference.userId, context.user.id))
    return {
      publicKey: env.VAPID_PUBLIC_KEY ?? null,
      reminders: preference?.reminders ?? true,
      weeklyDigest: preference?.weeklyDigest ?? false,
      canEmail: context.user.emailVerified && !context.user.isAnonymous,
    }
  })

// Saves what changed and the language the messages go out in.
async function savePreference(
  userId: string,
  changes: { reminders?: boolean; weeklyDigest?: boolean },
) {
  const locale = getLocale()
  await db
    .insert(notificationPreference)
    .values({ userId, locale, ...changes })
    .onConflictDoUpdate({
      target: notificationPreference.userId,
      set: { locale, ...changes },
    })
}

export const setNotificationPreferences = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    z.object({
      reminders: z.boolean().optional(),
      weeklyDigest: z.boolean().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    if (
      data.weeklyDigest &&
      (!context.user.emailVerified || context.user.isAnonymous)
    )
      throw new Error(m.notify_digest_verify())
    await savePreference(context.user.id, data)
  })

const subscriptionInput = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
})

// A device that said yes to notifications. The endpoint is unique, so a device that changes
// hands (another user signs in) moves to the new user.
export const savePushSubscription = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(subscriptionInput)
  .handler(async ({ context, data }) => {
    if (!env.VAPID_PUBLIC_KEY) throw new Error('Notifications are off.')
    const values = {
      userId: context.user.id,
      endpoint: data.endpoint,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
    }
    await db
      .insert(pushSubscription)
      .values(values)
      .onConflictDoUpdate({ target: pushSubscription.endpoint, set: values })
    await savePreference(context.user.id, { reminders: true })
  })

export const removePushSubscription = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ endpoint: z.string().max(2000) }))
  .handler(async ({ context, data }) => {
    await db
      .delete(pushSubscription)
      .where(
        and(
          eq(pushSubscription.userId, context.user.id),
          eq(pushSubscription.endpoint, data.endpoint),
        ),
      )
  })
