// BudgetMaster service worker. Pages hold personal data, so they are never cached: they
// always come from the network, with a static offline page when there is none. Only the
// hashed build assets (which never change under the same name) and icons are cached.
const CACHE = 'budgetmaster-v2'
const OFFLINE = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll([OFFLINE, '/favicon.svg', '/icon-192.png']),
      ),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)))
    return
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
  }
})

// Web Push (I-08): the server sends { title, body, url }; a tap opens that page, reusing an
// open BudgetMaster tab when there is one.
self.addEventListener('push', (event) => {
  const message = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(message.title ?? 'BudgetMaster', {
      body: message.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: message.tag,
      data: { url: message.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url ?? '/', self.location.origin)
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        const open = windows.find(
          (w) => new URL(w.url).origin === url.origin && 'focus' in w,
        )
        if (open) return open.navigate(url.href).then((w) => w?.focus())
        return self.clients.openWindow(url.href)
      }),
  )
})
