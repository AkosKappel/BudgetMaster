import { env } from '@/env'

// Server-only. Sends a transactional email through the Resend API (a single fetch, no SDK).
// Without RESEND_API_KEY the message goes to the console instead, so sign-up and password
// reset work in development and CI; production never logs links (they contain tokens).
export async function sendEmail(message: {
  to: string
  subject: string
  text: string
  html: string
}) {
  if (!env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        JSON.stringify({ email: 'not sent: RESEND_API_KEY is missing' }),
      )
    } else {
      console.info(
        `[email] to ${message.to}: ${message.subject}\n${message.text}`,
      )
    }
    return
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, ...message }),
  })
  if (!response.ok) {
    // The body names the problem (unverified domain, bad key) without the message content.
    console.error(
      JSON.stringify({
        email: 'not sent',
        status: response.status,
        reason: (await response.text()).slice(0, 300),
      }),
    )
  }
}

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"]/g,
    (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`,
  )

// A plain email with one button: readable everywhere, no images or tracking.
export function linkEmail({
  to,
  subject,
  intro,
  action,
  url,
  outro,
}: {
  to: string
  subject: string
  intro: string
  action: string
  url: string
  outro: string
}) {
  return sendEmail({
    to,
    subject,
    text: `${intro}\n\n${action}: ${url}\n\n${outro}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:32rem;color:#16302b">
<p>${escapeHtml(intro)}</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#16302b;color:#f1f4ef;text-decoration:none">${escapeHtml(action)}</a></p>
<p style="color:#50635e;font-size:14px">${escapeHtml(outro)}</p>
</div>`,
  })
}
