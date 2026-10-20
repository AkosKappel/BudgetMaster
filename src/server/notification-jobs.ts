import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm'
import webpush from 'web-push'

import { db } from '@/db'
import {
  category,
  notificationPreference,
  pushSubscription,
  recurringRule,
  space,
  spaceMember,
  transaction,
  user,
  wallet,
} from '@/db/schema'
import { env } from '@/env'
import { sendEmail } from '@/lib/email'
import { formatLocale, isLocale } from '@/lib/locale'
import { formatMoney } from '@/lib/money'
import { addDays } from '@/lib/recurrence'
import { m } from '@/paraglide/messages.js'
import type { Locale } from '@/paraglide/runtime.js'
import { ensureExchangeRates } from '@/server/exchange-rates'

// Server-only. Runs every half hour from the server entry (src/server.ts). Each user gets a
// reminder at most once a day and a digest once a week; `remindedOn` and `digestOn` record
// what was sent, so restarts and overlapping runs do not send twice. Times are UTC: 07:00
// is morning across Europe.
const SEND_FROM_HOUR = 7

let running = false

export async function runNotificationJobs(now = new Date()) {
  if (running || now.getUTCHours() < SEND_FROM_HOUR) return
  running = true
  try {
    const today = now.toISOString().slice(0, 10)
    await sendDueReminders(today)
    if (now.getUTCDay() === 1) await sendWeeklyDigests(today)
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'notification job failed',
        error: String(error),
      }),
    )
  } finally {
    running = false
  }
}

const localeOf = (value: string): Locale => (isLocale(value) ? value : 'en')
const money = (minor: number, currency: string, locale: Locale) =>
  formatMoney(minor, currency, formatLocale(locale))

// Expenses and transfers from recurring rules due tomorrow, in every space of the user.
async function sendDueReminders(today: string) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  )
  const tomorrow = addDays(today, 1)
  const users = await db
    .selectDistinct({
      userId: notificationPreference.userId,
      locale: notificationPreference.locale,
    })
    .from(notificationPreference)
    .innerJoin(
      pushSubscription,
      eq(pushSubscription.userId, notificationPreference.userId),
    )
    .where(
      and(
        eq(notificationPreference.reminders, true),
        or(
          isNull(notificationPreference.remindedOn),
          lt(notificationPreference.remindedOn, today),
        ),
      ),
    )

  for (const { userId, locale: saved } of users) {
    const locale = localeOf(saved)
    const due = await db
      .select({
        name: sql<string>`coalesce(${recurringRule.payee}, ${category.name}, ${recurringRule.note}, '')`,
        amount: recurringRule.amount,
        currency: wallet.currency,
      })
      .from(recurringRule)
      .innerJoin(
        spaceMember,
        and(
          eq(spaceMember.spaceId, recurringRule.spaceId),
          eq(spaceMember.userId, userId),
        ),
      )
      .innerJoin(wallet, eq(wallet.id, recurringRule.walletId))
      .leftJoin(category, eq(category.id, recurringRule.categoryId))
      .where(
        and(
          eq(recurringRule.paused, false),
          eq(recurringRule.nextDate, tomorrow),
          ne(recurringRule.type, 'income'),
        ),
      )
      .orderBy(desc(recurringRule.amount))

    if (due.length > 0) {
      const shown = due
        .slice(0, 3)
        .map((d) => `${d.name} ${money(d.amount, d.currency, locale)}`.trim())
        .join(', ')
      const more =
        due.length > 3
          ? ` ${m.notify_due_more({ count: due.length - 3 }, { locale })}`
          : ''
      await pushToUser(userId, {
        title: m.notify_due_title({}, { locale }),
        body: shown + more,
        url: '/recurring',
        tag: `due-${tomorrow}`,
      })
    }
    await db
      .update(notificationPreference)
      .set({ remindedOn: today })
      .where(eq(notificationPreference.userId, userId))
  }
}

async function pushToUser(
  userId: string,
  message: { title: string; body: string; url: string; tag: string },
) {
  const subscriptions = await db
    .select()
    .from(pushSubscription)
    .where(eq(pushSubscription.userId, userId))
  for (const s of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(message),
        { TTL: 24 * 3600 },
      )
    } catch (error) {
      // Gone or unknown: the browser dropped the subscription.
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await db.delete(pushSubscription).where(eq(pushSubscription.id, s.id))
      } else {
        console.error(
          JSON.stringify({ level: 'warn', msg: 'push not sent', status }),
        )
      }
    }
  }
}

// Monday email: per space, what was spent in the last seven days (other currencies converted
// at that day's rate), the top categories and the payments due this week.
async function sendWeeklyDigests(today: string) {
  const users = await db
    .select({
      userId: user.id,
      email: user.email,
      locale: notificationPreference.locale,
    })
    .from(notificationPreference)
    .innerJoin(user, eq(user.id, notificationPreference.userId))
    .where(
      and(
        eq(notificationPreference.weeklyDigest, true),
        eq(user.emailVerified, true),
        or(isNull(user.isAnonymous), eq(user.isAnonymous, false)),
        or(
          isNull(notificationPreference.digestOn),
          lt(notificationPreference.digestOn, today),
        ),
      ),
    )
  if (users.length === 0) return
  await ensureExchangeRates()
  const from = addDays(today, -7)
  const weekEnd = addDays(today, 6)

  for (const { userId, email, locale: saved } of users) {
    const locale = localeOf(saved)
    const spaces = await db
      .select({ id: space.id, name: space.name, currency: space.baseCurrency })
      .from(space)
      .innerJoin(
        spaceMember,
        and(eq(spaceMember.spaceId, space.id), eq(spaceMember.userId, userId)),
      )
      .orderBy(asc(space.createdAt))
    const lines: string[] = []
    for (const s of spaces) {
      const inBase =
        sql<number>`coalesce(sum(convert_minor(${transaction.amount}, ${wallet.currency}, ${s.currency}, ${transaction.date})), 0)`.mapWith(
          Number,
        )
      const byCategory = await db
        .select({ name: category.name, total: inBase })
        .from(transaction)
        .innerJoin(wallet, eq(wallet.id, transaction.walletId))
        .leftJoin(category, eq(category.id, transaction.categoryId))
        .where(
          and(
            eq(transaction.spaceId, s.id),
            eq(transaction.type, 'expense'),
            gte(transaction.date, from),
            lt(transaction.date, today),
          ),
        )
        .groupBy(category.name)
        .orderBy(desc(inBase))
      const spent = byCategory.reduce((sum, c) => sum + c.total, 0)
      lines.push(
        spent > 0
          ? m.notify_digest_spent(
              { space: s.name, amount: money(spent, s.currency, locale) },
              { locale },
            )
          : m.notify_digest_nothing({ space: s.name }, { locale }),
      )
      const top = byCategory
        .filter((c) => c.name && c.total > 0)
        .slice(0, 3)
        .map((c) => c.name)
      if (top.length)
        lines.push(
          m.notify_digest_top({ categories: top.join(', ') }, { locale }),
        )

      const [upcoming] = await db
        .select({
          count: sql<number>`count(*)`.mapWith(Number),
          total:
            sql<number>`coalesce(sum(convert_minor(${recurringRule.amount}, ${wallet.currency}, ${s.currency}, ${recurringRule.nextDate})), 0)`.mapWith(
              Number,
            ),
        })
        .from(recurringRule)
        .innerJoin(wallet, eq(wallet.id, recurringRule.walletId))
        .where(
          and(
            eq(recurringRule.spaceId, s.id),
            eq(recurringRule.paused, false),
            ne(recurringRule.type, 'income'),
            gte(recurringRule.nextDate, today),
            lte(recurringRule.nextDate, weekEnd),
          ),
        )
      if (upcoming.count > 0)
        lines.push(
          m.notify_digest_upcoming(
            {
              count: upcoming.count,
              amount: money(upcoming.total, s.currency, locale),
            },
            { locale },
          ),
        )
    }

    await sendDigest(email, locale, lines)
    await db
      .update(notificationPreference)
      .set({ digestOn: today })
      .where(eq(notificationPreference.userId, userId))
  }
}

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"]/g,
    (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`,
  )

function sendDigest(to: string, locale: Locale, lines: string[]) {
  const url = new URL(env.BETTER_AUTH_URL).origin
  const action = m.notify_digest_action({}, { locale })
  const outro = m.notify_digest_outro({}, { locale })
  return sendEmail({
    to,
    subject: m.notify_digest_subject({}, { locale }),
    text: `${lines.join('\n')}\n\n${action}: ${url}\n\n${outro}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:32rem;color:#16302b">
${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('\n')}
<p><a href="${url}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#16302b;color:#f1f4ef;text-decoration:none">${escapeHtml(action)}</a></p>
<p style="color:#50635e;font-size:14px">${escapeHtml(outro)}</p>
</div>`,
  })
}
