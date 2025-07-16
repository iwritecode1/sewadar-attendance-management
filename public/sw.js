const CACHE_NAME = "rssb-sewadar-v2"
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
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache")
      return cache.addAll(urlsToCache)
    }),
  )
})

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      if (response) {
        return response
      }
      return fetch(event.request)
    }),
  )
})

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
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
