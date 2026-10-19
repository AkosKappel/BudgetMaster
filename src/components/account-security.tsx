import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { MailWarning, Monitor } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { FormError } from '@/components/auth-page'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { APP_LOCALE } from '@/lib/money'
import { devicesQuery } from '@/lib/queries'
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
