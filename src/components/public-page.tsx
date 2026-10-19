import { Link } from '@tanstack/react-router'

import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'

const LINKS = [
  { to: '/start', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQ' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/security', label: 'Security' },
] as const

export function PublicFooter() {
  return (
    <footer className="text-muted-foreground text-sm">
      <nav aria-label="Information">
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {LINKS.map(({ to, label }) => (
            <li key={to}>
              <Link
                to={to}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  )
}

// About, FAQ and the legal pages: readable without an account.
export function PublicPage({
  title,
  updated,
  children,
}: {
  title: string
  // Shown on the legal pages, as an ISO date.
  updated?: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-10 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <Link to="/start" aria-label="BudgetMaster, home">
          <Logo />
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link to="/sign-in">Sign in or try the demo</Link>
        </Button>
      </header>
      <main className="flex flex-1 flex-col gap-4 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-6 [&_h2]:font-semibold [&_h2]:text-xl [&_li]:ml-5 [&_li]:list-disc [&_p]:max-w-prose [&_p]:leading-relaxed [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        <h1 className="font-semibold text-3xl tracking-tight">{title}</h1>
        {updated && (
          <p className="text-muted-foreground text-sm">
            Last updated {updated}
          </p>
        )}
        {children}
      </main>
      <PublicFooter />
    </div>
  )
}
