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
  // showInstallButton()
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
window.addEventListener("appinstalled", () => {
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

// iOS PWA detection and install guidance
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
}

// Show iOS install instructions
function showIOSInstallInstructions() {
  if (isIOS() && !isInStandaloneMode()) {
    const iosInstallBanner = document.createElement("div")
    iosInstallBanner.id = "ios-install-banner"
    iosInstallBanner.innerHTML = `
      <div class="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 z-50">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <p class="font-medium text-sm">Install RSSB App</p>
            <p class="text-xs opacity-90 mt-1">
              Tap <svg class="inline w-4 h-4 mx-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg> then "Add to Home Screen"
            </p>
          </div>
          <button onclick="document.getElementById('ios-install-banner').remove()" class="ml-2 text-white opacity-75 hover:opacity-100">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>
    `
    document.body.appendChild(iosInstallBanner)

    // Auto-hide after 15 seconds
    setTimeout(() => {
      const banner = document.getElementById("ios-install-banner")
      if (banner) {
        banner.remove()
      }
    }, 15000)
  }
}

// Show iOS install instructions after page load
window.addEventListener("load", () => {
  setTimeout(showIOSInstallInstructions, 2000)
})

// Network status handling for offline functionality
window.addEventListener("online", () => {
  console.log("App is back online")
  // Remove offline indicator
  const indicator = document.getElementById("offline-indicator")
  if (indicator) {
    indicator.remove()
  }

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
}