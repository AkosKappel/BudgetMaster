import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod'
import { createServerFn } from '@tanstack/react-start'
import {
  and,
  between,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { category, recurringRule, wallet } from '@/db/schema'
import { env } from '@/env'
import { ruleDates } from '@/lib/forecast'
import { formatMoney } from '@/lib/money'
import { addDays, budgetPeriod } from '@/lib/recurrence'
import { currentDay } from '@/lib/today'
import { m } from '@/paraglide/messages.js'
import { getLocale } from '@/paraglide/runtime.js'
import { anthropic, countRead, withClaude } from '@/server/anthropic'
import { authMiddleware } from '@/server/auth'
import { getBudgetReport } from '@/server/budgets'
import { categoryLines } from '@/server/category-lines'
import { rateConverter, sumConverted } from '@/server/convert'
import { ensureExchangeRates } from '@/server/exchange-rates'
import { requireMembership } from '@/server/membership'
import { spaceInput } from '@/server/spaces'
import { walletBalances } from '@/server/wallet-balances'

const LANGUAGE_NAMES = { en: 'English', hu: 'Hungarian', sk: 'Slovak' }
const isoDate = z.iso.date()

// "Ask your money" (AI-03): Claude answers a question about the active space by calling
// these read-only tools, which return totals, never the list of transactions. Every number
// in the answer comes from a tool.
export const askMoney = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    spaceInput.extend({
      question: z.string().trim().min(2).max(500),
      // Earlier questions and answers of this conversation, newest last.
      history: z
        .array(
          z.object({
            question: z.string().max(500),
            answer: z.string().max(4000),
          }),
        )
        .max(6),
    }),
  )
  .handler(async ({ context, data }) => {
    if (!env.ANTHROPIC_API_KEY) throw new Error(m.txn_ai_not_set_up())
    if (!context.user.aiEnabled) throw new Error(m.txn_ai_switch_on())
    if (context.user.isAnonymous) throw new Error(m.txn_ai_needs_account())
    const space = await requireMembership(context.user.id, data.spaceId)
    countRead(context.user.id)
    await ensureExchangeRates()
    const today = currentDay()
    const base = space.baseCurrency
    const money = (minor: number) => formatMoney(minor, base)

    // A category name and its subcategories (one level, D-07).
    const categoryIds = async (name: string) => {
      const found = await db
        .select({ id: category.id })
        .from(category)
        .where(
          and(
            eq(category.spaceId, space.id),
            sql`lower(${category.name}) = lower(${name})`,
          ),
        )
      if (found.length === 0) return []
      const children = await db
        .select({ id: category.id })
        .from(category)
        .where(
          inArray(
            category.parentId,
            found.map((c) => c.id),
          ),
        )
      return [...found, ...children].map((c) => c.id)
    }

    const totals = betaZodTool({
      name: 'totals',
      description:
        'Sum of income or spending in a date range, in the space currency, optionally grouped by category, month or payee and filtered by a category name or payee text. Transfers between wallets are never included.',
      inputSchema: z.object({
        type: z.enum(['expense', 'income']),
        from: isoDate.describe('First day, YYYY-MM-DD.'),
        to: isoDate.describe('Last day, YYYY-MM-DD.'),
        group_by: z.enum(['none', 'category', 'month', 'payee']),
        category: z
          .string()
          .optional()
          .describe('Exact category name; includes its subcategories.'),
        payee: z.string().optional().describe('Text the payee contains.'),
      }),
      run: async (input) => {
        const ids = input.category ? await categoryIds(input.category) : null
        if (ids?.length === 0)
          return JSON.stringify({ error: 'No category with that name.' })
        const conditions: (SQL | undefined)[] = [
          eq(categoryLines.spaceId, space.id),
          eq(categoryLines.type, input.type),
          between(categoryLines.date, input.from, input.to),
          ids ? inArray(categoryLines.categoryId, ids) : undefined,
          input.payee
            ? ilike(
                categoryLines.payee,
                `%${input.payee.replace(/[\\%_]/g, (c) => `\\${c}`)}%`,
              )
            : undefined,
        ]
        const key = {
          none: sql<string>`'total'`,
          category: sql<string>`coalesce(${category.name}, 'Uncategorized')`,
          month: sql<string>`to_char(${categoryLines.date}, 'YYYY-MM')`,
          payee: sql<string>`coalesce(${categoryLines.payee}, '')`,
        }[input.group_by]
        const total = sumConverted(
          categoryLines.amount,
          wallet.currency,
          base,
          categoryLines.date,
        )
        const rows = await db
          .select({ key, total })
          .from(categoryLines)
          .innerJoin(wallet, eq(wallet.id, categoryLines.walletId))
          .leftJoin(category, eq(category.id, categoryLines.categoryId))
          .where(and(...conditions))
          .groupBy(key)
          .orderBy(desc(total))
          .limit(20)
        return JSON.stringify(
          rows.map((r) => ({ [input.group_by]: r.key, total: money(r.total) })),
        )
      },
    })

    const budgets = betaZodTool({
      name: 'budgets',
      description:
        'The budgets of the current budget month: the overall limit and each category limit with what is spent and left.',
      inputSchema: z.object({}),
      run: async () => {
        const report = await getBudgetReport({
          data: { spaceId: space.id, offset: 0 },
        })
        return JSON.stringify({
          period: report.period,
          daysLeft: report.daysLeft,
          spent: money(report.spent),
          income: money(report.income),
          overall: report.overall && money(report.overall.amount),
          categories: report.categoryBudgets.map((b) => ({
            name: b.name,
            limit: money(b.amount),
            spent: money(b.spent),
            left: money(b.amount - b.spent),
          })),
        })
      },
    })

    const balances = betaZodTool({
      name: 'balances',
      description:
        'Balance of each wallet today in its own currency, and the total in the space currency.',
      inputSchema: z.object({}),
      run: async () => {
        const wallets = await walletBalances(space.id, today)
        const convert = await rateConverter(
          base,
          wallets.map((w) => w.currency),
          [today],
        )
        return JSON.stringify({
          wallets: wallets.map((w) => ({
            name: w.name,
            type: w.type,
            balance: formatMoney(w.balance, w.currency),
          })),
          total: money(
            wallets.reduce(
              (sum, w) => sum + (convert(w.balance, w.currency, today) ?? 0),
              0,
            ),
          ),
        })
      },
    })

    const upcoming = betaZodTool({
      name: 'upcoming_payments',
      description:
        'Recurring payments and income due in the next days, from the recurring rules.',
      inputSchema: z.object({ days: z.int().min(1).max(90) }),
      run: async ({ days }) => {
        const until = addDays(today, days)
        const rules = await db
          .select({
            rule: recurringRule,
            currency: wallet.currency,
            category: category.name,
          })
          .from(recurringRule)
          .innerJoin(wallet, eq(wallet.id, recurringRule.walletId))
          .leftJoin(category, eq(category.id, recurringRule.categoryId))
          .where(
            and(
              eq(recurringRule.spaceId, space.id),
              eq(recurringRule.paused, false),
              or(
                isNull(recurringRule.endDate),
                sql`${recurringRule.endDate} >= ${today}`,
              ),
            ),
          )
        return JSON.stringify(
          rules
            .flatMap(({ rule, currency, category: name }) =>
              ruleDates(rule, today, until).map((date) => ({
                date,
                type: rule.type,
                what: rule.payee ?? name ?? '',
                amount: formatMoney(rule.amount, currency),
              })),
            )
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 40),
        )
      },
    })

    const period = budgetPeriod(today, space.budgetMonthStartDay)
    const runner = anthropic().beta.messages.toolRunner({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      max_iterations: 8,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: `You answer questions about the user's own money in the budgeting app BudgetMaster, for the space "${space.name}". Use the tools for every number and never estimate one. Today is ${today}; the current budget month runs from ${period.start} to ${period.end}; the space currency is ${base}. Answer in ${LANGUAGE_NAMES[getLocale()]}, in at most four short sentences of plain text, quoting amounts exactly as the tools give them. If a question is not about this user's money in the app, say briefly that you can only answer those.`,
      tools: [totals, budgets, balances, upcoming],
      messages: [
        ...data.history.flatMap((turn) => [
          { role: 'user' as const, content: turn.question },
          { role: 'assistant' as const, content: turn.answer },
        ]),
        { role: 'user', content: data.question },
      ],
    })
    const message = await withClaude(async () => await runner)
    const answer = message.content
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join('')
      .trim()
    if (message.stop_reason === 'refusal' || !answer)
      throw new Error(m.ask_failed())
    return { answer }
  })
