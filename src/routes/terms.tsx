import { createFileRoute, Link } from '@tanstack/react-router'

import { PublicPage } from '@/components/public-page'
import { withCanonical } from '@/lib/site'
import { m } from '@/paraglide/messages.js'

export const Route = createFileRoute('/terms')({
  head: () =>
    withCanonical('/terms', {
      meta: [
        { title: m.pub_terms_title() },
        { name: 'description', content: m.pub_terms_description() },
      ],
    }),
  component: Terms,
})

function Terms() {
  return (
    <PublicPage title={m.pub_terms_heading()} updated="2026-10-18">
      <p>{m.pub_terms_intro()}</p>

      <h2>{m.pub_terms_as_is()}</h2>
      <p>{m.pub_terms_as_is_text()}</p>

      <h2>{m.pub_terms_advice()}</h2>
      <p>{m.pub_terms_advice_text()}</p>

      <h2>{m.pub_terms_data()}</h2>
      <p>
        {m.pub_terms_data_text()}{' '}
        <Link to="/privacy">{m.pub_terms_data_link()}</Link>
        {/* Starts with a space where the language continues the sentence. */}
        {m.pub_terms_data_after()}
      </p>

      <h2>{m.pub_terms_fair()}</h2>
      <p>{m.pub_terms_fair_text()}</p>
    </PublicPage>
  )
}
