import { createFileRoute } from '@tanstack/react-router'

import { PublicPage } from '@/components/public-page'

export const Route = createFileRoute('/security')({
  head: () => ({
    meta: [
      { title: 'Security | BudgetMaster' },
      {
        name: 'description',
        content:
          'How BudgetMaster protects your data, and how to report a problem.',
      },
    ],
  }),
  component: Security,
})

function Security() {
  return (
    <PublicPage title="Security" updated="2026-10-18">
      <h2>How your data is protected</h2>
      <ul>
        <li>Connections use HTTPS only, enforced with HSTS.</li>
        <li>
          Passwords are stored as salted hashes (Better Auth, scrypt), never in
          plain text.
        </li>
        <li>
          Repeated sign-in attempts are rate limited, and requests that change
          data must come from the app itself (CSRF protection).
        </li>
        <li>
          Every request checks that you belong to the space it touches, and
          viewers cannot change anything.
        </li>
        <li>
          A strict Content Security Policy only lets the app's own scripts run.
        </li>
      </ul>

      <h2>Reporting a vulnerability</h2>
      <p>
        Please report security problems privately through{' '}
        <a href="https://github.com/AkosKappel/BudgetMaster/security/advisories/new">
          a GitHub security advisory
        </a>{' '}
        instead of a public issue. Include the steps to reproduce it. You will
        get an answer, and a fix before details are published. Please do not
        access other people's data or degrade the service while testing.
      </p>
      <p>
        Machine-readable contact details are in{' '}
        <a href="/.well-known/security.txt">/.well-known/security.txt</a>.
      </p>
    </PublicPage>
  )
}
