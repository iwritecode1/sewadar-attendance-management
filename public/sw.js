const CACHE_NAME = "rssb-sewadar-v4"
const urlsToCache = [
  "/",
  "/dashboard",
  "/attendance",
  "/sewadars",
  "/lookup",
  "/coordinators",
  "/centers",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
]

// Install event
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...")
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache:", CACHE_NAME)
        return cache.addAll(urlsToCache)
      })
      .then(() => {
        console.log("All resources cached successfully")
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error("Failed to cache resources:", error)
      })
  )
})

// Fetch event
self.addEventListener("fetch", (event) => {
  // Skip service worker for navigation requests to prevent redirect issues
  if (event.request.mode === 'navigate') {
    return
  }

  // Skip caching for Next.js internal requests, API calls, and non-GET requests
  if (
    event.request.url.includes('/_next/') ||
    event.request.url.includes('/api/') ||
    event.request.url.includes('chrome-extension:') ||
    event.request.url.includes('moz-extension:') ||
    event.request.method !== 'GET' ||
    event.request.url.includes('hot-reload') ||
    event.request.url.includes('webpack')
  ) {
    return // Let the browser handle these requests normally
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log("Serving from cache:", event.request.url)
          return response
        }

        // Fetch from network
        return fetch(event.request, { redirect: 'follow' })
          .then((response) => {
            // Don't cache redirects or error responses
            if (!response || response.status >= 300 || response.type !== 'basic') {
              return response
            }

            // Only cache successful responses
            if (response.status === 200) {
              // Clone the response for caching
              const responseToCache = response.clone()

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache)
                })
                .catch((error) => {
                  console.warn("Failed to cache response:", error)
                })
            }

            return response
          })
          .catch((error) => {
            console.warn("Fetch failed:", error)
            // Return offline fallback for navigation requests
            if (event.request.destination === 'document') {
              return caches.match('/').then((fallback) => {
                return fallback || new Response('Offline', { status: 503 })
              })
            }
            throw error
          })
      })
      .catch((error) => {
        console.error("Cache match failed:", error)
        return fetch(event.request, { redirect: 'follow' })
      })
  )
})

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...")
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log("Service Worker activated successfully")
        // Claim all clients immediately
        return self.clients.claim()
      })
      .catch((error) => {
        console.error("Service Worker activation failed:", error)
      })
  )
})

// Background sync for offline attendance submission
self.addEventListener("sync", (event) => {
  if (event.tag === "attendance-sync") {
    event.waitUntil(syncAttendance())
  }
})

async function syncAttendance() {
  // Handle offline attendance sync when connection is restored
  console.log("Syncing attendance data...")
}

// Push notification support
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New notification",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  }

  event.waitUntil(self.registration.showNotification("RSSB Sewadar", options))
})
