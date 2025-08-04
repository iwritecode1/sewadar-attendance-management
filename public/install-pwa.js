// Service Worker registration for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const isLocalhost = Boolean(
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]" ||
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
    )

    // Development mode: unregister service workers to prevent caching issues
    if (isLocalhost) {
      navigator.serviceWorker.getRegistrations()
        .then(function(registrations) {
          for(let registration of registrations) {
            registration.unregister()
              .then(function(boolean) {
                console.log("Development: Service worker unregistered:", boolean)
              })
              .catch(function(error) {
                console.warn("Failed to unregister service worker:", error)
              })
          }
        })
        .catch(function(error) {
          console.warn("Failed to get service worker registrations:", error)
        })
      return
    }

    // Production mode: register service worker
    navigator.serviceWorker
      .register("/sw.js", { 
        scope: "/",
        updateViaCache: "none" 
      })
      .then((registration) => {
        console.log("Production: SW registered successfully:", registration.scope)

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New content is available, show update notification
                showUpdateNotification()
              }
            })
          }
        })

        // Listen for controlling service worker changes
        registration.addEventListener("controllerchange", () => {
          console.log("Service worker controller changed")
        })
      })
      .catch((registrationError) => {
        console.error("Production: SW registration failed:", registrationError)
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

  // Show custom install banner for Android/Chrome
  showInstallBanner()
})

function showInstallBanner() {
  // Don't show if already installed
  if (isInStandaloneMode()) {
    return
  }

  // Check if user dismissed banner in this session
  const sessionDismissed = sessionStorage.getItem("installBannerDismissedThisSession")
  
  if (sessionDismissed === "true") {
    return
  }

  // Check if banner was already shown in this session
  const bannerShownThisSession = sessionStorage.getItem("installBannerShownThisSession")
  if (bannerShownThisSession === "true") {
    return
  }

  // Mark as shown in this session
  sessionStorage.setItem("installBannerShownThisSession", "true")

  const installBanner = document.createElement("div")
  installBanner.id = "install-banner"
  installBanner.innerHTML = `
    <div class="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 animate-slide-up">
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-2xl border border-blue-500/20 backdrop-blur-sm max-w-sm">
        <div class="p-4">
          <div class="flex items-start space-x-3">
            <div class="bg-white/20 p-2.5 rounded-lg backdrop-blur-sm">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-base text-white mb-1">Install RSSB App</h3>
              <p class="text-sm text-blue-100 leading-relaxed">Get quick access with offline support and push notifications</p>
            </div>
            <button id="dismiss-install-btn" class="text-white/70 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-all duration-200">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          <div class="flex items-center space-x-2 mt-4">
            <button id="install-app-btn" class="bg-white text-blue-600 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-all duration-200 shadow-sm flex-1">
              <span class="flex items-center justify-center space-x-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Install Now</span>
              </span>
            </button>
            <button id="maybe-later-btn" class="text-blue-100 hover:text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 transition-all duration-200">
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <style>
      @keyframes slide-up {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      .animate-slide-up {
        animation: slide-up 0.4s ease-out;
      }
    </style>
  `

  document.body.appendChild(installBanner)

  // Install button click handler
  document.getElementById("install-app-btn").addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === "accepted") {
        console.log("User accepted the install prompt")
      } else {
        console.log("User dismissed the install prompt")
      }
      
      deferredPrompt = null
      installBanner.remove()
    } else {
      // Fallback for browsers that don't support beforeinstallprompt
      // Show manual installation instructions
      showManualInstallInstructions()
      installBanner.remove()
    }
  })

  // Dismiss button click handler (X button)
  document.getElementById("dismiss-install-btn").addEventListener("click", () => {
    installBanner.remove()
    // Remember user dismissed it for this session only
    sessionStorage.setItem("installBannerDismissedThisSession", "true")
  })

  // Maybe later button click handler
  document.getElementById("maybe-later-btn").addEventListener("click", () => {
    installBanner.remove()
    // Don't set dismissed flag, so it can show again in future sessions
  })

  // Auto-hide after 20 seconds
  setTimeout(() => {
    if (document.getElementById("install-banner")) {
      installBanner.remove()
    }
  }, 20000)
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
  // Hide install banners if they exist
  const installBanner = document.getElementById("install-banner")
  const iosInstallBanner = document.getElementById("ios-install-banner")
  
  if (installBanner) {
    installBanner.remove()
  }
  if (iosInstallBanner) {
    iosInstallBanner.remove()
  }
})

// Check if app is running in standalone mode (installed as PWA)
if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
  console.log("App is running in standalone mode")
  // Add any PWA-specific functionality here
}

// Global function to manually unregister service workers (for debugging)
window.unregisterServiceWorkers = function() {
  if ("serviceWorker" in navigator) {
    console.log("Starting manual service worker cleanup...")
    
    navigator.serviceWorker.getRegistrations()
      .then(function(registrations) {
        const unregisterPromises = registrations.map(registration => 
          registration.unregister()
            .then(boolean => {
              console.log("Service worker unregistered:", registration.scope, boolean)
              return boolean
            })
            .catch(error => {
              console.error("Failed to unregister service worker:", error)
              return false
            })
        )
        
        return Promise.all(unregisterPromises)
      })
      .then(() => {
        // Clear caches after unregistering service workers
        if ('caches' in window) {
          return caches.keys().then(function(names) {
            const deletePromises = names.map(name => 
              caches.delete(name)
                .then(success => {
                  console.log("Cache deleted:", name, success)
                  return success
                })
                .catch(error => {
                  console.error("Failed to delete cache:", name, error)
                  return false
                })
            )
            return Promise.all(deletePromises)
          })
        }
      })
      .then(() => {
        console.log("✅ All service workers and caches cleared successfully!")
        console.log("🔄 Please refresh the page to complete the cleanup.")
      })
      .catch(error => {
        console.error("❌ Error during cleanup:", error)
      })
  } else {
    console.log("Service workers not supported in this browser")
  }
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
    // Check if user dismissed iOS banner in this session
    const sessionDismissed = sessionStorage.getItem("iosInstallBannerDismissedThisSession")
    const permanentDismissed = localStorage.getItem("iosInstallBannerDismissed")
    
    if (sessionDismissed === "true" || permanentDismissed === "true") {
      return
    }

    // Check if iOS banner was already shown in this session
    const bannerShownThisSession = sessionStorage.getItem("iosInstallBannerShownThisSession")
    if (bannerShownThisSession === "true") {
      return
    }

    // Mark as shown in this session
    sessionStorage.setItem("iosInstallBannerShownThisSession", "true")
    const iosInstallBanner = document.createElement("div")
    iosInstallBanner.id = "ios-install-banner"
    iosInstallBanner.innerHTML = `
      <div class="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 animate-slide-up">
        <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-2xl border border-blue-500/20 backdrop-blur-sm max-w-sm">
          <div class="p-4">
            <div class="flex items-start space-x-3">
              <div class="bg-white/20 p-2.5 rounded-lg backdrop-blur-sm">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-base text-white mb-1">Install RSSB App</h3>
                <p class="text-sm text-blue-100 leading-relaxed">
                  Tap <svg class="inline w-4 h-4 mx-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 8a2 2 0 110 4 2 2 0 010-4zM10 16a2 2 0 110 4 2 2 0 010-4z" clip-rule="evenodd"/></svg> then "Add to Home Screen"
                </p>
              </div>
              <button onclick="document.getElementById('ios-install-banner').remove(); sessionStorage.setItem('iosInstallBannerDismissedThisSession', 'true')" class="text-white/70 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-all duration-200">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <style>
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      </style>
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

// Show install instructions after page load
window.addEventListener("load", () => {
  // Show iOS instructions for iOS devices
  if (isIOS()) {
    setTimeout(showIOSInstallInstructions, 2000)
  } else {
    // Show install banner for other devices after a short delay
    setTimeout(() => {
      if (!deferredPrompt) {
        // If no beforeinstallprompt event, still show banner for manual instructions
        showInstallBanner()
      }
    }, 3000)
  }
})

// Manual installation instructions for browsers without native prompt
function showManualInstallInstructions() {
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
  const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1
  const isEdge = /Edg/.test(navigator.userAgent)
  
  let instructions = "To install this app:\n\n"
  
  if (isChrome || isEdge) {
    instructions += "1. Click the menu (⋮) in your browser\n2. Select 'Install app' or 'Add to Home screen'\n3. Follow the prompts"
  } else if (isFirefox) {
    instructions += "1. Click the menu (☰) in your browser\n2. Select 'Install this site as an app'\n3. Follow the prompts"
  } else {
    instructions += "1. Look for an 'Install' or 'Add to Home screen' option in your browser menu\n2. Follow the prompts to install"
  }
  
  alert(instructions)
}

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