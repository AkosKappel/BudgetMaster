import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import {
  type ErrorComponentProps,
  Link,
  useRouter,
} from '@tanstack/react-router'
import { CircleAlert, SearchX } from 'lucide-react'

import { Button } from '@/components/ui/button'

function StatusPage({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof CircleAlert
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-4 px-4 py-16">
      <Icon className="size-8 text-muted-foreground" strokeWidth={1.5} />
      <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
      {children}
    </div>
  )
}

export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter()
  const queryErrorReset = useQueryErrorResetBoundary()
  console.error(error)

  return (
    <StatusPage icon={CircleAlert} title="Something went wrong">
      <p className="text-muted-foreground text-sm">
        This page could not be loaded. Your data is safe; try again in a moment.
      </p>
      <div className="flex gap-2">
        <Button
          onClick={() => {
            // Suspense queries keep their error until reset, so clear them before reloading.
            queryErrorReset.reset()
            router.invalidate()
          }}
        >
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </StatusPage>
  )
}

export function NotFound() {
  return (
    <StatusPage icon={SearchX} title="Page not found">
      <p className="text-muted-foreground text-sm">
        The link may be old, or the page was moved.
      </p>
      <Button asChild>
        <Link to="/">Go home</Link>
      </Button>
    </StatusPage>
  )
}
