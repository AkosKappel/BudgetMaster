import { passkeyClient } from '@better-auth/passkey/client'
import {
  anonymousClient,
  inferAdditionalFields,
  twoFactorClient,
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

import type { auth } from '@/lib/auth'

// Sign-in answers `twoFactorRedirect` when a code is needed; useAuthSubmit handles it.
export const authClient = createAuthClient({
  plugins: [
    anonymousClient(),
    twoFactorClient(),
    passkeyClient(),
    inferAdditionalFields<typeof auth>(),
  ],
})
