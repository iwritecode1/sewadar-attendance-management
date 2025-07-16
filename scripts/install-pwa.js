// Service Worker registration for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration)

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New content is available, show update notification
              showUpdateNotification()
            }
          })
        })
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError)
      })
  })
}

// Enhanced install prompt handling
let deferredPrompt

window.addEventListener("beforeinstallprompt", (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault()
  // Stash the event so it can be triggered later
  deferredPrompt = e

  // Show custom install button
  showInstallButton()
})

function showInstallButton() {
  const installButton = document.createElement("button")
  installButton.id = "install-button"
  installButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7,10 12,15 17,10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    Install App
  `
  installButton.className =
    "fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 z-50"
  installButton.style.display = "flex"

  installButton.addEventListener("click", async () => {
    // Hide the install button
    installButton.style.display = "none"

    // Show the install prompt
    if (deferredPrompt) {
      deferredPrompt.prompt()

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === "accepted") {
        console.log("User accepted the install prompt")
      } else {
        console.log("User dismissed the install prompt")
      }

      deferredPrompt = null
    }
  })

  document.body.appendChild(installButton)
}

function showUpdateNotification() {
  const updateNotification = document.createElement("div")
  updateNotification.innerHTML = `
    <div class="fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium">Update Available</p>
          <p class="text-sm opacity-90">A new version is ready to install</p>
        </div>
        <button onclick="window.location.reload()" class="ml-4 bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100">
          Update
        </button>
      </div>
    </div>
  `
  document.body.appendChild(updateNotification)

  // Auto-hide after 10 seconds
  setTimeout(() => {
    updateNotification.remove()
  }, 10000)
}

// Handle app installation
window.addEventListener("appinstalled", (evt) => {
  console.log("App was installed successfully")
  // Hide install button if it exists
  const installButton = document.getElementById("install-button")
  if (installButton) {
    installButton.style.display = "none"
  }
})

// Check if app is running in standalone mode (installed as PWA)
if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
  console.log("App is running in standalone mode")
  // Add any PWA-specific functionality here
}

// Network status handling for offline functionality
window.addEventListener("online", () => {
  console.log("App is back online")
  // Trigger background sync if needed
  if ("serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      return registration.sync.register("attendance-sync")
    })
  }
})

window.addEventListener("offline", () => {
  console.log("App is offline")
  // Show offline indicator
  showOfflineIndicator()
})

function showOfflineIndicator() {
  const offlineIndicator = document.createElement("div")
  offlineIndicator.id = "offline-indicator"
  offlineIndicator.innerHTML = `
    <div class="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
      <p class="text-sm font-medium">You are currently offline. Some features may be limited.</p>
    </div>
  `
  document.body.appendChild(offlineIndicator)

  // Remove when back online
  window.addEventListener(
    "online",
    () => {
      const indicator = document.getElementById("offline-indicator")
      if (indicator) {
        indicator.remove()
      }
    },
    { once: true },
  )
}
