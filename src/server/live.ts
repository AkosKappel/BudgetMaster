import { EventEmitter } from 'node:events'

// Server-only. Live updates (R-01): "space X changed" events from server functions to the
// open /api/live streams. In memory, because there is one app instance; with several,
// Postgres LISTEN/NOTIFY or Redis pub/sub would carry them between instances.
const bus = new EventEmitter()
bus.setMaxListeners(0)

export function announceChange(spaceId: string) {
  bus.emit('change', spaceId)
}

export function onChange(listener: (spaceId: string) => void) {
  bus.on('change', listener)
  return () => {
    bus.off('change', listener)
  }
}
