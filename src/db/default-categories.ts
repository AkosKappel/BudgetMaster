import { m } from '../paraglide/messages.js'
import type { Locale } from '../paraglide/runtime.js'
import type { category } from './schema'

export type DefaultCategory = Pick<
  typeof category.$inferInsert,
  'name' | 'type' | 'icon' | 'color'
> & { children?: Omit<DefaultCategory, 'type' | 'children'>[] }

// Given to every new space. Icons are Lucide icon names. Children inherit the type. The
// names are stored, so they are in the language of the request that creates the space
// unless a locale is given.
export const defaultCategories = (locale?: Locale): DefaultCategory[] => {
  const options = locale ? { locale } : {}
  return [
    {
      name: m.acct_cat_food({}, options),
      type: 'expense',
      icon: 'carrot',
      color: '#16a34a',
      children: [
        {
          name: m.acct_cat_groceries({}, options),
          icon: 'shopping-basket',
          color: '#16a34a',
        },
        {
          name: m.acct_cat_restaurants({}, options),
          icon: 'utensils',
          color: '#ea580c',
        },
      ],
    },
    {
      name: m.acct_cat_home({}, options),
      type: 'expense',
      icon: 'house',
      color: '#7c3aed',
      children: [
        {
          name: m.acct_cat_housing({}, options),
          icon: 'key-round',
          color: '#7c3aed',
        },
        {
          name: m.acct_cat_utilities({}, options),
          icon: 'zap',
          color: '#ca8a04',
        },
        {
          name: m.acct_cat_furniture({}, options),
          icon: 'sofa',
          color: '#a16207',
        },
      ],
    },
    {
      name: m.acct_cat_transport({}, options),
      type: 'expense',
      icon: 'bus',
      color: '#0284c7',
    },
    {
      name: m.acct_cat_subscriptions({}, options),
      type: 'expense',
      icon: 'repeat',
      color: '#db2777',
    },
    {
      name: m.acct_cat_health({}, options),
      type: 'expense',
      icon: 'heart-pulse',
      color: '#dc2626',
    },
    {
      name: m.acct_cat_shopping({}, options),
      type: 'expense',
      icon: 'shopping-bag',
      color: '#9333ea',
    },
    {
      name: m.acct_cat_entertainment({}, options),
      type: 'expense',
      icon: 'ticket',
      color: '#e11d48',
    },
    {
      name: m.acct_cat_travel({}, options),
      type: 'expense',
      icon: 'plane',
      color: '#0891b2',
    },
    {
      name: m.acct_cat_gifts({}, options),
      type: 'expense',
      icon: 'gift',
      color: '#c026d3',
    },
    {
      name: m.acct_cat_education({}, options),
      type: 'expense',
      icon: 'graduation-cap',
      color: '#4f46e5',
    },
    {
      name: m.acct_cat_salary({}, options),
      type: 'income',
      icon: 'briefcase',
      color: '#059669',
    },
    {
      name: m.acct_cat_freelance({}, options),
      type: 'income',
      icon: 'laptop',
      color: '#0d9488',
    },
    {
      name: m.acct_cat_refunds({}, options),
      type: 'income',
      icon: 'undo-2',
      color: '#65a30d',
    },
    {
      name: m.acct_cat_interest({}, options),
      type: 'income',
      icon: 'piggy-bank',
      color: '#15803d',
    },
    {
      name: m.acct_cat_other_income({}, options),
      type: 'income',
      icon: 'coins',
      color: '#57534e',
    },
  ]
}
