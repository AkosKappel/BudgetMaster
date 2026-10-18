import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

import { AuthPage, FormError } from '@/components/auth-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useIsClient } from '@/hooks/use-is-client'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/forgot-password')({
  head: () => ({ meta: [{ title: 'Forgot password | BudgetMaster' }] }),
  component: ForgotPassword,
})

function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const hydrated = useIsClient()

  return (
    <AuthPage title="Forgot password">
      {sent ? (
        <p role="status" className="text-muted-foreground">
          If an account uses that address, an email with a link to choose a new
          password is on its way. The link works for one hour.
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
            if (error) setError(error.message ?? 'Try again later.')
            else setSent(true)
          }}
        >
          <p className="text-muted-foreground text-sm">
            Enter the email address of your account and we send you a link to
            choose a new password.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
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
            Send link
          </Button>
        </form>
      )}
      <p className="text-muted-foreground text-sm">
        <Link to="/sign-in" className="text-foreground underline">
          Back to sign in
        </Link>
      </p>
    </AuthPage>
  )
}
