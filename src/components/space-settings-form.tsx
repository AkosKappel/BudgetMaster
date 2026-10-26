import { useForm } from '@tanstack/react-form'
import { z } from 'zod'

import { FormError } from '@/components/auth-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CURRENCIES, type Currency } from '@/lib/currencies'
import { m } from '@/paraglide/messages.js'

export interface SpaceSettings {
  name: string
  baseCurrency: Currency
  budgetMonthStartDay: number
}

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: () => m.acct_space_name_required() })
    .max(60),
  baseCurrency: z.enum(CURRENCIES),
  budgetMonthStartDay: z.number().int().min(1).max(28),
})

const selectClass =
  'h-9 rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm'

interface Props {
  defaults: SpaceSettings
  submitLabel: string
  disabled?: boolean
  error?: string | null
  pending?: boolean
  onSubmit: (values: SpaceSettings) => void
}

// Name, base currency and budget month start: used to create a space and to edit one.
export function SpaceSettingsForm({
  defaults,
  submitLabel,
  disabled,
  error,
  pending,
  onSubmit,
}: Props) {
  const form = useForm({
    defaultValues: defaults,
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => onSubmit({ ...value, name: value.name.trim() }),
  })

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        form.handleSubmit()
      }}
    >
      <form.Field name="name">
        {(field) => (
          <div className="flex flex-col gap-2">
            <Label htmlFor="space-name">{m.acct_space_form_name()}</Label>
            <Input
              id="space-name"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              disabled={disabled}
              placeholder={m.acct_space_form_name_placeholder()}
              aria-invalid={field.state.meta.errors.length > 0}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive">
                {(field.state.meta.errors[0] as { message?: string })?.message}
              </p>
            )}
          </div>
        )}
      </form.Field>
      <div className="grid grid-cols-2 gap-3">
        <form.Field name="baseCurrency">
          {(field) => (
            <div className="flex flex-col gap-2">
              <Label htmlFor="space-currency">
                {m.acct_space_form_currency()}
              </Label>
              <select
                id="space-currency"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value as Currency)}
                disabled={disabled}
                className={selectClass}
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          )}
        </form.Field>
        <form.Field name="budgetMonthStartDay">
          {(field) => (
            <div className="flex flex-col gap-2">
              <Label htmlFor="space-start-day">
                {m.acct_space_form_start_day()}
              </Label>
              <select
                id="space-start-day"
                value={field.state.value}
                onChange={(e) => field.handleChange(Number(e.target.value))}
                disabled={disabled}
                aria-describedby="space-start-day-hint"
                className={selectClass}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {m.acct_space_form_day({ day })}
                  </option>
                ))}
              </select>
            </div>
          )}
        </form.Field>
      </div>
      <p
        id="space-start-day-hint"
        className="-mt-2 text-sm text-muted-foreground"
      >
        {m.acct_space_form_start_day_hint()}
      </p>
      <FormError message={error ?? null} />
      {!disabled && (
        <Button type="submit" disabled={pending} className="self-start">
          {submitLabel}
        </Button>
      )}
    </form>
  )
}
