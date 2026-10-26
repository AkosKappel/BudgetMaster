import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import {
  ChartColumn,
  FlaskConical,
  Goal,
  Import,
  Lock,
  Repeat,
  Users,
  Zap,
} from 'lucide-react'

import { FormError, useAuthSubmit } from '@/components/auth-page'
import { Guilloche } from '@/components/guilloche'
import { Logo } from '@/components/logo'
import { PublicFooter } from '@/components/public-page'
import { Button } from '@/components/ui/button'
import { useIsClient } from '@/hooks/use-is-client'
import { authClient } from '@/lib/auth-client'
import { sessionQuery } from '@/lib/queries'
import { withCanonical } from '@/lib/site'
import { m } from '@/paraglide/messages.js'

// The public front door: what the app is, screenshots and the demo. Signed-out visitors
// opening `/` land here; signed-in users go straight to the app.
export const Route = createFileRoute('/start')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery)
    if (session && !session.user.demoExpiresAt) throw redirect({ to: '/' })
  },
  head: () =>
    withCanonical('/start', {
      meta: [
        { title: m.pub_start_title() },
        { name: 'description', content: m.pub_start_description() },
      ],
    }),
  component: Start,
})

// Functions, so the text is read in the visitor's language on every render.
const features = () => [
  {
    icon: Zap,
    title: m.pub_start_feature_quick_title(),
    text: m.pub_start_feature_quick_text(),
  },
  {
    icon: ChartColumn,
    title: m.pub_start_feature_insight_title(),
    text: m.pub_start_feature_insight_text(),
  },
  {
    icon: Repeat,
    title: m.pub_start_feature_budgets_title(),
    text: m.pub_start_feature_budgets_text(),
  },
  {
    icon: Users,
    title: m.pub_start_feature_shared_title(),
    text: m.pub_start_feature_shared_text(),
  },
  {
    icon: Import,
    title: m.pub_start_feature_import_title(),
    text: m.pub_start_feature_import_text(),
  },
  {
    icon: Goal,
    title: m.pub_start_feature_goals_title(),
    text: m.pub_start_feature_goals_text(),
  },
]

const screens = () => [
  { src: '/screens/home.webp', alt: m.pub_start_screen_home() },
  { src: '/screens/budgets.webp', alt: m.pub_start_screen_budgets() },
  { src: '/screens/reports.webp', alt: m.pub_start_screen_reports() },
]

function Start() {
  const { run, error, pending } = useAuthSubmit('/')
  const hydrated = useIsClient()

  const tryDemo = (
    <Button
      size="lg"
      disabled={pending || !hydrated}
      onClick={() => run(() => authClient.signIn.anonymous())}
    >
      <FlaskConical />
      {m.pub_start_try_demo()}
    </Button>
  )

  return (
    <div className="relative isolate overflow-hidden">
      <Guilloche className="absolute -top-40 -right-40 -z-10 size-[36rem] mask-b-from-40% text-note/25" />
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-16 px-4 py-8">
        <header className="flex items-center justify-between gap-4">
          <Logo />
          <Button asChild variant="outline" size="sm">
            <Link to="/sign-in">{m.pub_start_sign_in()}</Link>
          </Button>
        </header>

        <main className="flex flex-col gap-20">
          <section className="flex max-w-2xl flex-col gap-6">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {m.pub_start_heading()}
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              {m.pub_start_intro()}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {tryDemo}
              <Button asChild size="lg" variant="outline">
                <Link to="/sign-up">{m.pub_start_create_account()}</Link>
              </Button>
            </div>
            <FormError message={error} />
            <p className="text-sm text-muted-foreground">
              {m.pub_start_demo_note()}
            </p>
          </section>

          {/* Scrolls sideways on phones, so it takes keyboard focus to scroll with the arrows. */}
          <section
            aria-label={m.pub_start_screenshots()}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable by keyboard (WCAG 2.1.1)
            tabIndex={0}
            className="snap-x overflow-x-auto rounded-xl pb-2 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:overflow-visible"
          >
            <ul className="flex gap-4 sm:grid sm:grid-cols-3">
              {screens().map((s) => (
                <li key={s.src} className="w-56 shrink-0 snap-start sm:w-auto">
                  <img
                    src={s.src}
                    alt={s.alt}
                    width={390}
                    height={844}
                    loading="lazy"
                    className="w-full rounded-[1.75rem] border-4 border-foreground/90 shadow-lg"
                  />
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="features" className="flex flex-col gap-8">
            <h2
              id="features"
              className="text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              {m.pub_start_features_heading()}
            </h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features().map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex flex-col gap-2">
                  <Icon className="size-5 text-note" aria-hidden="true" />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="leading-relaxed text-muted-foreground">
                    {text}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="privacy"
            className="flex flex-col gap-4 rounded-xl border bg-card p-6 sm:flex-row sm:items-center sm:gap-6"
          >
            <Lock className="size-8 shrink-0 text-note" aria-hidden="true" />
            <div className="flex flex-1 flex-col gap-1">
              <h2 id="privacy" className="text-lg font-semibold">
                {m.pub_start_privacy_heading()}
              </h2>
              <p className="text-muted-foreground">
                {m.pub_start_privacy_text()}{' '}
                <Link to="/privacy" className="underline underline-offset-4">
                  {m.pub_start_privacy_link()}
                </Link>
                .
              </p>
            </div>
            {tryDemo}
          </section>
        </main>

        <PublicFooter />
      </div>
    </div>
  )
}
