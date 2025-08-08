// Service Worker registration for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const isLocalhost = Boolean(
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]" ||
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/) ||
      // Local network IP ranges
      window.location.hostname.match(/^192\.168\./) ||
      window.location.hostname.match(/^10\./) ||
      window.location.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
      // Development domains
      window.location.hostname.endsWith('.local') ||
      window.location.hostname.endsWith('.dev')
    )

    // Development mode: unregister service workers to prevent caching issues
    if (isLocalhost) {
      navigator.serviceWorker.getRegistrations()
        .then(function (registrations) {
          for (let registration of registrations) {
            registration.unregister()
              .then(function (boolean) {
                console.log("Development: Service worker unregistered:", boolean)
              })
              .catch(function (error) {
                console.warn("Failed to unregister service worker:", error)
              })
          }
        })
        .catch(function (error) {
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
  console.log("🎯 beforeinstallprompt event fired!")
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault()
  // Stash the event so it can be triggered later
  deferredPrompt = e

  // Show custom install banner for Android/Chrome
  showInstallBanner()
})

function showInstallBanner() {
  console.log("🔍 showInstallBanner() called")

  // Don't show if already installed
  if (isInStandaloneMode()) {
    console.log("❌ Banner blocked: App already in standalone mode")
    return
  }

  // Check PWA compatibility
  const compatibility = window.checkPWACompatibility()
  if (!compatibility.canInstall) {
    console.log("❌ Banner blocked: PWA installation not supported in current environment")
    if (compatibility.isLocalIP && !compatibility.isHTTPS) {
      console.log("💡 Tip: PWA installation requires HTTPS. Try using localhost or deploy to HTTPS environment.")
    }
    return
  }

  // Check if banner was shown in the last 24 hours
  const lastShown = localStorage.getItem("installBannerLastShown")
  const now = Date.now()
  const twentyFourHours = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

  if (lastShown) {
    const timeSinceLastShown = now - parseInt(lastShown)
    console.log("📱 Time since last shown:", Math.round(timeSinceLastShown / (60 * 60 * 1000)), "hours")

    if (timeSinceLastShown < twentyFourHours) {
      console.log("❌ Banner blocked: Shown within last 24 hours")
      return
    }
  }

  // Check if user permanently dismissed the banner
  const permanentlyDismissed = localStorage.getItem("installBannerPermanentlyDismissed")
  if (permanentlyDismissed === "true") {
    console.log("❌ Banner blocked: User permanently dismissed")
    return
  }

  console.log("✅ All checks passed, showing banner")
  // Mark as shown now
  localStorage.setItem("installBannerLastShown", now.toString())

  const installBanner = document.createElement("div")
  installBanner.id = "install-banner"
  installBanner.innerHTML = `
    <div style="position: fixed; bottom: 1rem; right: 1rem; z-index: 9999; max-width: 24rem; animation: slideUp 0.4s ease-out;">
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.25rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 3rem; height: 3rem; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
              <svg style="width: 1.5rem; height: 1.5rem; color: white;" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div>
              <h3 style="font-weight: 600; font-size: 1rem; color: #111827; margin: 0; line-height: 1.25;">Install RSSB App</h3>
              <p style="font-size: 0.875rem; color: #6b7280; margin: 0.25rem 0 0 0; line-height: 1.25;">Quick access from your home screen</p>
            </div>
          </div>
          <button id="dismiss-install-btn" style="padding: 0.5rem; border-radius: 0.375rem; border: none; background: transparent; color: #6b7280; cursor: pointer; transition: all 0.2s ease;">
            <svg style="width: 1rem; height: 1rem;" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <button id="install-app-btn" style="width: 100%; background: #3b82f6; color: white; font-weight: 500; padding: 0.75rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; border: none; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
            Install App
          </button>
          <button id="maybe-later-btn" style="width: 100%; background: #f3f4f6; color: #374151; font-weight: 500; padding: 0.625rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; border: 1px solid #e5e7eb; cursor: pointer; transition: all 0.2s ease;">
            Maybe Later
          </button>
        </div>
      </div>
    </div>
    
    <style>
      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      #dismiss-install-btn:hover {
        background-color: #f3f4f6 !important;
      }
      
      #install-app-btn:hover {
        background-color: #2563eb !important;
        transform: translateY(-1px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
      }
      
      #maybe-later-btn:hover {
        background-color: #e5e7eb !important;
      }
      
      @media (max-width: 640px) {
        #install-banner > div {
          margin: 0 1rem !important;
          max-width: calc(100vw - 2rem) !important;
        }
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
    // Set a longer delay before showing again (7 days)
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    const nextShowTime = Date.now() + sevenDays
    localStorage.setItem("installBannerLastShown", nextShowTime.toString())
    console.log("📱 Banner dismissed, will show again in 7 days")
  })

  // Maybe later button click handler
  document.getElementById("maybe-later-btn").addEventListener("click", () => {
    installBanner.remove()
    // Show again in 3 days
    const threeDays = 3 * 24 * 60 * 60 * 1000
    const nextShowTime = Date.now() + threeDays
    localStorage.setItem("installBannerLastShown", nextShowTime.toString())
    console.log("📱 Banner postponed, will show again in 3 days")
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

// Global function to manually test install banner (for debugging)
window.showInstallBanner = function () {
  console.log("🧪 Manual banner test triggered")
  // Clear localStorage timestamps to allow banner to show
  localStorage.removeItem("installBannerLastShown")
  localStorage.removeItem("iosInstallBannerLastShown")
  localStorage.removeItem("installBannerPermanentlyDismissed")
  localStorage.removeItem("iosInstallBannerPermanentlyDismissed")

  console.log("🧹 Banner timestamps cleared")

  // Show banner based on device type
  if (isIOS()) {
    console.log("📱 Testing iOS banner")
    showIOSInstallInstructions()
  } else {
    console.log("📱 Testing standard banner")
    showInstallBanner()
  }
}

// Global function to clear all PWA data
window.clearPWAData = function () {
  console.log("🧹 Clearing all PWA data...")
  localStorage.removeItem("installBannerLastShown")
  localStorage.removeItem("iosInstallBannerLastShown")
  localStorage.removeItem("installBannerPermanentlyDismissed")
  localStorage.removeItem("iosInstallBannerPermanentlyDismissed")
  console.log("✅ All PWA data cleared")
}

// Global function to check PWA compatibility
window.checkPWACompatibility = function () {
  const isHTTPS = window.location.protocol === 'https:'
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const isLocalIP = window.location.hostname.match(/^192\.168\./) || window.location.hostname.match(/^10\./) || window.location.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
  const hasServiceWorker = 'serviceWorker' in navigator
  const isStandalone = isInStandaloneMode()

  console.log("🔍 PWA Compatibility Check:")
  console.log("- Protocol:", window.location.protocol)
  console.log("- Is HTTPS:", isHTTPS)
  console.log("- Is localhost:", isLocalhost)
  console.log("- Is local IP:", !!isLocalIP)
  console.log("- Has Service Worker support:", hasServiceWorker)
  console.log("- Is iOS:", isIOS())
  console.log("- Is standalone:", isStandalone)
  console.log("- User Agent:", navigator.userAgent)

  if (isIOS() && isLocalIP && !isHTTPS) {
    console.log("⚠️  WARNING: iOS PWA installation requires HTTPS. Local IP with HTTP won't work for PWA installation.")
    console.log("💡 Solutions:")
    console.log("   1. Use localhost instead of IP (if possible)")
    console.log("   2. Set up local HTTPS with self-signed certificate")
    console.log("   3. Use ngrok or similar tunneling service")
    console.log("   4. Deploy to HTTPS staging environment")
  }

  return {
    canInstall: (isHTTPS || isLocalhost) && hasServiceWorker && !isStandalone,
    isHTTPS,
    isLocalhost,
    isLocalIP: !!isLocalIP,
    hasServiceWorker,
    isStandalone
  }
}

// Global function to check banner status
window.checkBannerStatus = function () {
  const now = Date.now()
  const lastShown = localStorage.getItem("installBannerLastShown")
  const iosLastShown = localStorage.getItem("iosInstallBannerLastShown")

  console.log("📊 Banner Status:")
  console.log("- Is standalone:", isInStandaloneMode())
  console.log("- Is iOS:", isIOS())

  if (lastShown) {
    const hoursAgo = Math.round((now - parseInt(lastShown)) / (60 * 60 * 1000))
    console.log("- Standard banner last shown:", hoursAgo, "hours ago")
  } else {
    console.log("- Standard banner: Never shown")
  }

  if (iosLastShown) {
    const hoursAgo = Math.round((now - parseInt(iosLastShown)) / (60 * 60 * 1000))
    console.log("- iOS banner last shown:", hoursAgo, "hours ago")
  } else {
    console.log("- iOS banner: Never shown")
  }
}

// Global function to manually unregister service workers (for debugging)
window.unregisterServiceWorkers = function () {
  if ("serviceWorker" in navigator) {
    console.log("Starting manual service worker cleanup...")

    navigator.serviceWorker.getRegistrations()
      .then(function (registrations) {
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
          return caches.keys().then(function (names) {
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
    // Check if banner was shown in the last 24 hours
    const lastShown = localStorage.getItem("iosInstallBannerLastShown")
    const now = Date.now()
    const twentyFourHours = 24 * 60 * 60 * 1000

    if (lastShown) {
      const timeSinceLastShown = now - parseInt(lastShown)
      console.log("📱 iOS banner - Time since last shown:", Math.round(timeSinceLastShown / (60 * 60 * 1000)), "hours")

      if (timeSinceLastShown < twentyFourHours) {
        console.log("❌ iOS banner blocked: Shown within last 24 hours")
        return
      }
    }

    // Check if user permanently dismissed the iOS banner
    const permanentlyDismissed = localStorage.getItem("iosInstallBannerPermanentlyDismissed")
    if (permanentlyDismissed === "true") {
      console.log("❌ iOS banner blocked: User permanently dismissed")
      return
    }

    console.log("✅ Showing iOS install banner")
    // Mark as shown now
    localStorage.setItem("iosInstallBannerLastShown", now.toString())
    const iosInstallBanner = document.createElement("div")
    iosInstallBanner.id = "ios-install-banner"
    iosInstallBanner.innerHTML = `
      <div style="position: fixed; bottom: 1rem; right: 1rem; z-index: 9999; max-width: 24rem; animation: slideUp 0.4s ease-out;">
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.25rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
          <div style="display: flex; align-items: flex-start; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 3rem; height: 3rem; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
                <svg style="width: 1.5rem; height: 1.5rem; color: white;" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div>
                <h3 style="font-weight: 600; font-size: 1rem; color: #111827; margin: 0; line-height: 1.25;">Install RSSB App</h3>
                <p style="font-size: 0.875rem; color: #6b7280; margin: 0.25rem 0 0 0; line-height: 1.4;">
                  Tap <svg style="display: inline; width: 1rem; height: 1rem; margin: 0 0.25rem; vertical-align: middle;" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 8a2 2 0 110 4 2 2 0 010-4zM10 16a2 2 0 110 4 2 2 0 010-4z" clip-rule="evenodd"/></svg> then "Add to Home Screen"
                </p>
              </div>
            </div>
            <button id="ios-dismiss-btn" style="padding: 0.5rem; border-radius: 0.375rem; border: none; background: transparent; color: #6b7280; cursor: pointer; transition: all 0.2s ease;">
              <svg style="width: 1rem; height: 1rem;" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <style>
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        #ios-dismiss-btn:hover {
          background-color: #f3f4f6 !important;
        }
        
        @media (max-width: 640px) {
          #ios-install-banner > div {
            margin: 0 1rem !important;
            max-width: calc(100vw - 2rem) !important;
          }
        }
      </style>
    `
    document.body.appendChild(iosInstallBanner)

    // Add dismiss button event handler
    document.getElementById("ios-dismiss-btn").addEventListener("click", () => {
      iosInstallBanner.remove()
      // Set a longer delay before showing again (7 days)
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      const nextShowTime = Date.now() + sevenDays
      localStorage.setItem("iosInstallBannerLastShown", nextShowTime.toString())
      console.log("📱 iOS banner dismissed, will show again in 7 days")
    })

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
  console.log("🚀 Page loaded, checking device type")
  console.log("📱 Is iOS:", isIOS())
  console.log("📱 Is standalone:", isInStandaloneMode())
  console.log("📱 Deferred prompt available:", !!deferredPrompt)

  // Show iOS instructions for iOS devices
  if (isIOS()) {
    console.log("📱 iOS device detected, showing iOS banner in 2 seconds")
    setTimeout(() => {
      console.log("⏰ iOS timeout reached, calling showIOSInstallInstructions")
      showIOSInstallInstructions()
    }, 2000)
  } else {
    console.log("📱 Non-iOS device, showing banner in 3 seconds")
    // Show install banner for other devices after a short delay
    setTimeout(() => {
      console.log("⏰ 3 second timeout reached")
      console.log("📱 Deferred prompt status:", !!deferredPrompt)
      if (!deferredPrompt) {
        console.log("📱 No deferred prompt, showing banner anyway")
        // If no beforeinstallprompt event, still show banner for manual instructions
        showInstallBanner()
      } else {
        console.log("📱 Deferred prompt exists, banner should have been shown already")
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