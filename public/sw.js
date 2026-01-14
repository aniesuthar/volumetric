const CACHE_NAME = "maghji-calculators-v1"
const urlsToCache = ["/", "/manifest.json"]

self.addEventListener("install", (event) => {
  console.log("[v0] Service Worker installing...")
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[v0] Caching app shell")
        return cache.addAll(urlsToCache)
      })
      .then(() => {
        console.log("[v0] Service Worker installed successfully")
        return self.skipWaiting()
      }),
  )
})

self.addEventListener("activate", (event) => {
  console.log("[v0] Service Worker activating...")
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("[v0] Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => {
        console.log("[v0] Service Worker activated")
        return self.clients.claim()
      }),
  )
})

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        if (response) {
          console.log("[v0] Serving from cache:", event.request.url)
          return response
        }
        console.log("[v0] Fetching from network:", event.request.url)
        return fetch(event.request)
      })
      .catch((error) => {
        console.error("[v0] Fetch failed:", error)
        throw error
      }),
  )
})
