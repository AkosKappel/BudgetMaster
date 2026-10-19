import { anonymousClient, twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

// Sign-in answers `twoFactorRedirect` when a code is needed; useAuthSubmit handles it.
export const authClient = createAuthClient({
  plugins: [anonymousClient(), twoFactorClient()],
})
