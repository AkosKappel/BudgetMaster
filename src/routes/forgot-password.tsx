import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

import { AuthPage, FormError } from '@/components/auth-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useIsClient } from '@/hooks/use-is-client'
import { authClient } from '@/lib/auth-client'
import { m } from '@/paraglide/messages.js'

export const Route = createFileRoute('/forgot-password')({
  head: () => ({
    meta: [{ title: `${m.acct_forgot_title()} | BudgetMaster` }],
  }),
  component: ForgotPassword,
})

function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const hydrated = useIsClient()

  return (
    <AuthPage title={m.acct_forgot_title()}>
      {sent ? (
        <p role="status" className="text-muted-foreground">
          {m.acct_forgot_sent()}
        </p>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            setError(null)
            setPending(true)
            const email = String(new FormData(event.currentTarget).get('email'))
            const { error } = await authClient.requestPasswordReset({
              email,
              redirectTo: '/reset-password',
            })
            setPending(false)
            // Better Auth answers the same whether or not the address has an account, so an
            // error here is a real one (too many requests, no connection).
            if (error) setError(error.message ?? m.acct_forgot_error())
            else setSent(true)
          }}
        >
          <p className="text-muted-foreground text-sm">
            {m.acct_forgot_intro()}
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{m.acct_auth_email()}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <FormError message={error} />
          <Button type="submit" size="lg" disabled={pending || !hydrated}>
            {m.acct_forgot_send()}
          </Button>
        </form>
      )}
      <p className="text-muted-foreground text-sm">
        <Link to="/sign-in" className="text-foreground underline">
          {m.acct_auth_back_to_sign_in()}
        </Link>
      </p>
    </AuthPage>
  )
}
