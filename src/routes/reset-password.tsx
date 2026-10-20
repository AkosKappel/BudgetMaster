import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import { AuthPage, FormError } from '@/components/auth-page'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useIsClient } from '@/hooks/use-is-client'
import { authClient } from '@/lib/auth-client'
import { m } from '@/paraglide/messages.js'

// The emailed link arrives here with `?token=` (or `?error=INVALID_TOKEN` when it expired).
export const Route = createFileRoute('/reset-password')({
  validateSearch: z.object({
    token: z.string().optional().catch(undefined),
    error: z.string().optional().catch(undefined),
  }),
  head: () => ({
    meta: [{ title: `${m.acct_reset_title()} | BudgetMaster` }],
  }),
  component: ResetPassword,
})

function ResetPassword() {
  const { token, error: linkError } = Route.useSearch()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const hydrated = useIsClient()

  if (!token || linkError) {
    return (
      <AuthPage title={m.acct_reset_expired_title()}>
        <p className="text-muted-foreground">{m.acct_reset_expired_text()}</p>
        <Button asChild size="lg">
          <Link to="/forgot-password">{m.acct_reset_new_link()}</Link>
        </Button>
      </AuthPage>
    )
  }

  return (
    <AuthPage title={m.acct_reset_title()}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setError(null)
          setPending(true)
          const newPassword = String(
            new FormData(event.currentTarget).get('password'),
          )
          const { error } = await authClient.resetPassword({
            newPassword,
            token,
          })
          setPending(false)
          if (error) {
            setError(error.message ?? m.acct_reset_error())
            return
          }
          toast.success(m.acct_reset_done())
          await navigate({ to: '/sign-in' })
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{m.acct_reset_new_password()}</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="text-muted-foreground text-sm">{m.acct_reset_hint()}</p>
        </div>
        <FormError message={error} />
        <Button type="submit" size="lg" disabled={pending || !hydrated}>
          {m.acct_reset_submit()}
        </Button>
      </form>
    </AuthPage>
  )
}
