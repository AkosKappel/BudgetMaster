import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import {
  type ErrorComponentProps,
  Link,
  useRouter,
} from '@tanstack/react-router'
import { CircleAlert, SearchX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages.js'

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
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children}
    </div>
  )
}

export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter()
  const queryErrorReset = useQueryErrorResetBoundary()
  console.error(error)

  return (
    <StatusPage icon={CircleAlert} title={m.shell_error_title()}>
      <p className="text-sm text-muted-foreground">{m.shell_error_body()}</p>
      <div className="flex gap-2">
        <Button
          onClick={() => {
            // Suspense queries keep their error until reset, so clear them before reloading.
            queryErrorReset.reset()
            router.invalidate()
          }}
        >
          {m.shell_error_retry()}
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">{m.shell_go_home()}</Link>
        </Button>
      </div>
    </StatusPage>
  )
}

export function NotFound() {
  return (
    <StatusPage icon={SearchX} title={m.shell_not_found_title()}>
      <p className="text-sm text-muted-foreground">
        {m.shell_not_found_body()}
      </p>
      <Button asChild>
        <Link to="/">{m.shell_go_home()}</Link>
      </Button>
    </StatusPage>
  )
}
