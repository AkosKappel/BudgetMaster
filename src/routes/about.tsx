import { createFileRoute, Link } from '@tanstack/react-router'

import { PublicPage } from '@/components/public-page'
import { withCanonical } from '@/lib/site'
import { m } from '@/paraglide/messages.js'

export const Route = createFileRoute('/about')({
  head: () =>
    withCanonical('/about', {
      meta: [
        { title: m.pub_about_title() },
        { name: 'description', content: m.pub_about_description() },
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
    <PublicPage title={m.pub_about_heading()}>
      <p>{m.pub_about_intro()}</p>

      <h2>{m.pub_about_can_do()}</h2>
      <ul>
        <li>{m.pub_about_f_quick()}</li>
        <li>{m.pub_about_f_wallets()}</li>
        <li>{m.pub_about_f_budgets()}</li>
        <li>{m.pub_about_f_recurring()}</li>
        <li>{m.pub_about_f_reports()}</li>
        <li>{m.pub_about_f_import()}</li>
        <li>{m.pub_about_f_goals()}</li>
        <li>{m.pub_about_f_categories()}</li>
        <li>{m.pub_about_f_search()}</li>
        <li>{m.pub_about_f_share()}</li>
        <li>{m.pub_about_f_more()}</li>
        <li>{m.pub_about_f_data()}</li>
      </ul>

      <h2>{m.pub_about_try()}</h2>
      <p>
        <Link to="/sign-in">{m.pub_about_try_link()}</Link>{' '}
        {m.pub_about_try_text()}
      </p>

      <h2>{m.pub_about_built()}</h2>
      <p>
        {m.pub_about_built_text()}{' '}
        <a href="https://github.com/AkosKappel/BudgetMaster">GitHub</a>.
      </p>
    </PublicPage>
  )
}
