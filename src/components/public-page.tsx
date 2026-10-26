import { Link } from '@tanstack/react-router'

import { Logo } from '@/components/logo'
import { ThemeMenu } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { LANGUAGES } from '@/lib/locale'
import { m } from '@/paraglide/messages.js'
import { getLocale, type Locale, setLocale } from '@/paraglide/runtime.js'

const links = () =>
  [
    { to: '/start', label: m.pub_nav_home() },
    { to: '/about', label: m.pub_nav_about() },
    { to: '/faq', label: m.pub_nav_faq() },
    { to: '/privacy', label: m.pub_nav_privacy() },
    { to: '/terms', label: m.pub_nav_terms() },
    { to: '/security', label: m.pub_nav_security() },
  ] as const

// Visitors without an account pick the language here; signed-in users also have it in
// Settings. setLocale stores it in a cookie and reloads the page.
function LanguageSelect() {
  return (
    <select
      aria-label={m.pub_language_label()}
      value={getLocale()}
      onChange={(event) => setLocale(event.target.value as Locale)}
      className="h-8 rounded-md border border-input bg-card px-2 text-sm"
    >
      {LANGUAGES.map((language) => (
        <option
          key={language.locale}
          value={language.locale}
          lang={language.locale}
        >
          {language.name}
        </option>
      ))}
    </select>
  )
}

export function PublicFooter() {
  return (
    <footer className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <nav aria-label={m.pub_nav_label()}>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {links().map(({ to, label }) => (
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
      <div className="flex shrink-0 items-center gap-1">
        <LanguageSelect />
        <ThemeMenu />
      </div>
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
        <Link to="/start" aria-label={m.pub_home_link_label()}>
          <Logo />
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link to="/sign-in">{m.pub_page_sign_in_or_demo()}</Link>
        </Button>
      </header>
      <main className="flex flex-1 flex-col gap-4 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:max-w-prose [&_p]:leading-relaxed [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {updated && (
          <p className="text-sm text-muted-foreground">
            {m.pub_page_last_updated({ date: updated })}
          </p>
        )}
        {children}
      </main>
      <PublicFooter />
    </div>
  )
}
