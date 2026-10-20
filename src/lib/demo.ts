import { m } from '../paraglide/messages.js'

// Public demo logins created by `pnpm db:seed`, offered on the sign-in page. Not secrets.
export const DEMO_PASSWORD = 'demo-budget-2026'

// Descriptions are getters, so they are read in the visitor's language at render time.
export const DEMO_ACCOUNTS = [
  {
    email: 'demo@budgetmaster.app',
    name: 'Alex Demo',
    get description() {
      return m.shell_demo_alex()
    },
  },
  {
    email: 'jordan@budgetmaster.app',
    name: 'Jordan Demo',
    get description() {
      return m.shell_demo_jordan()
    },
  },
  {
    email: 'empty@budgetmaster.app',
    name: 'Sam New',
    get description() {
      return m.shell_demo_sam()
    },
  },
] as const
