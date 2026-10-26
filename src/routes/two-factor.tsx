import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

import {
  AuthPage,
  FormError,
  redirectSearch,
  useAuthSubmit,
} from '@/components/auth-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useIsClient } from '@/hooks/use-is-client'
import { authClient } from '@/lib/auth-client'
import { m } from '@/paraglide/messages.js'

// Second step of signing in when the account has two-step sign-in on. The password step
// left a short-lived cookie that these calls complete.
export const Route = createFileRoute('/two-factor')({
  validateSearch: redirectSearch,
  head: () => ({
    meta: [{ title: `${m.acct_two_factor_title()} | BudgetMaster` }],
  }),
  component: TwoFactor,
})

function TwoFactor() {
  const search = Route.useSearch()
  const { run, error, pending } = useAuthSubmit(search.redirect)
  const [backup, setBackup] = useState(false)
  const hydrated = useIsClient()

  return (
    <AuthPage title={m.acct_two_factor_title()}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          const code = String(form.get('code')).replace(/\s/g, '')
          const trustDevice = form.get('trust') === 'on'
          run(() =>
            backup
              ? authClient.twoFactor.verifyBackupCode({ code, trustDevice })
              : authClient.twoFactor.verifyTotp({ code, trustDevice }),
          )
        }}
      >
        <p className="text-muted-foreground">
          {backup
            ? m.acct_two_factor_backup_intro()
            : m.acct_two_factor_totp_intro()}
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">
            {backup
              ? m.acct_two_factor_backup_code()
              : m.acct_two_factor_code()}
          </Label>
          <Input
            key={backup ? 'backup' : 'totp'}
            id="code"
            name="code"
            required
            autoFocus
            autoComplete="one-time-code"
            inputMode={backup ? 'text' : 'numeric'}
            pattern={backup ? undefined : '[0-9 ]{6,7}'}
            maxLength={backup ? 20 : 7}
            className="text-lg tracking-widest"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="trust" className="size-4" />
          {m.acct_two_factor_trust()}
        </label>
        <FormError message={error} />
        <Button type="submit" size="lg" disabled={pending || !hydrated}>
          {m.acct_two_factor_verify()}
        </Button>
        <button
          type="button"
          className="w-fit text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => setBackup(!backup)}
        >
          {backup
            ? m.acct_two_factor_use_app()
            : m.acct_two_factor_use_backup()}
        </button>
        <Link
          to="/sign-in"
          search={{ redirect: search.redirect }}
          className="w-fit text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {m.acct_auth_back_to_sign_in()}
        </Link>
      </form>
    </AuthPage>
  )
}
