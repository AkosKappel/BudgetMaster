import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'

import { Guilloche } from '@/components/guilloche'
import { Logo } from '@/components/logo'
import { authClient } from '@/lib/auth-client'

// `?redirect=` on the auth pages: same-site paths only, never `//other.site`.
export const redirectSearch = z.object({
  redirect: z
    .string()
    .regex(/^\/(?!\/)/)
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
      <Guilloche className="mask-b-from-40% absolute -top-24 -right-32 -z-10 size-96 text-note/30" />
      <div>
        <Logo />
        <h1 className="mt-6 font-semibold text-3xl tracking-tight">{title}</h1>
      </div>
      {children}
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
    action: () => Promise<{ error: { message?: string } | null }>,
  ) {
    setError(null)
    setPending(true)
    try {
      const { error } = await action()
      if (error) {
        setError(error.message ?? 'Something went wrong. Try again.')
        return
      }
      queryClient.clear()
      await navigate({ to: redirectTo })
    } catch {
      setError(
        'Could not reach the server. Check your connection and try again.',
      )
    } finally {
      setPending(false)
    }
  }

  return { run, error, pending }
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-destructive text-sm">
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
