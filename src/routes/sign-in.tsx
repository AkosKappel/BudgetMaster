import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { FlaskConical, KeyRound } from 'lucide-react'

import {
  AuthPage,
  FormError,
  GoogleSignIn,
  redirectSearch,
  useAuthSubmit,
} from '@/components/auth-page'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/lib/demo'
import { sessionQuery, signInOptionsQuery } from '@/lib/queries'
import { withCanonical } from '@/lib/site'

export const Route = createFileRoute('/sign-in')({
  validateSearch: redirectSearch,
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery)
    // A demo user may sign up (keeping the demo data) or sign in to a real account.
    if (session && !session.user.demoExpiresAt)
      throw redirect({ to: search.redirect ?? '/' })
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(signInOptionsQuery),
  head: () =>
    withCanonical('/sign-in', { meta: [{ title: 'Sign in | BudgetMaster' }] }),
  component: SignIn,
})

function SignIn() {
  const search = Route.useSearch()
  const { run, error, pending } = useAuthSubmit(search.redirect)

  const signIn = (email: string, password: string) =>
    run(() => authClient.signIn.email({ email, password }))

  return (
    <AuthPage title="Sign in">
      <GoogleSignIn redirect={search.redirect} />
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          signIn(String(form.get('email')), String(form.get('password')))
        }}
      >
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
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </div>
        <FormError message={error} />
        <Button type="submit" size="lg" disabled={pending}>
          Sign in
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={pending}
          onClick={() => run(() => authClient.signIn.passkey())}
        >
          <KeyRound />
          Sign in with a passkey
        </Button>
        <p className="text-muted-foreground text-sm">
          New here?{' '}
          <Link
            to="/sign-up"
            search={{ redirect: search.redirect }}
            className="text-foreground underline"
          >
            Create an account
          </Link>
        </p>
      </form>

      <section aria-labelledby="demo" className="flex flex-col gap-3">
        <h2 id="demo" className="font-medium">
          Try it with demo data
        </h2>
        <p className="text-muted-foreground text-sm">
          Get a private copy of 14 months of sample data, no sign-up needed. It
          is deleted after 48 hours unless you create an account.
        </p>
        <Button
          variant="outline"
          size="lg"
          disabled={pending}
          onClick={() => run(() => authClient.signIn.anonymous())}
        >
          <FlaskConical />
          Try the demo
        </Button>
        {/* Shared logins from `pnpm db:seed`, for development only: in production every
            visitor gets a private demo instead. */}
        {import.meta.env.DEV && (
          <ul className="flex flex-col divide-y rounded-lg border bg-card">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => signIn(account.email, DEMO_PASSWORD)}
                  className="flex w-full flex-col items-start px-4 py-3 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:opacity-50"
                >
                  <span className="font-medium">{account.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {account.description}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AuthPage>
  )
}
