import { createFileRoute, Link } from '@tanstack/react-router'

import { PublicPage } from '@/components/public-page'
import { withCanonical } from '@/lib/site'
import { m } from '@/paraglide/messages.js'

export const Route = createFileRoute('/privacy')({
  head: () =>
    withCanonical('/privacy', {
      meta: [
        { title: m.pub_privacy_title() },
        { name: 'description', content: m.pub_privacy_description() },
      ],
    }),
  component: Privacy,
})

function Privacy() {
  return (
    <PublicPage title={m.pub_privacy_heading()} updated="2026-10-20">
      <p>{m.pub_privacy_intro()}</p>

      <h2>{m.pub_privacy_stored()}</h2>
      <ul>
        <li>{m.pub_privacy_s_account()}</li>
        <li>{m.pub_privacy_s_entered()}</li>
        <li>{m.pub_privacy_s_sessions()}</li>
        <li>{m.pub_privacy_s_two_step()}</li>
        <li>{m.pub_privacy_s_receipts()}</li>
        <li>{m.pub_privacy_s_ai()}</li>
        <li>{m.pub_privacy_s_log()}</li>
        <li>{m.pub_privacy_s_social()}</li>
        <li>{m.pub_privacy_s_passkeys()}</li>
      </ul>

      <h2>{m.pub_privacy_cookies()}</h2>
      <p>{m.pub_privacy_cookies_intro()}</p>
      <ul>
        <li>{m.pub_privacy_c_session()}</li>
        <li>{m.pub_privacy_c_two_step()}</li>
        <li>
          <code>bm-space</code>: {m.pub_privacy_c_space()}
        </li>
        <li>
          <code>tz</code>: {m.pub_privacy_c_tz()}
        </li>
        <li>
          <code>theme</code>: {m.pub_privacy_c_theme()}
        </li>
        <li>
          <code>PARAGLIDE_LOCALE</code>: {m.pub_privacy_c_locale()}
        </li>
      </ul>

      <h2>{m.pub_privacy_who()}</h2>
      <p>{m.pub_privacy_who_text()}</p>

      <h2>{m.pub_privacy_control()}</h2>
      <p>{m.pub_privacy_control_text()}</p>

      <h2>{m.pub_privacy_questions()}</h2>
      <p>
        {m.pub_privacy_questions_before()}{' '}
        <Link to="/faq">{m.pub_nav_faq()}</Link>{' '}
        {m.pub_privacy_questions_after()}
      </p>
    </PublicPage>
  )
}
