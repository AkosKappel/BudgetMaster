import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

import { AccountData } from '@/components/account-data'
import { AccountSecurity } from '@/components/account-security'
import { ThemeSwitch } from '@/components/theme-switch'
import { authClient } from '@/lib/auth-client'
import { LANGUAGES } from '@/lib/locale'
import { sessionQuery, signInOptionsQuery } from '@/lib/queries'
import { getLocale, setLocale } from '@/paraglide/runtime.js'

export const Route = createFileRoute('/_app/settings')({
  head: () => ({ meta: [{ title: 'Settings | BudgetMaster' }] }),
  component: Settings,
})

function Settings() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-semibold text-2xl tracking-tight">Settings</h1>
      <ThemeSwitch />
      <Language />
      <WeekStart />
      <AiFeatures />
      <AccountSecurity />
      <AccountData />
    </div>
  )
}

// Also sets number, money and date formats. Kept in a cookie on this device; setLocale
// reloads the page so the server renders in the new language too.
function Language() {
  const current = getLocale()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold text-lg">Language</legend>
      <div className="grid w-full max-w-sm grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {LANGUAGES.map((option) => (
          <label
            key={option.locale}
            lang={option.locale}
            className="flex h-9 cursor-pointer items-center justify-center rounded-md text-sm has-checked:bg-card has-checked:shadow-xs has-focus-visible:ring-2 has-focus-visible:ring-ring"
          >
            <input
              type="radio"
              name="language"
              value={option.locale}
              checked={current === option.locale}
              onChange={() => setLocale(option.locale)}
              className="sr-only"
            />
            {option.name}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

const WEEK_STARTS = [
  { value: 1, label: 'Monday' },
  { value: 0, label: 'Sunday' },
] as const

function WeekStart() {
  const { user } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [value, setValue] = useState(user.weekStartsOn)

  async function change(next: number) {
    const before = value
    setValue(next)
    const { error } = await authClient.updateUser({ weekStartsOn: next })
    if (error) {
      setValue(before)
      toast.error(error.message ?? 'Could not save. Try again.')
      return
    }
    await queryClient.invalidateQueries(sessionQuery)
    // The spending calendar in Reports lines its weeks up with this day.
    await queryClient.invalidateQueries({
      predicate: (query) => query.queryKey.includes('spending-calendar'),
    })
    router.invalidate()
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold text-lg">Week starts on</legend>
      <div className="grid w-full max-w-sm grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {WEEK_STARTS.map((option) => (
          <label
            key={option.value}
            className="flex h-9 cursor-pointer items-center justify-center rounded-md text-sm has-checked:bg-card has-checked:shadow-xs has-focus-visible:ring-2 has-focus-visible:ring-ring"
          >
            <input
              type="radio"
              name="week-start"
              value={option.value}
              checked={value === option.value}
              onChange={() => change(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// M-18: AI features are opt-in per user, with what leaves the app said plainly. Offered
// only when the server has an Anthropic API key, and not to demo users.
function AiFeatures() {
  const { user } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data: options } = useQuery(signInOptionsQuery)
  const [enabled, setEnabled] = useState(user.aiEnabled)
  if (!options?.ai || user.demoExpiresAt) return null

  async function change(next: boolean) {
    setEnabled(next)
    const { error } = await authClient.updateUser({ aiEnabled: next })
    if (error) {
      setEnabled(!next)
      toast.error(error.message ?? 'Could not save. Try again.')
      return
    }
    // The quick add form asks the server whether to offer reading receipts.
    await queryClient.invalidateQueries()
    router.invalidate()
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold text-lg">AI features</legend>
      <label className="flex max-w-prose items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => change(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Read receipt photos with Claude
          <span className="block text-muted-foreground">
            When you tap "Fill in from photo", that photo and the names of your
            expense categories are sent to Anthropic's Claude API to read the
            total, date and shop. Nothing else is sent, and nothing is sent
            unless you tap it.
          </span>
        </span>
      </label>
    </fieldset>
  )
}
