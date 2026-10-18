import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { AuthPage, FormError, useAuthSubmit } from '@/components/auth-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/lib/demo'
import { sessionQuery } from '@/lib/queries'

// Only same-site paths, never `//other.site`.
const searchSchema = z.object({
  redirect: z
    .string()
    .regex(/^\/(?!\/)/)
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/sign-in')({
  validateSearch: searchSchema,
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery)
    if (session) throw redirect({ to: search.redirect ?? '/' })
  },
  head: () => ({ meta: [{ title: 'Sign in | BudgetMaster' }] }),
  component: SignIn,
})

function SignIn() {
  const search = Route.useSearch()
  const { run, error, pending } = useAuthSubmit(search.redirect)

  const signIn = (email: string, password: string) =>
    run(() => authClient.signIn.email({ email, password }))

  return (
    <AuthPage title="Sign in">
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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <FormError message={error} />
        <Button type="submit" size="lg" disabled={pending}>
          Sign in
        </Button>
        <p className="text-muted-foreground text-sm">
          New here?{' '}
          <Link to="/sign-up" className="text-foreground underline">
            Create an account
          </Link>
        </p>
      </form>

      <section aria-labelledby="demo" className="flex flex-col gap-3">
        <h2 id="demo" className="font-medium">
          Try it with demo data
        </h2>
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
      </section>
    </AuthPage>
  )
}
