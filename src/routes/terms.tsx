import { createFileRoute, Link } from '@tanstack/react-router'

import { PublicPage } from '@/components/public-page'
import { withCanonical } from '@/lib/site'

export const Route = createFileRoute('/terms')({
  head: () =>
    withCanonical('/terms', {
      meta: [
        { title: 'Terms of use | BudgetMaster' },
        { name: 'description', content: 'The terms for using BudgetMaster.' },
      ],
    }),
  component: Terms,
})

function Terms() {
  return (
    <PublicPage title="Terms of use" updated="2026-10-18">
      <p>
        BudgetMaster is a free personal project by Ákos Kappel. By using it you
        agree to these terms.
      </p>

      <h2>Provided as is</h2>
      <p>
        The app is offered without warranty. It may have bugs, change, be
        unavailable at times or stop. Keep your own copy of anything important
        with the export under More, Your data.
      </p>

      <h2>Not financial advice</h2>
      <p>
        Budgets, charts and projections are tools for your own planning, not
        financial, tax or legal advice.
      </p>

      <h2>Your data</h2>
      <p>
        You own what you enter. How it is handled is described on the{' '}
        <Link to="/privacy">privacy page</Link>.
      </p>

      <h2>Fair use</h2>
      <p>
        Do not try to access other people's data, overload the service or use it
        for anything unlawful. Accounts that do may be removed.
      </p>
    </PublicPage>
  )
}
