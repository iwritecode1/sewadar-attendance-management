import type React from "react"
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { DataProvider } from "@/contexts/DataContext"
import { Toaster } from "@/components/ui/toaster"
import ErrorBoundary from "@/components/ErrorBoundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sewadar Attendance Management",
  description: "Sewadar Attendance Management System for RSSB Areas",
  manifest: "/manifest.json",
};

// ✅ Separate viewport export
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1e40af", // ✅ Move themeColor here
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Icons */}
        <link rel="icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512x512.png" />

        {/* Theme and Status Bar */}
        <meta name="theme-color" content="#1e40af" />
        <meta name="msapplication-TileColor" content="#1e40af" />

        {/* iOS PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RSSB Attendance" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS Splash Screens */}
        <link rel="apple-touch-startup-image" href="/icon-512x512.png" />

        {/* Additional PWA Meta Tags */}
        <meta name="application-name" content="RSSB Attendance" />
        <meta name="msapplication-starturl" content="/" />
        <meta name="apple-mobile-web-app-title" content="RSSB Sewadar" />

        {/* Mobile Web App Capabilities */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="RSSB Sewadar" />

        {/* Additional iOS Meta Tags */}
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="format-detection" content="telephone=no" />

        {/* Splash Screen Meta Tags for iOS */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-startup-image" href="/icon-512x512.png" />

        {/* PWA Installation Script */}
        <script src="/install-pwa.js" defer></script>
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            <DataProvider>
              {children}
              <Toaster />
            </DataProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
