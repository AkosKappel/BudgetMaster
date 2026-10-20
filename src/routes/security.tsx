import { createFileRoute } from '@tanstack/react-router'

import { PublicPage } from '@/components/public-page'
import { withCanonical } from '@/lib/site'
import { m } from '@/paraglide/messages.js'

export const Route = createFileRoute('/security')({
  head: () =>
    withCanonical('/security', {
      meta: [
        { title: m.pub_security_title() },
        { name: 'description', content: m.pub_security_description() },
      ],
    }),
  component: Security,
})

function Security() {
  return (
    <PublicPage title={m.pub_security_heading()} updated="2026-10-18">
      <h2>{m.pub_security_protected()}</h2>
      <ul>
        <li>{m.pub_security_https()}</li>
        <li>{m.pub_security_passwords()}</li>
        <li>{m.pub_security_rate()}</li>
        <li>{m.pub_security_membership()}</li>
        <li>{m.pub_security_csp()}</li>
      </ul>

      <h2>{m.pub_security_report()}</h2>
      <p>
        {m.pub_security_report_before()}{' '}
        <a href="https://github.com/AkosKappel/BudgetMaster/security/advisories/new">
          {m.pub_security_report_link()}
        </a>{' '}
        {m.pub_security_report_after()}
      </p>
      <p>
        {m.pub_security_contact()}{' '}
        <a href="/.well-known/security.txt">/.well-known/security.txt</a>.
      </p>
    </PublicPage>
  )
}
