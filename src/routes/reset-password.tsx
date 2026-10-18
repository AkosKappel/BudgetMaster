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

// The emailed link arrives here with `?token=` (or `?error=INVALID_TOKEN` when it expired).
export const Route = createFileRoute('/reset-password')({
  validateSearch: z.object({
    token: z.string().optional().catch(undefined),
    error: z.string().optional().catch(undefined),
  }),
  head: () => ({ meta: [{ title: 'Choose a new password | BudgetMaster' }] }),
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
      <AuthPage title="Link expired">
        <p className="text-muted-foreground">
          This reset link is no longer valid. Links work once and for one hour.
        </p>
        <Button asChild size="lg">
          <Link to="/forgot-password">Send a new link</Link>
        </Button>
      </AuthPage>
    )
  }

  return (
    <AuthPage title="Choose a new password">
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
            setError(
              error.message ?? 'Could not change the password. Try again.',
            )
            return
          }
          toast.success('Password changed. Sign in with the new one.')
          await navigate({ to: '/sign-in' })
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="text-muted-foreground text-sm">
            At least 8 characters. You are signed out on your other devices.
          </p>
        </div>
        <FormError message={error} />
        <Button type="submit" size="lg" disabled={pending || !hydrated}>
          Change password
        </Button>
      </form>
    </AuthPage>
  )
}
