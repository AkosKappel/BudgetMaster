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

// Second step of signing in when the account has two-step sign-in on. The password step
// left a short-lived cookie that these calls complete.
export const Route = createFileRoute('/two-factor')({
  validateSearch: redirectSearch,
  head: () => ({ meta: [{ title: 'Two-step sign-in | BudgetMaster' }] }),
  component: TwoFactor,
})

function TwoFactor() {
  const search = Route.useSearch()
  const { run, error, pending } = useAuthSubmit(search.redirect)
  const [backup, setBackup] = useState(false)
  const hydrated = useIsClient()

  return (
    <AuthPage title="Two-step sign-in">
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
            ? 'Enter one of the backup codes you saved. Each code works once.'
            : 'Enter the 6-digit code from your authenticator app.'}
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">{backup ? 'Backup code' : 'Code'}</Label>
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
          Trust this browser for 30 days
        </label>
        <FormError message={error} />
        <Button type="submit" size="lg" disabled={pending || !hydrated}>
          Verify
        </Button>
        <button
          type="button"
          className="w-fit text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => setBackup(!backup)}
        >
          {backup ? 'Use the authenticator app' : 'Use a backup code instead'}
        </button>
        <Link
          to="/sign-in"
          search={{ redirect: search.redirect }}
          className="w-fit text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to sign in
        </Link>
      </form>
    </AuthPage>
  )
}
