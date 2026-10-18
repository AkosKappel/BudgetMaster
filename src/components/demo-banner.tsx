import { Link, useRouteContext } from '@tanstack/react-router'
import { FlaskConical } from 'lucide-react'

// Shown to "Try the demo" visitors: their data is temporary until they sign up.
export function DemoBanner() {
  const { user } = useRouteContext({ from: '/_app' })
  if (!user.demoExpiresAt) return null
  const hours = Math.max(
    1,
    Math.ceil((Date.parse(user.demoExpiresAt) - Date.now()) / 3_600_000),
  )

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
      <FlaskConical className="size-4 shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1">
        Demo data, deleted in {hours} h.{' '}
        <Link to="/sign-up" className="font-medium underline">
          Sign up to keep it
        </Link>
      </p>
    </div>
  )
}

export const accountLabel = (user: {
  email: string
  demoExpiresAt: string | null
}) => (user.demoExpiresAt ? 'Temporary demo account' : user.email)
