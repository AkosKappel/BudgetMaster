import { z } from 'zod'

// Server-only. Checked when the server first needs it (not at build time), so a missing or
// weak setting fails with a message naming it, and the health check reports the failure.
const schema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'Use at least 32 characters, e.g. `openssl rand -base64 32`.'),
  BETTER_AUTH_URL: z.url(),
  // Optional: without it, emails are printed to the console (development and CI).
  RESEND_API_KEY: z.preprocess(
    (value) => value || undefined,
    z.string().startsWith('re_').optional(),
  ),
  // Optional: Google sign-in is offered only when both are set (Google Cloud console, OAuth
  // client, redirect URL `<BETTER_AUTH_URL>/api/auth/callback/google`).
  GOOGLE_CLIENT_ID: z.preprocess(
    (value) => value || undefined,
    z.string().optional(),
  ),
  GOOGLE_CLIENT_SECRET: z.preprocess(
    (value) => value || undefined,
    z.string().optional(),
  ),
  // Must be on a domain verified in Resend; onboarding@resend.dev only reaches the account owner.
  EMAIL_FROM: z.string().default('BudgetMaster <onboarding@resend.dev>'),
})

const result = schema.safeParse(process.env)
if (!result.success) {
  throw new Error(
    `Invalid environment, see .env.example:\n${z.prettifyError(result.error)}`,
  )
}

export const env = result.data
