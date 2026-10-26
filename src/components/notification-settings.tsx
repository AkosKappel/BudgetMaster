import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { m } from '@/paraglide/messages.js'
import {
  getNotificationSettings,
  removePushSubscription,
  savePushSubscription,
  setNotificationPreferences,
} from '@/server/notifications'

const settingsQuery = {
  queryKey: ['notification-settings'],
  queryFn: () => getNotificationSettings(),
}

type PushState = 'unsupported' | 'blocked' | 'off' | 'on'

// The browser side of push: permission and this device's subscription. Push needs the
// service worker, which only runs in production builds.
async function currentPushState(): Promise<PushState> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window))
    return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  return subscription ? 'on' : 'off'
}

// Settings, Notifications (I-08): bill reminders on this device, and a weekly email.
export function NotificationSettings() {
  const { user } = useRouteContext({ from: '/_app' })
  const queryClient = useQueryClient()
  const { data } = useQuery(settingsQuery)
  const [push, setPush] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void currentPushState().then(setPush)
  }, [])

  if (!data || user.demoExpiresAt) return null

  async function togglePush(on: boolean) {
    if (!data?.publicKey) return
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.ready
      if (on) {
        if ((await Notification.requestPermission()) !== 'granted') {
          setPush('blocked')
          return
        }
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: data.publicKey,
        })
        const { endpoint, keys } = subscription.toJSON()
        await savePushSubscription({
          data: {
            endpoint: endpoint ?? '',
            keys: { p256dh: keys?.p256dh ?? '', auth: keys?.auth ?? '' },
          },
        })
      } else {
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await removePushSubscription({
            data: { endpoint: subscription.endpoint },
          })
          await subscription.unsubscribe()
        }
      }
      setPush(on ? 'on' : 'off')
    } catch {
      toast.error(m.notify_save_failed())
    } finally {
      setBusy(false)
    }
  }

  async function toggleDigest(on: boolean) {
    setBusy(true)
    try {
      await setNotificationPreferences({ data: { weeklyDigest: on } })
      await queryClient.invalidateQueries(settingsQuery)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : m.notify_save_failed(),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-lg font-semibold">
        {m.notify_heading()}
      </legend>
      {data.publicKey && push !== null && (
        <label className="flex max-w-prose items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={push === 'on'}
            disabled={busy || push === 'unsupported' || push === 'blocked'}
            onChange={(e) => togglePush(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            {m.notify_push_label()}
            <span className="block text-muted-foreground">
              {push === 'unsupported'
                ? m.notify_push_unsupported()
                : push === 'blocked'
                  ? m.notify_push_blocked()
                  : m.notify_push_hint()}
            </span>
          </span>
        </label>
      )}
      <label className="flex max-w-prose items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={data.weeklyDigest}
          disabled={busy || !data.canEmail}
          onChange={(e) => toggleDigest(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          {m.notify_digest_label()}
          <span className="block text-muted-foreground">
            {data.canEmail
              ? m.notify_digest_hint({ email: user.email })
              : m.notify_digest_verify()}
          </span>
        </span>
      </label>
    </fieldset>
  )
}
