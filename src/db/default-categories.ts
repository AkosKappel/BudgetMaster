import type { category } from './schema'

type DefaultCategory = Pick<
  typeof category.$inferInsert,
  'name' | 'type' | 'icon' | 'color'
>

// Given to every new user. Icons are Lucide icon names.
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: 'Groceries',
    type: 'expense',
    icon: 'shopping-basket',
    color: '#16a34a',
  },
  {
    name: 'Restaurants & cafés',
    type: 'expense',
    icon: 'utensils',
    color: '#ea580c',
  },
  { name: 'Transport', type: 'expense', icon: 'bus', color: '#0284c7' },
  { name: 'Housing', type: 'expense', icon: 'house', color: '#7c3aed' },
  { name: 'Utilities', type: 'expense', icon: 'zap', color: '#ca8a04' },
  { name: 'Subscriptions', type: 'expense', icon: 'repeat', color: '#db2777' },
  { name: 'Health', type: 'expense', icon: 'heart-pulse', color: '#dc2626' },
  { name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#9333ea' },
  { name: 'Entertainment', type: 'expense', icon: 'ticket', color: '#e11d48' },
  { name: 'Travel', type: 'expense', icon: 'plane', color: '#0891b2' },
  {
    name: 'Gifts & donations',
    type: 'expense',
    icon: 'gift',
    color: '#c026d3',
  },
  {
    name: 'Education',
    type: 'expense',
    icon: 'graduation-cap',
    color: '#4f46e5',
  },
  { name: 'Salary', type: 'income', icon: 'briefcase', color: '#059669' },
  { name: 'Freelance', type: 'income', icon: 'laptop', color: '#0d9488' },
  { name: 'Refunds', type: 'income', icon: 'undo-2', color: '#65a30d' },
  { name: 'Interest', type: 'income', icon: 'piggy-bank', color: '#15803d' },
  { name: 'Other income', type: 'income', icon: 'coins', color: '#57534e' },
]
