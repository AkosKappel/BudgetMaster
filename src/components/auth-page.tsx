import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { Guilloche } from '@/components/guilloche'
import { authClient } from '@/lib/auth-client'

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
        <p className="font-semibold text-lg tracking-tight">BudgetMaster</p>
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
  return async () => {
    await authClient.signOut()
    queryClient.clear()
    await navigate({ to: '/sign-in' })
  }
}
