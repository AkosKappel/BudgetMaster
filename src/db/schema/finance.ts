import { relations, sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  bigint,
  boolean,
  char,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import type { ImportMapping } from '@/lib/import'
import { user } from './auth'

// Money is stored in minor units (cents) as bigint. `mode: 'number'` is exact up to 2^53,
// far beyond any personal balance.
const money = () => bigint({ mode: 'number' })

const id = () => uuid().primaryKey().default(sql`uuidv7()`)

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}

export const spaceRole = pgEnum('space_role', ['owner', 'editor', 'viewer'])
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

// A ledger with its own wallets, categories, tags, budgets and rules. Every user has one
// personal space (deleted with the user); shared spaces have several members and outlive
// any single one of them.
export const space = pgTable(
  'space',
  {
    id: id(),
    name: text().notNull(),
    personalOwnerId: text()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    baseCurrency: char({ length: 3 }).default('EUR').notNull(),
    // At most 28, so every month has the day.
    budgetMonthStartDay: integer().default(1).notNull(),
    ...timestamps,
  },
  (t) => [
    check(
      'space_budget_month_start_day_range',
      sql`${t.budgetMonthStartDay} between 1 and 28`,
    ),
  ],
)

export const spaceMember = pgTable(
  'space_member',
  {
    spaceId: uuid()
      .notNull()
      .references(() => space.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: spaceRole().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.spaceId, t.userId] }), index().on(t.userId)],
)

// Only a hash of the token is stored; the token itself is in the invite link.
export const spaceInvite = pgTable(
  'space_invite',
  {
    id: id(),
    spaceId: uuid()
      .notNull()
      .references(() => space.id, { onDelete: 'cascade' }),
    email: text().notNull(),
    role: spaceRole().notNull(),
    tokenHash: text().notNull().unique(),
    invitedBy: text().references(() => user.id, { onDelete: 'set null' }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    acceptedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check('space_invite_not_owner', sql`${t.role} <> 'owner'`),
    uniqueIndex('space_invite_pending_unique')
      .on(t.spaceId, t.email)
      .where(sql`${t.acceptedAt} is null`),
  ],
)

const spaceId = () =>
  uuid()
    .notNull()
    .references(() => space.id, { onDelete: 'cascade' })

// Lets child tables reference (id, spaceId), so a row can only point to wallets,
// categories and tags of its own space.
const idInSpace = (t: { id: AnyPgColumn; spaceId: AnyPgColumn }) =>
  unique().on(t.id, t.spaceId)

export const wallet = pgTable(
  'wallet',
  {
    id: id(),
    spaceId: spaceId(),
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
  (t) => [unique().on(t.spaceId, t.name), idInSpace(t)],
)

// One level of nesting: a category with a parent cannot be a parent itself (enforced in
// the server functions). The composite key keeps parent and child in the same space and of
// the same type.
export const category = pgTable(
  'category',
  {
    id: id(),
    spaceId: spaceId(),
    parentId: uuid(),
    name: text().notNull(),
    type: categoryType().notNull(),
    color: text().notNull(),
    icon: text().notNull(),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique().on(t.spaceId, t.type, t.name),
    idInSpace(t),
    unique().on(t.id, t.spaceId, t.type),
    foreignKey({
      columns: [t.parentId, t.spaceId, t.type],
      foreignColumns: [t.id, t.spaceId, t.type],
    }),
    check('category_not_own_parent', sql`${t.parentId} <> ${t.id}`),
    index().on(t.parentId),
  ],
)

export const tag = pgTable(
  'tag',
  {
    id: id(),
    spaceId: spaceId(),
    name: text().notNull(),
    color: text().notNull(),
    ...timestamps,
  },
  (t) => [unique().on(t.spaceId, t.name), idInSpace(t)],
)

// Shared by `transaction` and `recurring_rule`: a transfer moves money between two wallets
// and has no category; income and expense have a category and no target wallet.
// `toAmount` is only set for transfers between wallets with different currencies.
const movementColumns = () => ({
  type: transactionType().notNull(),
  walletId: uuid().notNull(),
  amount: money().notNull(),
  categoryId: uuid(),
  toWalletId: uuid(),
  toAmount: money(),
  payee: text(),
  note: text(),
})

type MovementTable = {
  spaceId: AnyPgColumn
  type: AnyPgColumn
  amount: AnyPgColumn
  toAmount: AnyPgColumn
  categoryId: AnyPgColumn
  walletId: AnyPgColumn
  toWalletId: AnyPgColumn
}

// Transactions may leave the category empty when they are split (M-14): the server then
// requires at least two `transaction_split` rows that add up to the amount.
const movementConstraints = (
  name: string,
  t: MovementTable,
  { splittable = false } = {},
) => [
  check(`${name}_amount_positive`, sql`${t.amount} > 0`),
  check(
    `${name}_to_amount_positive`,
    sql`${t.toAmount} is null or ${t.toAmount} > 0`,
  ),
  check(
    `${name}_shape`,
    sql`(${t.type} = 'transfer' and ${t.toWalletId} is not null and ${t.toWalletId} <> ${t.walletId} and ${t.categoryId} is null)
      or (${t.type} <> 'transfer' and ${t.toWalletId} is null and ${t.toAmount} is null${splittable ? sql`` : sql` and ${t.categoryId} is not null`})`,
  ),
  foreignKey({
    name: `${name}_wallet_fk`,
    columns: [t.walletId, t.spaceId],
    foreignColumns: [wallet.id, wallet.spaceId],
  }).onDelete('cascade'),
  foreignKey({
    name: `${name}_to_wallet_fk`,
    columns: [t.toWalletId, t.spaceId],
    foreignColumns: [wallet.id, wallet.spaceId],
  }).onDelete('cascade'),
  // No cascade: categories are archived, not deleted, once they are used.
  foreignKey({
    name: `${name}_category_fk`,
    columns: [t.categoryId, t.spaceId],
    foreignColumns: [category.id, category.spaceId],
  }),
]

export const recurringRule = pgTable(
  'recurring_rule',
  {
    id: id(),
    spaceId: spaceId(),
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
    ...movementConstraints('recurring_rule', t),
    check('recurring_rule_interval_positive', sql`${t.interval} > 0`),
    check(
      'recurring_rule_end_after_start',
      sql`${t.endDate} is null or ${t.endDate} >= ${t.startDate}`,
    ),
    index().on(t.spaceId, t.nextDate),
  ],
)

export const transaction = pgTable(
  'transaction',
  {
    id: id(),
    spaceId: spaceId(),
    ...movementColumns(),
    date: date().notNull(),
    recurringRuleId: uuid().references(() => recurringRule.id, {
      onDelete: 'set null',
    }),
    // Who entered it; kept when that member leaves a shared space.
    createdBy: text().references(() => user.id, { onDelete: 'set null' }),
    // Set for rows from a statement import, so the import can be undone.
    importId: uuid().references((): AnyPgColumn => importBatch.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (t) => [
    ...movementConstraints('transaction', t, { splittable: true }),
    idInSpace(t),
    index().on(t.spaceId, t.date.desc()),
    index().on(t.walletId),
    index().on(t.toWalletId),
    index().on(t.categoryId),
    index().on(t.importId),
  ],
)

export const transactionTag = pgTable(
  'transaction_tag',
  {
    spaceId: spaceId(),
    transactionId: uuid().notNull(),
    tagId: uuid().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.transactionId, t.tagId] }),
    foreignKey({
      columns: [t.transactionId, t.spaceId],
      foreignColumns: [transaction.id, transaction.spaceId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.tagId, t.spaceId],
      foreignColumns: [tag.id, tag.spaceId],
    }).onDelete('cascade'),
    index().on(t.tagId),
  ],
)

// One part of a split transaction (M-14): a receipt across several categories. The parts
// of a transaction add up to its amount (checked by the server) and use categories of the
// transaction's type.
export const transactionSplit = pgTable(
  'transaction_split',
  {
    id: id(),
    spaceId: spaceId(),
    transactionId: uuid().notNull(),
    categoryId: uuid().notNull(),
    amount: money().notNull(),
    note: text(),
  },
  (t) => [
    check('transaction_split_amount_positive', sql`${t.amount} > 0`),
    foreignKey({
      columns: [t.transactionId, t.spaceId],
      foreignColumns: [transaction.id, transaction.spaceId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.categoryId, t.spaceId],
      foreignColumns: [category.id, category.spaceId],
    }),
    index().on(t.transactionId),
    index().on(t.categoryId),
  ],
)

// A monthly spending limit in the space's base currency, per budget month (see
// `space.budgetMonthStartDay`). `categoryId` null is the overall limit; a parent category's
// limit includes its children.
export const budget = pgTable(
  'budget',
  {
    id: id(),
    spaceId: spaceId(),
    categoryId: uuid(),
    amount: money().notNull(),
    // What is left at the end of a budget month is added to the next one (one month only).
    rollover: boolean().default(false).notNull(),
    ...timestamps,
  },
  (t) => [
    unique().on(t.spaceId, t.categoryId).nullsNotDistinct(),
    check('budget_amount_positive', sql`${t.amount} > 0`),
    foreignKey({
      columns: [t.categoryId, t.spaceId],
      foreignColumns: [category.id, category.spaceId],
    }).onDelete('cascade'),
  ],
)

// Who added, changed or deleted which transaction (I-13), shown to the members of a shared
// space. A snapshot, not a link: the transaction may be gone.
export interface ActivityDetails {
  type: 'income' | 'expense' | 'transfer'
  walletId: string
  payee: string | null
  amount: number
  date: string
  // For a change: the values before it.
  before?: { payee: string | null; amount: number; date: string }
}

export const activityEvent = pgTable(
  'activity_event',
  {
    id: id(),
    spaceId: spaceId(),
    userId: text().references(() => user.id, { onDelete: 'set null' }),
    action: text({ enum: ['created', 'updated', 'deleted'] }).notNull(),
    transactionId: uuid().notNull(),
    details: jsonb().$type<ActivityDetails>().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index().on(t.spaceId, t.createdAt.desc())],
)

// One confirmed statement import (M-16): its transactions point here, so it can be undone
// as a whole.
export const importBatch = pgTable(
  'import',
  {
    id: id(),
    spaceId: spaceId(),
    walletId: uuid().notNull(),
    fileName: text(),
    count: integer().notNull(),
    createdBy: text().references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    idInSpace(t),
    index().on(t.spaceId, t.createdAt.desc()),
    foreignKey({
      columns: [t.walletId, t.spaceId],
      foreignColumns: [wallet.id, wallet.spaceId],
    }).onDelete('cascade'),
  ],
)

// The CSV columns a space used for one bank's export, found again by its header row (M-16),
// so the next statement from that bank needs no setup. The wallet is a default only.
export const importMapping = pgTable(
  'import_mapping',
  {
    id: id(),
    spaceId: spaceId(),
    // The header cells, trimmed and lowercased, joined by a unit separator.
    header: text().notNull(),
    mapping: jsonb().$type<ImportMapping>().notNull(),
    walletId: uuid().references(() => wallet.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [unique().on(t.spaceId, t.header)],
)

// Money put aside for something (I-02): the wallet's balance is the progress, in the
// wallet's currency. Deleting the wallet deletes the goal.
export const savingsGoal = pgTable(
  'savings_goal',
  {
    id: id(),
    spaceId: spaceId(),
    name: text().notNull(),
    walletId: uuid().notNull(),
    targetAmount: money().notNull(),
    targetDate: date(),
    ...timestamps,
  },
  (t) => [
    unique().on(t.spaceId, t.name),
    check('savings_goal_target_positive', sql`${t.targetAmount} > 0`),
    foreignKey({
      columns: [t.walletId, t.spaceId],
      foreignColumns: [wallet.id, wallet.spaceId],
    }).onDelete('cascade'),
  ],
)

// "Payee contains `match`" means this category (M-15). Matching is case-insensitive and
// the longest match wins (src/lib/rules.ts). The composite key keeps the rule and its
// category in the same space and of the same type.
export const categorizationRule = pgTable(
  'categorization_rule',
  {
    id: id(),
    spaceId: spaceId(),
    type: categoryType().notNull(),
    match: text().notNull(),
    categoryId: uuid().notNull(),
    ...timestamps,
  },
  (t) => [
    unique().on(t.spaceId, t.type, t.match),
    check(
      'categorization_rule_match_lowercase',
      sql`${t.match} = lower(${t.match})`,
    ),
    foreignKey({
      columns: [t.categoryId, t.spaceId, t.type],
      foreignColumns: [category.id, category.spaceId, category.type],
    }).onDelete('cascade'),
  ],
)

export const spaceRelations = relations(space, ({ many }) => ({
  members: many(spaceMember),
  invites: many(spaceInvite),
  wallets: many(wallet),
  categories: many(category),
  tags: many(tag),
  budgets: many(budget),
  savingsGoals: many(savingsGoal),
}))

export const savingsGoalRelations = relations(savingsGoal, ({ one }) => ({
  space: one(space, { fields: [savingsGoal.spaceId], references: [space.id] }),
  wallet: one(wallet, {
    fields: [savingsGoal.walletId],
    references: [wallet.id],
  }),
}))

export const spaceMemberRelations = relations(spaceMember, ({ one }) => ({
  space: one(space, { fields: [spaceMember.spaceId], references: [space.id] }),
  user: one(user, { fields: [spaceMember.userId], references: [user.id] }),
}))

export const spaceInviteRelations = relations(spaceInvite, ({ one }) => ({
  space: one(space, { fields: [spaceInvite.spaceId], references: [space.id] }),
}))

export const walletRelations = relations(wallet, ({ one, many }) => ({
  space: one(space, { fields: [wallet.spaceId], references: [space.id] }),
  transactions: many(transaction, { relationName: 'source' }),
  incomingTransfers: many(transaction, { relationName: 'target' }),
}))

export const categoryRelations = relations(category, ({ one, many }) => ({
  space: one(space, { fields: [category.spaceId], references: [space.id] }),
  parent: one(category, {
    fields: [category.parentId],
    references: [category.id],
    relationName: 'parent',
  }),
  children: many(category, { relationName: 'parent' }),
  transactions: many(transaction),
  budgets: many(budget),
}))

export const tagRelations = relations(tag, ({ one, many }) => ({
  space: one(space, { fields: [tag.spaceId], references: [space.id] }),
  transactions: many(transactionTag),
}))

export const transactionRelations = relations(transaction, ({ one, many }) => ({
  space: one(space, { fields: [transaction.spaceId], references: [space.id] }),
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
  author: one(user, { fields: [transaction.createdBy], references: [user.id] }),
  tags: many(transactionTag),
  splits: many(transactionSplit),
}))

export const transactionSplitRelations = relations(
  transactionSplit,
  ({ one }) => ({
    transaction: one(transaction, {
      fields: [transactionSplit.transactionId],
      references: [transaction.id],
    }),
    category: one(category, {
      fields: [transactionSplit.categoryId],
      references: [category.id],
    }),
  }),
)

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
    space: one(space, {
      fields: [recurringRule.spaceId],
      references: [space.id],
    }),
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
  space: one(space, { fields: [budget.spaceId], references: [space.id] }),
  category: one(category, {
    fields: [budget.categoryId],
    references: [category.id],
  }),
}))
