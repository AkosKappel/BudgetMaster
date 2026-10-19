import { createFileRoute } from '@tanstack/react-router'

import { AccountData } from '@/components/account-data'
import { AccountSecurity } from '@/components/account-security'
import { ThemeSwitch } from '@/components/theme-switch'

export const Route = createFileRoute('/_app/settings')({
  head: () => ({ meta: [{ title: 'Settings | BudgetMaster' }] }),
  component: Settings,
})

function Settings() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-semibold text-2xl tracking-tight">Settings</h1>
      <ThemeSwitch />
      <AccountSecurity />
      <AccountData />
    </div>
  )
}
