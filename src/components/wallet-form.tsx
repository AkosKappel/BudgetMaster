import { useState } from 'react'

import { FormError } from '@/components/auth-page'
import { ColorPicker, IconPicker } from '@/components/pickers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CURRENCIES, type Currency } from '@/lib/currencies'
import { currencyDigits, parseAmount } from '@/lib/money'
import type { WalletInput } from '@/server/wallets'

type WalletType = WalletInput['type']
export type WalletValues = Pick<
  WalletInput,
  'name' | 'type' | 'currency' | 'initialBalance' | 'icon' | 'color'
>

export const WALLET_TYPES: Record<WalletType, { label: string; icon: string }> =
  {
    checking: { label: 'Bank account', icon: 'landmark' },
    savings: { label: 'Savings', icon: 'piggy-bank' },
    cash: { label: 'Cash', icon: 'wallet' },
    credit_card: { label: 'Credit card', icon: 'credit-card' },
    investment: { label: 'Investment', icon: 'coins' },
  }

const selectClass =
  'h-9 rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm'

// "1 234,56" or "-200" (a card that starts with a debt) to minor units.
function parseBalance(text: string, currency: string) {
  const trimmed = text.trim()
  if (trimmed === '') return 0
  const negative = /^[-−]/.test(trimmed)
  const minor = parseAmount(
    trimmed.replace(/^[-−]/, ''),
    currencyDigits(currency),
  )
  if (minor === null) return null
  return negative ? -minor : minor
}

const formatBalance = (minor: number, currency: string) =>
  minor === 0 ? '' : String(minor / 10 ** currencyDigits(currency))

export function WalletForm({
  defaults,
  editing,
  currencyLocked,
  pending,
  error,
  onSubmit,
}: {
  defaults: WalletValues
  editing: boolean
  // Amounts are stored in the wallet's currency, so it is fixed once it has transactions.
  currencyLocked: boolean
  pending: boolean
  error?: string
  onSubmit: (values: WalletValues) => void
}) {
  const [values, setValues] = useState(defaults)
  const [balanceText, setBalanceText] = useState(
    formatBalance(defaults.initialBalance, defaults.currency),
  )
  const [localError, setLocalError] = useState<string | null>(null)
  const set = (change: Partial<WalletValues>) =>
    setValues((current) => ({ ...current, ...change }))

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        const initialBalance = parseBalance(balanceText, values.currency)
        if (initialBalance === null) {
          setLocalError(
            'Enter the starting balance as a number, like 250 or -80.',
          )
          return
        }
        setLocalError(null)
        onSubmit({ ...values, initialBalance })
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="wallet-name">Name</Label>
        <Input
          id="wallet-name"
          value={values.name}
          maxLength={40}
          required
          autoComplete="off"
          onChange={(e) => set({ name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="wallet-type">Type</Label>
          <select
            id="wallet-type"
            className={selectClass}
            value={values.type}
            onChange={(e) => {
              const type = e.target.value as WalletType
              // A new wallet follows the type's icon until one is picked by hand.
              set(
                editing || values.icon !== WALLET_TYPES[values.type].icon
                  ? { type }
                  : { type, icon: WALLET_TYPES[type].icon },
              )
            }}
          >
            {Object.entries(WALLET_TYPES).map(([type, { label }]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="wallet-currency">Currency</Label>
          <select
            id="wallet-currency"
            className={selectClass}
            value={values.currency}
            disabled={currencyLocked}
            aria-describedby={
              currencyLocked ? 'wallet-currency-hint' : undefined
            }
            onChange={(e) => set({ currency: e.target.value as Currency })}
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>
      {currencyLocked && (
        <p
          id="wallet-currency-hint"
          className="-mt-3 text-muted-foreground text-sm"
        >
          It has transactions, so its currency stays.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="wallet-balance">Starting balance</Label>
        <Input
          id="wallet-balance"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={balanceText}
          aria-describedby="wallet-balance-hint"
          onChange={(e) => setBalanceText(e.target.value)}
        />
        <p id="wallet-balance-hint" className="text-muted-foreground text-sm">
          What it held before the first transaction you record. Negative for a
          card that starts with a debt.
        </p>
      </div>

      <IconPicker
        value={values.icon}
        color={values.color}
        onChange={(icon) => set({ icon })}
      />
      <ColorPicker value={values.color} onChange={(color) => set({ color })} />

      <FormError message={localError ?? error ?? null} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Saving' : editing ? 'Save changes' : 'Create wallet'}
      </Button>
    </form>
  )
}
