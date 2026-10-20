import { createFileRoute, Link } from '@tanstack/react-router'

import { PublicPage } from '@/components/public-page'
import { withCanonical } from '@/lib/site'
import { m } from '@/paraglide/messages.js'

export const Route = createFileRoute('/faq')({
  head: () =>
    withCanonical('/faq', {
      meta: [
        { title: m.pub_faq_title() },
        { name: 'description', content: m.pub_faq_description() },
      ],
    }),
  component: Faq,
})

// A function, so the answers are read in the visitor's language on every render.
const questions = (): [string, React.ReactNode][] => [
  [m.pub_faq_free_q(), m.pub_faq_free_a()],
  [m.pub_faq_bank_q(), m.pub_faq_bank_a()],
  [m.pub_faq_currency_q(), m.pub_faq_currency_a()],
  [m.pub_faq_share_q(), m.pub_faq_share_a()],
  [m.pub_faq_split_q(), m.pub_faq_split_a()],
  [m.pub_faq_demo_q(), m.pub_faq_demo_a()],
  [m.pub_faq_data_q(), m.pub_faq_data_a()],
  [
    m.pub_faq_bug_q(),
    <>
      {m.pub_faq_bug_a()} <Link to="/security">{m.pub_faq_bug_link()}</Link>.
    </>,
  ],
]

function Faq() {
  return (
    <PublicPage title={m.pub_faq_heading()}>
      {questions().map(([question, answer]) => (
        <section key={question}>
          <h2>{question}</h2>
          <p>{answer}</p>
        </section>
      ))}
    </PublicPage>
  )
}
