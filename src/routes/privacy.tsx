import { createFileRoute, Link } from '@tanstack/react-router'

import { PublicPage } from '@/components/public-page'
import { withCanonical } from '@/lib/site'

export const Route = createFileRoute('/privacy')({
  head: () =>
    withCanonical('/privacy', {
      meta: [
        { title: 'Privacy | BudgetMaster' },
        {
          name: 'description',
          content:
            'What BudgetMaster stores, why, and how to take it with you.',
        },
      ],
    }),
  component: Privacy,
})

function Privacy() {
  return (
    <PublicPage title="Privacy" updated="2026-10-19">
      <p>
        BudgetMaster is a personal project by Ákos Kappel. Your financial data
        is yours: it is used only to run the app for you and the people you
        share a space with.
      </p>

      <h2>What is stored</h2>
      <ul>
        <li>Your name, email address and a hash of your password.</li>
        <li>
          What you enter: wallets, transactions, categories, tags, budgets,
          savings goals, recurring payments and the spaces you belong to.
        </li>
        <li>
          Sessions: when you signed in, the IP address and the browser, so you
          stay signed in and sign-in attempts can be limited.
        </li>
        <li>
          With two-step sign-in on: the authenticator key and your backup codes,
          both encrypted.
        </li>
        <li>
          Receipt photos you attach, made smaller in your browser before the
          upload. They are stored with the transaction, only members of its
          space can open them, and they are deleted with it.
        </li>
        <li>
          A log of who added, changed or deleted which transaction, shown to the
          members of a shared space.
        </li>
        <li>
          If you sign in with Google or GitHub: that account's id, name, email
          address and profile picture link. Nothing else from it is read.
        </li>
        <li>
          Passkeys you add: their public key and a name. The private key never
          leaves your device.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>Only cookies the app needs, no tracking or advertising cookies:</p>
      <ul>
        <li>The Better Auth session cookies, to keep you signed in.</li>
        <li>
          With two-step sign-in on: a short-lived cookie between the password
          and the code, and one for 30 days if you trust the browser.
        </li>
        <li>
          <code>bm-space</code>: the space you looked at last.
        </li>
        <li>
          <code>tz</code>: your time zone, so "today" matches your clock.
        </li>
        <li>
          <code>theme</code>: light, dark or system.
        </li>
      </ul>

      <h2>Who sees it</h2>
      <p>
        Nobody else, except members of a shared space, who see that space's
        data. There is no analytics, no advertising and no third-party tracking,
        and data is never sold. The app and its database run on a server
        operated by the author.
      </p>

      <h2>Your control</h2>
      <p>
        Under Settings, Your data you can download everything as JSON or a
        space's transactions as CSV, and delete your account. Deleting removes
        your account and every space only you belong to. Demo accounts are
        deleted 48 hours after they start.
      </p>

      <h2>Questions</h2>
      <p>
        See the <Link to="/faq">FAQ</Link> or open an issue on GitHub.
      </p>
    </PublicPage>
  )
}
