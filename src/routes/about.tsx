import { createFileRoute, Link } from '@tanstack/react-router'

import { PublicPage } from '@/components/public-page'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [
      { title: 'About | BudgetMaster' },
      {
        name: 'description',
        content:
          'BudgetMaster is a mobile-first app for tracking income, expenses and budgets, alone or shared with a partner.',
      },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'BudgetMaster',
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Web',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
          author: { '@type': 'Person', name: 'Ákos Kappel' },
        }),
      },
    ],
  }),
  component: About,
})

function About() {
  return (
    <PublicPage title="About BudgetMaster">
      <p>
        BudgetMaster is a mobile-first personal finance app. It answers three
        questions: where did my money go, how much can I still spend this month,
        and what is coming up. It is built and run by Ákos Kappel as a personal
        project.
      </p>

      <h2>What you can do</h2>
      <ul>
        <li>
          Record income, expenses and transfers in a few seconds with quick add.
          Known payees fill in their usual category and wallet.
        </li>
        <li>
          Track wallets for bank accounts, cards, cash and savings, each in its
          own currency, with balances that follow every transaction.
        </li>
        <li>
          Set a monthly budget and limits per category. The budget month can
          start on payday, and a pace chart shows whether you are on track.
        </li>
        <li>
          Let salary, rent and subscriptions record themselves with recurring
          payments, and pause them when they stop.
        </li>
        <li>
          Organise spending with categories and subcategories, each with an icon
          and a colour.
        </li>
        <li>
          Search and filter every transaction by text, type, category, wallet,
          tag, date and amount. Filters stay in the link, so you can bookmark
          them.
        </li>
        <li>
          Share a space with a partner or flatmates: invite people by link and
          choose who can edit and who can only look.
        </li>
        <li>
          Undo a deleted transaction, find anything with the command palette
          (Ctrl+K), and switch between light and dark mode.
        </li>
        <li>
          Download all your data as JSON or a space's transactions as CSV, and
          delete your account whenever you want.
        </li>
      </ul>

      <h2>Try it</h2>
      <p>
        <Link to="/sign-in">Try the demo</Link> to get a private copy of 14
        months of sample data without signing up. It is deleted after 48 hours
        unless you create an account.
      </p>

      <h2>How it is built</h2>
      <p>
        TanStack Start with React 19 and TypeScript, PostgreSQL with Drizzle
        ORM, Better Auth, Tailwind CSS and shadcn/ui. It runs in Docker on a
        home server. The source code is on{' '}
        <a href="https://github.com/AkosKappel/BudgetMaster">GitHub</a>.
      </p>
    </PublicPage>
  )
}
