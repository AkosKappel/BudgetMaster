// Public demo logins created by `pnpm db:seed`, offered on the sign-in page. Not secrets.
export const DEMO_PASSWORD = 'demo-budget-2026'

export const DEMO_ACCOUNTS = [
  {
    email: 'demo@budgetmaster.app',
    name: 'Alex Demo',
    description: '14 months of data and a shared household',
  },
  {
    email: 'jordan@budgetmaster.app',
    name: 'Jordan Demo',
    description: 'Member of the shared household',
  },
  {
    email: 'empty@budgetmaster.app',
    name: 'Sam New',
    description: 'No data yet',
  },
] as const
