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
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

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

const movementConstraints = (name: string, t: MovementTable) => [
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
    ...timestamps,
  },
  (t) => [
    ...movementConstraints('transaction', t),
    idInSpace(t),
    index().on(t.spaceId, t.date.desc()),
    index().on(t.walletId),
    index().on(t.toWalletId),
    index().on(t.categoryId),
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

export const spaceRelations = relations(space, ({ many }) => ({
  members: many(spaceMember),
  invites: many(spaceInvite),
  wallets: many(wallet),
  categories: many(category),
  tags: many(tag),
  budgets: many(budget),
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
