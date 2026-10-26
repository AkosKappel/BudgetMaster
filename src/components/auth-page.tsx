import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'

import { Guilloche } from '@/components/guilloche'
import { Logo } from '@/components/logo'
import { PublicFooter } from '@/components/public-page'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { signInOptionsQuery } from '@/lib/queries'
import { m } from '@/paraglide/messages.js'

// `?redirect=` on the auth pages: same-site paths only, never `//other.site` or
// `/\other.site` (browsers read the backslash as a slash).
export const redirectSearch = z.object({
  redirect: z
    .string()
    .regex(/^\/(?![/\\])/)
    .optional()
    .catch(undefined),
})

// Wraps the sign-in and sign-up pages: brand, title and a shared submit flow.
export function AuthPage({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <main className="relative isolate mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 overflow-hidden px-4 py-10">
      <Guilloche className="absolute -top-24 -right-32 -z-10 size-96 mask-b-from-40% text-note/30" />
      <div>
        <Logo />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{title}</h1>
      </div>
      {children}
      <PublicFooter />
    </main>
  )
}

// Runs an auth call; on success clears cached data from any previous user and goes on.
export function useAuthSubmit(redirectTo = '/') {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function run(
    action: () => Promise<{
      data?: unknown
      error: { message?: string } | null
    }>,
  ) {
    setError(null)
    setPending(true)
    try {
      const { data, error } = await action()
      if (error) {
        setError(error.message ?? m.acct_auth_error_generic())
        return
      }
      // The password was right, but the account also asks for an authenticator code.
      if (data && typeof data === 'object' && 'twoFactorRedirect' in data) {
        await navigate({ to: '/two-factor', search: { redirect: redirectTo } })
        return
      }
      queryClient.clear()
      await navigate({ to: redirectTo })
    } catch {
      setError(m.acct_auth_error_offline())
    } finally {
      setPending(false)
    }
  }

  return { run, error, pending }
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  )
}

export function useSignOut() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  // `redirect` brings the next person who signs in back to the same page (e.g. an invite).
  return async (redirect?: string) => {
    await authClient.signOut()
    queryClient.clear()
    await navigate({ to: '/sign-in', search: { redirect } })
  }
}

// Social sign-in buttons for the providers the server has an OAuth client for. The browser
// leaves for the provider and comes back to `redirect` (or `newUserRedirect` for a new account).
export function SocialSignIn({
  redirect = '/',
  newUserRedirect = '/welcome',
}: {
  redirect?: string
  newUserRedirect?: string
}) {
  const { data } = useSuspenseQuery(signInOptionsQuery)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const providers = SOCIAL_PROVIDERS.filter(({ id }) => data[id])
  if (providers.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {providers.map(({ id, label, Logo }) => (
        <Button
          key={id}
          type="button"
          variant="outline"
          size="lg"
          disabled={pending}
          onClick={async () => {
            setError(null)
            setPending(true)
            const result = await authClient.signIn.social({
              provider: id,
              callbackURL: redirect,
              newUserCallbackURL: newUserRedirect,
              errorCallbackURL: '/sign-in',
            })
            if (result.error) {
              setError(
                result.error.message ??
                  m.acct_auth_provider_unreachable({ provider: label }),
              )
              setPending(false)
            }
          }}
        >
          <Logo />
          {m.acct_auth_continue_with({ provider: label })}
        </Button>
      ))}
      <FormError message={error} />
    </div>
  )
}

export const SOCIAL_PROVIDERS = [
  { id: 'google', label: 'Google', Logo: GoogleLogo },
  { id: 'github', label: 'GitHub', Logo: GitHubLogo },
  { id: 'apple', label: 'Apple', Logo: AppleLogo },
  { id: 'microsoft', label: 'Microsoft', Logo: MicrosoftLogo },
] as const

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
      <path d="M16.37 12.73c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.8 1.3 10.35.86 1.25 1.89 2.65 3.23 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.28-1.27 3.13-2.53.99-1.45 1.4-2.85 1.42-2.92-.03-.01-2.72-1.04-2.75-4.14ZM13.79 5.1c.71-.87 1.2-2.07 1.06-3.27-1.03.04-2.28.69-3.02 1.55-.66.77-1.24 2-1.09 3.18 1.15.09 2.33-.58 3.05-1.46Z" />
    </svg>
  )
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
      <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
      <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
      <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
    </svg>
  )
}

function GitHubLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.82-.26.82-.57v-2c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3Z" />
    </svg>
  )
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3a7.16 7.16 0 0 1-10.67-3.76H1.38v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.39 14.33a7.2 7.2 0 0 1 0-4.66v-3.1H1.38a12 12 0 0 0 0 10.86l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.8l3.44-3.45A11.96 11.96 0 0 0 1.38 6.57l4.01 3.1A7.16 7.16 0 0 1 12 4.77Z"
      />
    </svg>
  )
}
