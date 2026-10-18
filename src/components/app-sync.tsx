import { onlineManager, useQueryClient } from '@tanstack/react-query'
import { WifiOff } from 'lucide-react'
import { useEffect, useSyncExternalStore } from 'react'

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
