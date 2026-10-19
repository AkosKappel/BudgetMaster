import { createFileRoute, Link, redirect } from '@tanstack/react-router'

import {
  AuthPage,
  FormError,
  redirectSearch,
  useAuthSubmit,
} from '@/components/auth-page'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { sessionQuery } from '@/lib/queries'
import { withCanonical } from '@/lib/site'

export const Route = createFileRoute('/sign-up')({
  validateSearch: redirectSearch,
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery)
    // A demo user may sign up (keeping the demo data) or sign in to a real account.
    if (session && !session.user.demoExpiresAt)
      throw redirect({ to: search.redirect ?? '/' })
  },
  head: () =>
    withCanonical('/sign-up', {
      meta: [{ title: 'Create account | BudgetMaster' }],
    }),
  component: SignUp,
})

function SignUp() {
  const search = Route.useSearch()
  // New accounts set up their first wallet; a kept demo skips this (it has wallets).
  const { run, error, pending } = useAuthSubmit(search.redirect ?? '/welcome')

  return (
    <AuthPage title="Create account">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          run(() =>
            authClient.signUp.email({
              name: String(form.get('name')),
              email: String(form.get('email')),
              password: String(form.get('password')),
            }),
          )
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="text-muted-foreground text-sm">
            At least 8 characters.
          </p>
        </div>
        <FormError message={error} />
        <Button type="submit" size="lg" disabled={pending}>
          Create account
        </Button>
        <p className="text-muted-foreground text-sm">
          Already have an account?{' '}
          <Link
            to="/sign-in"
            search={{ redirect: search.redirect }}
            className="text-foreground underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthPage>
  )
}
