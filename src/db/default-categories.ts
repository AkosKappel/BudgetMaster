import type { category } from './schema'

export type DefaultCategory = Pick<
  typeof category.$inferInsert,
  'name' | 'type' | 'icon' | 'color'
> & { children?: Omit<DefaultCategory, 'type' | 'children'>[] }

// Given to every new space. Icons are Lucide icon names. Children inherit the type.
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: 'Food',
    type: 'expense',
    icon: 'carrot',
    color: '#16a34a',
    children: [
      { name: 'Groceries', icon: 'shopping-basket', color: '#16a34a' },
      { name: 'Restaurants & cafés', icon: 'utensils', color: '#ea580c' },
    ],
  },
  {
    name: 'Home',
    type: 'expense',
    icon: 'house',
    color: '#7c3aed',
    children: [
      { name: 'Housing', icon: 'key-round', color: '#7c3aed' },
      { name: 'Utilities', icon: 'zap', color: '#ca8a04' },
      { name: 'Furniture', icon: 'sofa', color: '#a16207' },
    ],
  },
  { name: 'Transport', type: 'expense', icon: 'bus', color: '#0284c7' },
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
