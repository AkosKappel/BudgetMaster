import { useQueryClient } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useState } from 'react'

import { FormError } from '@/components/auth-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CURRENCIES, type Currency, toCurrency } from '@/lib/currencies'
import { currencyDigits, parseAmount } from '@/lib/money'
import { useActiveSpace, walletsQuery } from '@/lib/queries'
import { m } from '@/paraglide/messages.js'
import { setBudget } from '@/server/budgets'
import { updateSpaceSettings } from '@/server/space-admin'
import { saveWallet } from '@/server/wallets'

// After sign-up: currency, budget month, a first wallet and an optional budget in one go.
// A space that already has wallets (a kept demo, a second visit) goes straight home.
export const Route = createFileRoute('/_app/welcome')({
  loader: async ({ context }) => {
    const { wallets } = await context.queryClient.ensureQueryData(
      walletsQuery(context.activeSpaceId),
    )
    if (wallets.length > 0) throw redirect({ to: '/' })
  },
  head: () => ({
    meta: [{ title: `${m.shell_welcome_title()} | BudgetMaster` }],
  }),
  component: Welcome,
})

const selectClass =
  'h-9 w-full rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm'

function Welcome() {
  const space = useActiveSpace()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [currency, setCurrency] = useState<Currency>(
    toCurrency(space.baseCurrency),
  )
  const [startDay, setStartDay] = useState(space.budgetMonthStartDay)
  const [walletName, setWalletName] = useState<string>(() =>
    m.shell_welcome_wallet_default(),
  )
  const [balance, setBalance] = useState('')
  const [budget, setBudgetText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async () => {
    const digits = currencyDigits(currency)
    const initialBalance = balance.trim() ? parseAmount(balance, digits) : 0
    const monthly = budget.trim() ? parseAmount(budget, digits) : null
    if (initialBalance === null || (budget.trim() && !monthly)) {
      setError(m.shell_welcome_amount_error())
      return
    }
    setError(null)
    setPending(true)
    try {
      await updateSpaceSettings({
        data: {
          spaceId: space.id,
          name: space.name,
          baseCurrency: currency,
          budgetMonthStartDay: startDay,
        },
      })
      await saveWallet({
        data: {
          spaceId: space.id,
          name: walletName,
          type: 'checking',
          currency,
          initialBalance,
          icon: 'landmark',
          color: '#0284c7',
        },
      })
      if (monthly) {
        await setBudget({
          data: { spaceId: space.id, categoryId: null, amount: monthly },
        })
      }
      await queryClient.invalidateQueries()
      await navigate({ to: '/' })
    } catch (e) {
      setError(e instanceof Error ? e.message : m.shell_save_failed())
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {m.shell_welcome_title()}
        </h1>
        <p className="text-muted-foreground">{m.shell_welcome_intro()}</p>
      </div>
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="welcome-currency">
              {m.shell_welcome_currency()}
            </Label>
            <select
              id="welcome-currency"
              className={selectClass}
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="welcome-start">{m.shell_welcome_start_day()}</Label>
            <select
              id="welcome-start"
              className={selectClass}
              value={startDay}
              aria-describedby="welcome-start-hint"
              onChange={(e) => setStartDay(Number(e.target.value))}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p
          id="welcome-start-hint"
          className="-mt-3 text-sm text-muted-foreground"
        >
          {m.shell_welcome_start_hint()}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="welcome-wallet">{m.shell_welcome_wallet()}</Label>
            <Input
              id="welcome-wallet"
              value={walletName}
              maxLength={40}
              onChange={(e) => setWalletName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="welcome-balance">{m.shell_welcome_balance()}</Label>
            <Input
              id="welcome-balance"
              inputMode="decimal"
              placeholder="0"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="welcome-budget">{m.shell_welcome_budget()}</Label>
          <Input
            id="welcome-budget"
            inputMode="decimal"
            placeholder={m.shell_welcome_budget_placeholder()}
            value={budget}
            aria-describedby="welcome-budget-hint"
            onChange={(e) => setBudgetText(e.target.value)}
          />
          <p id="welcome-budget-hint" className="text-sm text-muted-foreground">
            {m.shell_welcome_budget_hint()}
          </p>
        </div>

        <FormError message={error} />
        <Button
          type="submit"
          size="lg"
          disabled={pending || !walletName.trim()}
        >
          {pending ? m.shell_welcome_setting_up() : m.shell_welcome_start()}
        </Button>
        <Link
          to="/"
          className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {m.shell_welcome_skip()}
        </Link>
      </form>
    </div>
  )
}
