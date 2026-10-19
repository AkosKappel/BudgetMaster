import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouteContext, useRouter } from '@tanstack/react-router'
import { KeyRound, MailWarning, Monitor, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { FormError } from '@/components/auth-page'
import { PasswordInput } from '@/components/password-input'
import { QrCode } from '@/components/qr-code'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { describeDevice } from '@/lib/devices'
import { APP_LOCALE } from '@/lib/money'
import { devicesQuery, sessionQuery, signInOptionsQuery } from '@/lib/queries'
import { signOutDevice } from '@/server/devices'

// Email confirmation and password change. Demo accounts have neither.
export function AccountSecurity() {
  const { user } = useRouteContext({ from: '/_app' })
  const [sending, setSending] = useState(false)
  if (user.demoExpiresAt) return null

  const resend = async () => {
    setSending(true)
    const { error } = await authClient.sendVerificationEmail({
      email: user.email,
      callbackURL: '/more',
    })
    setSending(false)
    if (error) toast.error(error.message ?? 'Could not send the email.')
    else toast.success(`Confirmation email sent to ${user.email}`)
  }

  return (
    <section aria-labelledby="security" className="flex flex-col gap-3">
      <h2 id="security" className="font-semibold text-lg">
        Sign-in and security
      </h2>
      {!user.emailVerified && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
          <MailWarning
            className="size-4 shrink-0 text-warning"
            aria-hidden="true"
          />
          <p className="min-w-0 flex-1">
            Confirm {user.email} so you can reset your password if you forget
            it.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={sending}
            onClick={resend}
          >
            Send confirmation email
          </Button>
        </div>
      )}
      <details className="rounded-lg border bg-card px-4 py-3">
        <summary className="cursor-pointer font-medium">
          Change password
        </summary>
        <ChangePasswordForm />
      </details>
      <details className="rounded-lg border bg-card px-4 py-3">
        <summary className="cursor-pointer font-medium">
          Two-step sign-in{' '}
          <span className="font-normal text-muted-foreground">
            ({user.twoFactorEnabled ? 'on' : 'off'})
          </span>
        </summary>
        <TwoFactorSettings enabled={user.twoFactorEnabled} />
      </details>
      <ConnectedAccounts />
      <details className="rounded-lg border bg-card px-4 py-3">
        <summary className="cursor-pointer font-medium">Passkeys</summary>
        <Passkeys />
      </details>
      <details className="rounded-lg border bg-card px-4 py-3">
        <summary className="cursor-pointer font-medium">
          Signed-in devices
        </summary>
        <SignedInDevices />
      </details>
    </section>
  )
}

function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <form
      className="mt-4 flex max-w-sm flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        setError(null)
        setPending(true)
        const { error } = await authClient.changePassword({
          currentPassword: String(data.get('current')),
          newPassword: String(data.get('new')),
          revokeOtherSessions: true,
        })
        setPending(false)
        if (error) {
          setError(error.message ?? 'Could not change the password.')
          return
        }
        form.reset()
        toast.success('Password changed. Other devices are signed out.')
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="current-password">Current password</Label>
        <PasswordInput
          id="current-password"
          name="current"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password">New password</Label>
        <PasswordInput
          id="new-password"
          name="new"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <FormError message={error} />
      <Button type="submit" className="w-fit" disabled={pending}>
        Change password
      </Button>
    </form>
  )
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(APP_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

// Loaded in the browser only, so the times are in the user's own zone.
function SignedInDevices() {
  const queryClient = useQueryClient()
  const { data: devices, isPending } = useQuery(devicesQuery)
  const signOut = useMutation({
    mutationFn: (id: string) => signOutDevice({ data: { id } }),
    onSuccess: () => toast.success('Device signed out'),
    onError: (error) => toast.error(error.message),
    onSettled: () => queryClient.invalidateQueries(devicesQuery),
  })

  if (isPending || !devices)
    return <p className="mt-3 text-muted-foreground text-sm">Loading…</p>

  return (
    <ul className="mt-3 flex flex-col divide-y">
      {devices.map((device) => (
        <li key={device.id} className="flex items-center gap-3 py-3">
          <Monitor
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {device.device}
              {device.current && (
                <span className="font-normal text-muted-foreground">
                  {' '}
                  (this device)
                </span>
              )}
            </p>
            <p className="text-muted-foreground text-sm">
              Signed in {formatTime(device.signedInAt)}, last active{' '}
              {formatTime(device.lastActiveAt)}
            </p>
          </div>
          {!device.current && (
            <Button
              variant="outline"
              size="sm"
              disabled={signOut.isPending}
              aria-label={`Sign out ${device.device}, signed in ${formatTime(device.signedInAt)}`}
              onClick={() => signOut.mutate(device.id)}
            >
              Sign out
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}

type Setup =
  | { step: 'scan'; uri: string; backupCodes: string[] }
  | { step: 'codes'; backupCodes: string[] }

// Turning it on: password, scan the QR code, confirm one code, then save the backup codes.
// Better Auth only switches it on after the first code is confirmed.
function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [setup, setSetup] = useState<Setup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const refreshUser = async () => {
    // The app layout reads the user from this query with ensureQueryData, which would
    // keep the stale copy.
    await queryClient.fetchQuery({ ...sessionQuery, staleTime: 0 })
    await router.invalidate()
  }

  const submit =
    (action: (form: FormData) => Promise<void>) =>
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = event.currentTarget
      setError(null)
      setPending(true)
      try {
        await action(new FormData(form))
        form.reset()
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setPending(false)
      }
    }

  const unwrap = <T,>(result: {
    data: T | null
    error: { message?: string } | null
  }) => {
    if (result.error || !result.data)
      throw new Error(result.error?.message ?? 'Something went wrong.')
    return result.data
  }

  if (setup?.step === 'scan') {
    const secret = new URL(setup.uri).searchParams.get('secret') ?? ''
    return (
      <form
        className="mt-4 flex max-w-sm flex-col gap-4"
        onSubmit={submit(async (form) => {
          unwrap(
            await authClient.twoFactor.verifyTotp({
              code: String(form.get('code')).replace(/\s/g, ''),
            }),
          )
          setSetup({ step: 'codes', backupCodes: setup.backupCodes })
          await refreshUser()
          toast.success('Two-step sign-in is on')
        })}
      >
        <p className="text-sm">
          Scan the code with an authenticator app (Google Authenticator,
          Microsoft Authenticator, 1Password, Bitwarden), then enter the 6-digit
          code it shows.
        </p>
        <QrCode value={setup.uri} label="QR code for your authenticator app" />
        <p className="text-muted-foreground text-sm">
          Can't scan? Enter this key:{' '}
          <code className="break-all font-mono text-foreground">{secret}</code>
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="totp-code">Code from the app</Label>
          <Input
            id="totp-code"
            name="code"
            required
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
          />
        </div>
        <FormError message={error} />
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            Turn on
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSetup(null)}>
            Cancel
          </Button>
        </div>
      </form>
    )
  }

  if (setup?.step === 'codes') {
    return (
      <div className="mt-4 flex max-w-sm flex-col gap-4">
        <p className="text-sm">
          Save these backup codes somewhere safe, like your password manager.
          Each one signs you in once if you lose your phone. They are not shown
          again.
        </p>
        <ul className="grid grid-cols-2 gap-1 rounded-md border bg-background p-3 font-mono text-sm">
          {setup.backupCodes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(setup.backupCodes.join('\n'))
              toast.success('Backup codes copied')
            }}
          >
            Copy codes
          </Button>
          <Button onClick={() => setSetup(null)}>I saved them</Button>
        </div>
      </div>
    )
  }

  if (!enabled) {
    return (
      <form
        className="mt-4 flex max-w-sm flex-col gap-4"
        onSubmit={submit(async (form) => {
          const data = unwrap(
            await authClient.twoFactor.enable({
              password: String(form.get('password')),
              issuer: 'BudgetMaster',
            }),
          )
          if (data.method !== 'totp') throw new Error('Unexpected answer.')
          setSetup({
            step: 'scan',
            uri: data.totpURI,
            backupCodes: data.backupCodes,
          })
        })}
      >
        <p className="text-muted-foreground text-sm">
          After your password, also ask for a code from an authenticator app on
          your phone, so a leaked password alone cannot open your finances.
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="enable-2fa-password">Password</Label>
          <PasswordInput
            id="enable-2fa-password"
            name="password"
            autoComplete="current-password"
            required
          />
        </div>
        <FormError message={error} />
        <Button type="submit" className="w-fit" disabled={pending}>
          Set up
        </Button>
      </form>
    )
  }

  return (
    <form
      className="mt-4 flex max-w-sm flex-col gap-4"
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter
        const action = submitter?.getAttribute('value')
        return submit(async (form) => {
          const password = String(form.get('password'))
          if (action === 'codes') {
            const data = unwrap(
              await authClient.twoFactor.generateBackupCodes({ password }),
            )
            setSetup({ step: 'codes', backupCodes: data.backupCodes })
            return
          }
          unwrap(await authClient.twoFactor.disable({ password }))
          await refreshUser()
          toast.success('Two-step sign-in is off')
        })(event)
      }}
    >
      <p className="text-muted-foreground text-sm">
        Signing in asks for a code from your authenticator app. Confirm with
        your password to get new backup codes (the old ones stop working) or to
        turn it off.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="manage-2fa-password">Password</Label>
        <PasswordInput
          id="manage-2fa-password"
          name="password"
          autoComplete="current-password"
          required
        />
      </div>
      <FormError message={error} />
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          value="codes"
          variant="outline"
          disabled={pending}
        >
          New backup codes
        </Button>
        <Button
          type="submit"
          value="disable"
          variant="destructive"
          disabled={pending}
        >
          Turn off
        </Button>
      </div>
    </form>
  )
}

const passkeysQuery = {
  queryKey: ['passkeys'],
  queryFn: async () => {
    const { data, error } = await authClient.passkey.listUserPasskeys()
    if (error) throw new Error(error.message ?? 'Could not load passkeys.')
    return data
  },
}

// Face ID, a fingerprint or a security key instead of the password. Loaded in the browser
// only; registering needs the browser's WebAuthn prompt anyway.
function Passkeys() {
  const queryClient = useQueryClient()
  const { data: passkeys, isPending } = useQuery(passkeysQuery)
  const [error, setError] = useState<string | null>(null)
  const refresh = () => queryClient.invalidateQueries(passkeysQuery)

  const add = useMutation({
    mutationFn: async () => {
      const result = await authClient.passkey.addPasskey({
        name: describeDevice(navigator.userAgent),
      })
      if (result?.error)
        throw new Error(result.error.message ?? 'The passkey was not saved.')
    },
    onMutate: () => setError(null),
    onSuccess: () => toast.success('Passkey added'),
    onError: (e) => setError(e.message),
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await authClient.passkey.deletePasskey({ id })
      if (error) throw new Error(error.message ?? 'Could not remove it.')
    },
    onSuccess: () => toast.success('Passkey removed'),
    onError: (e) => toast.error(e.message),
    onSettled: refresh,
  })

  return (
    <div className="mt-3 flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Sign in with Face ID, a fingerprint or a security key instead of typing
        your password. The device keeps the private key; only a public key is
        stored here.
      </p>
      {isPending ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        passkeys &&
        passkeys.length > 0 && (
          <ul className="flex flex-col divide-y">
            {passkeys.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <KeyRound
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name ?? 'Passkey'}</p>
                  <p className="text-muted-foreground text-sm">
                    Added {formatTime(new Date(p.createdAt).toISOString())}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove passkey ${p.name ?? ''}`.trim()}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(p.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )
      )}
      <FormError message={error} />
      <Button
        variant="outline"
        className="w-fit"
        disabled={add.isPending}
        onClick={() => add.mutate()}
      >
        <KeyRound />
        Add a passkey
      </Button>
    </div>
  )
}

const accountsQuery = {
  queryKey: ['linked-accounts'],
  queryFn: async () => {
    const { data, error } = await authClient.listAccounts()
    if (error) throw new Error(error.message ?? 'Could not load accounts.')
    return data
  },
}

// Google next to the password, when the server is set up for it. Better Auth refuses to
// remove the last way to sign in.
function ConnectedAccounts() {
  const queryClient = useQueryClient()
  const { data: options } = useQuery(signInOptionsQuery)
  const { data: accounts } = useQuery({
    ...accountsQuery,
    enabled: Boolean(options?.google),
  })
  const google = accounts?.find((a) => a.providerId === 'google')
  const unlink = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await authClient.unlinkAccount({ accountId })
      if (error) throw new Error(error.message ?? 'Could not disconnect.')
    },
    onSuccess: () => toast.success('Google disconnected'),
    onError: (e) => toast.error(e.message),
    onSettled: () => queryClient.invalidateQueries(accountsQuery),
  })
  if (!options?.google || !accounts) return null

  return (
    <details className="rounded-lg border bg-card px-4 py-3">
      <summary className="cursor-pointer font-medium">
        Connected accounts
      </summary>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm">
          {google
            ? 'Google is connected: you can sign in with it.'
            : 'Connect Google to sign in without your password.'}
        </p>
        {google ? (
          <Button
            variant="outline"
            size="sm"
            disabled={unlink.isPending}
            onClick={() => unlink.mutate(google.accountId)}
          >
            Disconnect Google
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              authClient.linkSocial({
                provider: 'google',
                callbackURL: '/more',
              })
            }
          >
            Connect Google
          </Button>
        )}
      </div>
    </details>
  )
}
