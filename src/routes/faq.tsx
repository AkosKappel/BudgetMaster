import { createFileRoute, Link } from '@tanstack/react-router'

import { PublicPage } from '@/components/public-page'
import { withCanonical } from '@/lib/site'

export const Route = createFileRoute('/faq')({
  head: () =>
    withCanonical('/faq', {
      meta: [
        { title: 'FAQ | BudgetMaster' },
        {
          name: 'description',
          content: 'Answers to common questions about BudgetMaster.',
        },
      ],
    }),
  component: Faq,
})

const QUESTIONS: [string, React.ReactNode][] = [
  ['Is it free?', 'Yes. There are no paid plans and no ads.'],
  [
    'Does it connect to my bank?',
    'No. You record transactions yourself; quick add, payee memory and recurring payments keep that to a few seconds. Importing bank statements is planned.',
  ],
  [
    'Can I use several currencies?',
    'Each wallet has its own currency, and transfers between currencies record both amounts. Totals and budgets count wallets in the space currency only, until exchange rates are added.',
  ],
  [
    'Can I share it with my partner?',
    'Yes. Create a shared space under More, Spaces and send an invite link. Everyone keeps their own personal space next to it.',
  ],
  [
    'What happens to the demo data?',
    'Every demo is private to you. It is deleted 48 hours after you start it, unless you create an account from the banner; then you keep everything.',
  ],
  [
    'How do I get my data out, or delete it?',
    'Under More, Your data: download everything as JSON or a space as CSV, or delete your account with all spaces only you belong to.',
  ],
  [
    'I found a bug or a security problem.',
    <>
      Bugs go to the issue tracker on GitHub. For security problems, see the{' '}
      <Link to="/security">security page</Link>.
    </>,
  ],
]

function Faq() {
  return (
    <PublicPage title="Frequently asked questions">
      {QUESTIONS.map(([question, answer]) => (
        <section key={question}>
          <h2>{question}</h2>
          <p>{answer}</p>
        </section>
      ))}
    </PublicPage>
  )
}
