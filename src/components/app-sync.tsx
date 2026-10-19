import { onlineManager, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, WifiOff } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'

import { useMediaQuery } from '@/hooks/use-media-query'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

// One channel per tab: a channel never receives its own messages, so a tab does not
// refetch for its own changes (the mutation already did).
let channel: BroadcastChannel | undefined
const getChannel = () => {
  channel ??= new BroadcastChannel('budgetmaster-changes')
  return channel
}

// Tells other open tabs that data changed, so they refetch instead of showing stale numbers.
export function notifyOtherTabs() {
  getChannel().postMessage('changed')
}

// Mounted once in the app shell: broadcasts after every successful mutation and refetches
// when another tab reports a change.
export function CrossTabSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const refetch = () => queryClient.invalidateQueries()
    getChannel().addEventListener('message', refetch)
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'success')
        notifyOtherTabs()
    })
    return () => {
      unsubscribe()
      getChannel().removeEventListener('message', refetch)
    }
  }, [queryClient])

  return null
}

export function OfflineNotice() {
  const online = useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true,
  )
  if (online) return null
  return (
    <p
      role="status"
      className="mb-4 flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm"
    >
      <WifiOff
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      You are offline. Saving waits until the connection is back.
    </p>
  )
}

const PULL_DISTANCE = 72

// Pull down at the top of the page to refetch everything. Only in the installed app:
// browsers already have their own pull to refresh, standalone windows on iOS do not.
export function PullToRefresh() {
  const queryClient = useQueryClient()
  const standalone = useMediaQuery('(display-mode: standalone)')
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!standalone) return
    let startY: number | null = null
    let distance = 0
    const onStart = (event: TouchEvent) => {
      // Not while a sheet or dialog is open, and only from the very top.
      const modal = document.querySelector('[role="dialog"]')
      startY = window.scrollY === 0 && !modal ? event.touches[0].clientY : null
      distance = 0
    }
    const onMove = (event: TouchEvent) => {
      if (startY === null) return
      distance = Math.max(0, event.touches[0].clientY - startY)
      setPull(Math.min(distance, PULL_DISTANCE * 1.5))
    }
    const onEnd = async () => {
      const pulled = startY !== null && distance >= PULL_DISTANCE
      startY = null
      setPull(0)
      if (!pulled) return
      haptic('confirm')
      setRefreshing(true)
      await queryClient.invalidateQueries()
      setRefreshing(false)
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [standalone, queryClient])

  if (!pull && !refreshing) return null
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-50 flex justify-center"
      style={{ transform: `translateY(${refreshing ? 8 : pull / 3}px)` }}
    >
      <span className="flex size-9 items-center justify-center rounded-full border bg-card shadow-sm">
        <RefreshCw
          className={cn('size-4', refreshing && 'animate-spin')}
          style={{ rotate: refreshing ? undefined : `${pull * 3}deg` }}
          aria-hidden="true"
        />
        <span className="sr-only">
          {refreshing ? 'Refreshing' : 'Release to refresh'}
        </span>
      </span>
    </div>
  )
}
