import { relations, sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  char,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

import { user } from './auth'

// Money is stored in minor units (cents) as bigint. `mode: 'number'` is exact up to 2^53,
// far beyond any personal balance.
const money = () => bigint({ mode: 'number' })

const id = () => uuid().primaryKey().default(sql`uuidv7()`)

const userId = () =>
  text()
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}

export const walletType = pgEnum('wallet_type', [
  'checking',
  'savings',
  'cash',
  'credit_card',
  'investment',
])
export const categoryType = pgEnum('category_type', ['income', 'expense'])
export const transactionType = pgEnum('transaction_type', [
  'income',
  'expense',
  'transfer',
])
export const frequency = pgEnum('frequency', [
  'daily',
  'weekly',
  'monthly',
  'yearly',
])

export const wallet = pgTable(
  'wallet',
  {
    id: id(),
    userId: userId(),
    name: text().notNull(),
    type: walletType().notNull(),
    currency: char({ length: 3 }).notNull(),
    initialBalance: money().default(0).notNull(),
    color: text().notNull(),
    icon: text().notNull(),
    sortOrder: integer().default(0).notNull(),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [unique().on(t.userId, t.name)],
)

export const category = pgTable(
  'category',
  {
    id: id(),
    userId: userId(),
    name: text().notNull(),
    type: categoryType().notNull(),
    color: text().notNull(),
    icon: text().notNull(),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [unique().on(t.userId, t.type, t.name)],
)

export const tag = pgTable(
  'tag',
  {
    id: id(),
    userId: userId(),
    name: text().notNull(),
    color: text().notNull(),
    ...timestamps,
  },
  (t) => [unique().on(t.userId, t.name)],
)

// Shared by `transaction` and `recurring_rule`: a transfer moves money between two wallets
// and has no category; income and expense have a category and no target wallet.
// `toAmount` is only set for transfers between wallets with different currencies.
const movementColumns = () => ({
  type: transactionType().notNull(),
  walletId: uuid()
    .notNull()
    .references(() => wallet.id, { onDelete: 'cascade' }),
  amount: money().notNull(),
  // No cascade: categories are archived, not deleted, once they have transactions.
  categoryId: uuid().references(() => category.id),
  toWalletId: uuid().references(() => wallet.id, { onDelete: 'cascade' }),
  toAmount: money(),
  payee: text(),
  note: text(),
})

const movementChecks = (
  name: string,
  t: {
    type: unknown
    amount: unknown
    toAmount: unknown
    categoryId: unknown
    walletId: unknown
    toWalletId: unknown
  },
) => [
  check(`${name}_amount_positive`, sql`${t.amount} > 0`),
  check(
    `${name}_to_amount_positive`,
    sql`${t.toAmount} is null or ${t.toAmount} > 0`,
  ),
  check(
    `${name}_shape`,
    sql`(${t.type} = 'transfer' and ${t.toWalletId} is not null and ${t.toWalletId} <> ${t.walletId} and ${t.categoryId} is null)
      or (${t.type} <> 'transfer' and ${t.toWalletId} is null and ${t.toAmount} is null and ${t.categoryId} is not null)`,
  ),
]

export const recurringRule = pgTable(
  'recurring_rule',
  {
    id: id(),
    userId: userId(),
    ...movementColumns(),
    frequency: frequency().notNull(),
    interval: integer().default(1).notNull(),
    startDate: date().notNull(),
    endDate: date(),
    // Next date a transaction is due; null once the rule has ended.
    nextDate: date(),
    paused: boolean().default(false).notNull(),
    ...timestamps,
  },
  (t) => [
    ...movementChecks('recurring_rule', t),
    check('recurring_rule_interval_positive', sql`${t.interval} > 0`),
    check(
      'recurring_rule_end_after_start',
      sql`${t.endDate} is null or ${t.endDate} >= ${t.startDate}`,
    ),
    index().on(t.userId, t.nextDate),
  ],
)

export const transaction = pgTable(
  'transaction',
  {
    id: id(),
    userId: userId(),
    ...movementColumns(),
    date: date().notNull(),
    recurringRuleId: uuid().references(() => recurringRule.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (t) => [
    ...movementChecks('transaction', t),
    index().on(t.userId, t.date.desc()),
    index().on(t.walletId),
    index().on(t.toWalletId),
    index().on(t.categoryId),
  ],
)

export const transactionTag = pgTable(
  'transaction_tag',
  {
    transactionId: uuid()
      .notNull()
      .references(() => transaction.id, { onDelete: 'cascade' }),
    tagId: uuid()
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.transactionId, t.tagId] }),
    index().on(t.tagId),
  ],
)

// A monthly spending limit. `categoryId` null is the overall limit for all expenses.
export const budget = pgTable(
  'budget',
  {
    id: id(),
    userId: userId(),
    categoryId: uuid().references(() => category.id, { onDelete: 'cascade' }),
    amount: money().notNull(),
    currency: char({ length: 3 }).notNull(),
    ...timestamps,
  },
  (t) => [
    unique().on(t.userId, t.categoryId).nullsNotDistinct(),
    check('budget_amount_positive', sql`${t.amount} > 0`),
  ],
)

export const walletRelations = relations(wallet, ({ one, many }) => ({
  user: one(user, { fields: [wallet.userId], references: [user.id] }),
  transactions: many(transaction, { relationName: 'source' }),
  incomingTransfers: many(transaction, { relationName: 'target' }),
}))

export const categoryRelations = relations(category, ({ many }) => ({
  transactions: many(transaction),
  budgets: many(budget),
}))

export const tagRelations = relations(tag, ({ many }) => ({
  transactions: many(transactionTag),
}))

export const transactionRelations = relations(transaction, ({ one, many }) => ({
  wallet: one(wallet, {
    fields: [transaction.walletId],
    references: [wallet.id],
    relationName: 'source',
  }),
  toWallet: one(wallet, {
    fields: [transaction.toWalletId],
    references: [wallet.id],
    relationName: 'target',
  }),
  category: one(category, {
    fields: [transaction.categoryId],
    references: [category.id],
  }),
  recurringRule: one(recurringRule, {
    fields: [transaction.recurringRuleId],
    references: [recurringRule.id],
  }),
  tags: many(transactionTag),
}))

export const transactionTagRelations = relations(transactionTag, ({ one }) => ({
  transaction: one(transaction, {
    fields: [transactionTag.transactionId],
    references: [transaction.id],
  }),
  tag: one(tag, { fields: [transactionTag.tagId], references: [tag.id] }),
}))

export const recurringRuleRelations = relations(
  recurringRule,
  ({ one, many }) => ({
    wallet: one(wallet, {
      fields: [recurringRule.walletId],
      references: [wallet.id],
    }),
    category: one(category, {
      fields: [recurringRule.categoryId],
      references: [category.id],
    }),
    transactions: many(transaction),
  }),
)

export const budgetRelations = relations(budget, ({ one }) => ({
  category: one(category, {
    fields: [budget.categoryId],
    references: [category.id],
  }),
}))
