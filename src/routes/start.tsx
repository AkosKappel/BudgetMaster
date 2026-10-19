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
        { title: 'BudgetMaster: income, spending and budgets on your phone' },
        {
          name: 'description',
          content:
            'A calm money app for your phone: quick add, budgets that start on payday, recurring payments, reports and shared spaces. Try the demo without signing up.',
        },
      ],
    }),
  component: Start,
})

const FEATURES = [
  {
    icon: Zap,
    title: 'Five-second quick add',
    text: 'Known payees fill in their category and wallet. Rules and recurring payments do the rest.',
  },
  {
    icon: ChartColumn,
    title: 'Know where it went',
    text: 'Spending pace, cash flow, net worth, a spending calendar and a printable monthly report.',
  },
  {
    icon: Repeat,
    title: 'Budgets that start on payday',
    text: 'Limits per category, warnings before you go over, and a 90-day forecast of your balance.',
  },
  {
    icon: Users,
    title: 'Shared spaces',
    text: 'Keep a household budget with a partner while personal money stays personal.',
  },
  {
    icon: Import,
    title: 'Bank statement import',
    text: 'Bring in a CSV export, review every row, skip duplicates. Your bank layout is remembered.',
  },
  {
    icon: Goal,
    title: 'Savings goals',
    text: 'Point a goal at a savings wallet and see what a month needs to reach it on time.',
  },
]

const SCREENS = [
  {
    src: '/screens/home.webp',
    alt: 'Home: left to spend this month and the spending pace',
  },
  {
    src: '/screens/budgets.webp',
    alt: 'Budgets: limits per category with how much is used',
  },
  {
    src: '/screens/reports.webp',
    alt: 'Reports: income and spending month by month',
  },
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
      Try the demo
    </Button>
  )

  return (
    <div className="relative isolate overflow-hidden">
      <Guilloche className="mask-b-from-40% absolute -top-40 -right-40 -z-10 size-[36rem] text-note/25" />
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-16 px-4 py-8">
        <header className="flex items-center justify-between gap-4">
          <Logo />
          <Button asChild variant="outline" size="sm">
            <Link to="/sign-in">Sign in</Link>
          </Button>
        </header>

        <main className="flex flex-col gap-20">
          <section className="flex max-w-2xl flex-col gap-6">
            <h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">
              Know what you can still spend this month.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              BudgetMaster is a calm money app for your phone. Record a purchase
              in a few seconds, keep budgets that start on payday, and see where
              your money went, alone or with a partner.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {tryDemo}
              <Button asChild size="lg" variant="outline">
                <Link to="/sign-up">Create an account</Link>
              </Button>
            </div>
            <FormError message={error} />
            <p className="text-muted-foreground text-sm">
              The demo is a private copy of 14 months of sample data, deleted
              after 48 hours unless you sign up. No card, no email.
            </p>
          </section>

          {/* Scrolls sideways on phones, so it takes keyboard focus to scroll with the arrows. */}
          <section
            aria-label="Screenshots"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable by keyboard (WCAG 2.1.1)
            tabIndex={0}
            className="snap-x overflow-x-auto rounded-xl pb-2 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:overflow-visible"
          >
            <ul className="flex gap-4 sm:grid sm:grid-cols-3">
              {SCREENS.map((s) => (
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
              className="font-semibold text-2xl tracking-tight sm:text-3xl"
            >
              Capture, understand, plan
            </h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex flex-col gap-2">
                  <Icon className="size-5 text-note" aria-hidden="true" />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
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
              <h2 id="privacy" className="font-semibold text-lg">
                Your data stays yours
              </h2>
              <p className="text-muted-foreground">
                No ads, no tracking, no bank passwords. Export everything at any
                time, delete your account in one step, and sign in with a
                passkey or two-step sign-in.{' '}
                <Link to="/privacy" className="underline underline-offset-4">
                  How data is handled
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
