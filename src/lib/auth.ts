import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { anonymous, twoFactor } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { and, eq, ne } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { createDemoSpace, keepDemoData } from '@/db/demo-accounts'
import * as schema from '@/db/schema'
import { createSpace, soleMemberSpaces } from '@/db/spaces'
import { env } from '@/env'
import { linkEmail } from '@/lib/email'
import { m } from '@/paraglide/messages.js'

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
    // Not awaited: answering at once whether or not the address exists avoids leaking it
    // through response times.
    sendResetPassword: async ({ user, url }) => {
      void linkEmail({
        to: user.email,
        subject: m.acct_email_reset_subject(),
        intro: m.acct_email_reset_intro({ name: user.name }),
        action: m.acct_email_reset_action(),
        url,
        outro: m.acct_email_reset_outro(),
      })
    },
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void linkEmail({
        to: user.email,
        subject: m.acct_email_verify_subject(),
        intro: m.acct_email_verify_intro({ name: user.name }),
        action: m.acct_email_verify_action(),
        url,
        outro: m.acct_email_verify_outro(),
      })
    },
  },
  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET && {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }),
    ...(env.GITHUB_CLIENT_ID &&
      env.GITHUB_CLIENT_SECRET && {
        github: {
          clientId: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
        },
      }),
    ...(env.APPLE_CLIENT_ID &&
      env.APPLE_CLIENT_SECRET && {
        apple: {
          clientId: env.APPLE_CLIENT_ID,
          clientSecret: env.APPLE_CLIENT_SECRET,
        },
      }),
    ...(env.MICROSOFT_CLIENT_ID &&
      env.MICROSOFT_CLIENT_SECRET && {
        microsoft: {
          clientId: env.MICROSOFT_CLIENT_ID,
          clientSecret: env.MICROSOFT_CLIENT_SECRET,
          // Personal Microsoft accounts and any work or school directory.
          tenantId: 'common',
        },
      }),
  },
  // Apple returns to the callback with a form post from its own site.
  trustedOrigins: env.APPLE_CLIENT_ID ? ['https://appleid.apple.com'] : [],
  account: {
    // Signing in with Google or Apple to an address that already has a password account adds
    // it to that account (both verify the address) instead of failing. GitHub and Microsoft
    // link only when they report the address as verified, Better Auth's default for
    // untrusted providers (a Microsoft work account's address is set by its organisation).
    accountLinking: { enabled: true, trustedProviders: ['google', 'apple'] },
  },
  user: {
    additionalFields: {
      weekStartsOn: {
        type: 'number',
        defaultValue: 1,
        input: true,
        // Monday or Sunday; anything else from the client is refused.
        validator: { input: z.union([z.literal(0), z.literal(1)]) },
      },
      aiEnabled: {
        type: 'boolean',
        defaultValue: false,
        input: true,
        validator: { input: z.boolean() },
      },
    },
    // The client confirms with the password, so a stolen open session alone cannot do it.
    deleteUser: { enabled: true, beforeDelete: removeOwnSpaces },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (user.isAnonymous) {
            await createDemoSpace(user.id)
            return
          }
          await createSpace({
            name: m.acct_personal_space(),
            ownerId: user.id,
            personal: true,
          })
        },
      },
    },
  },
  // The Tailscale proxy in front of the app adds the visitor's address to X-Forwarded-For.
  // Naming a trusted proxy makes Better Auth read the chain from the right, so an address
  // a client sends itself is ignored instead of sharing one bucket with everyone.
  advanced: {
    ipAddress: { trustedProxies: ['127.0.0.1/32', '::1/128'] },
  },
  // Only enforced in production. Each demo seeds hundreds of rows, so starting one is
  // limited per IP address.
  rateLimit: {
    storage: 'database',
    customRules: {
      '/sign-in/anonymous': { window: 3600, max: 5 },
      // Each one sends an email.
      '/request-password-reset': { window: 3600, max: 5 },
      '/send-verification-email': { window: 3600, max: 5 },
      // Six digits are guessable without a limit.
      '/two-factor/*': { window: 60, max: 5 },
    },
  },
  plugins: [
    anonymous({
      generateName: () => 'Demo user',
      onLinkAccount: ({ anonymousUser, newUser }) =>
        keepDemoData(anonymousUser.user.id, newUser.user.id),
    }),
    // Authenticator app codes (TOTP) with backup codes. "Trust this device" skips the
    // code on that browser for 30 days.
    twoFactor({ issuer: 'BudgetMaster' }),
    // Sign in with Face ID, a fingerprint or a security key instead of the password.
    passkey({ rpName: 'BudgetMaster' }),
    // Must stay last: it sets the cookies of the responses above.
    tanstackStartCookies(),
  ],
})

// Deleting an account removes the spaces only that user belongs to. A shared space it is
// the last owner of must get another owner first, or its members would be left without one.
async function removeOwnSpaces(user: { id: string }) {
  const owned = await db
    .select({ id: schema.spaceMember.spaceId })
    .from(schema.spaceMember)
    .where(
      and(
        eq(schema.spaceMember.userId, user.id),
        eq(schema.spaceMember.role, 'owner'),
      ),
    )
  for (const { id } of owned) {
    const others = await db
      .select({ role: schema.spaceMember.role })
      .from(schema.spaceMember)
      .where(
        and(
          eq(schema.spaceMember.spaceId, id),
          ne(schema.spaceMember.userId, user.id),
        ),
      )
    if (others.length && !others.some((m) => m.role === 'owner')) {
      throw new APIError('BAD_REQUEST', {
        message: m.acct_delete_last_owner(),
      })
    }
  }
  await db.delete(schema.space).where(soleMemberSpaces(user.id))
}
