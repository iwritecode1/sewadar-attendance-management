"use client"

import type React from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Home, Users, Calendar, Search, Settings, LogOut, Menu, X, Building2 } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (!user) return null

  const navigation = [
    ...(user.role === "admin" ? [{ name: "Dashboard", href: "/dashboard", icon: Home }] : []),
    { name: "Add Attendance", href: "/attendance", icon: Calendar },
    { name: "Manage Sewadars", href: "/sewadars", icon: Users },
    ...(user.role === "admin" ? [{ name: "Manage Coordinators", href: "/coordinators", icon: Settings }] : []),
    ...(user.role === "admin" ? [{ name: "Manage Centers", href: "/centers", icon: Building2 }] : []),
    { name: "Sewadar Lookup", href: "/lookup", icon: Search },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-blue-600">RSSB</h1>
            <p className="text-xs text-gray-500">Sewadar Attendance</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b shadow-sm">
          <div className="px-4 py-2 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors ${pathname === item.href
                    ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                  }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
            <button
              onClick={logout}
              className="flex items-center w-full px-3 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      )}

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:flex-shrink-0 lg:fixed lg:inset-y-0 lg:z-50 lg:w-72">
          <div className="flex flex-col w-full">
            <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto shadow-sm">
              {/* Logo and branding */}
              <div className="flex items-center flex-shrink-0 px-6 mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded flex items-center justify-center shadow-lg overflow-hidden">
                    {/* <span className="text-white font-bold text-xl">R</span> */}
                    <img src="/icon-192x192.png" alt="Logo" className="w-12 h-12" />
                  </div>
                  <div>
                    <h1 className="font-bold text-gray-900">Sewadar Attendance Management</h1>
                    {/* <p className="text-sm text-gray-600">Sewadar Attendance Management</p> */}
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex-grow flex flex-col">
                <nav className="flex-1 px-4 space-y-2">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${pathname === item.href
                          ? "bg-blue-50 text-blue-600 shadow-sm border-l-4 border-blue-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                    >
                      <item.icon
                        className={`mr-3 h-5 w-5 ${pathname === item.href ? "text-blue-600" : "text-gray-400"}`}
                      />
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Enhanced User info - Always at bottom */}
              <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-gray-50">
                <div className="flex-shrink-0 w-full group block">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-white font-bold text-lg">
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate pl-2">{user.name}</p>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"
                              }`}
                          >
                            {user.role === "admin" ? "Area Coordinator" : "Center Coordinator"}
                          </span>
                        </div>
                        {user.centerName && <p className="text-xs text-gray-600 truncate mt-1 pl-2">{user.centerName}</p>}
                        <p className="text-xs text-blue-600 font-medium pl-2">AREA {user.area}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={logout}
                      className="hover:bg-red-50 hover:text-red-600 ml-2"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content with left margin for fixed sidebar */}
        <div className="flex flex-col flex-1 lg:ml-72 min-h-screen main-content-with-sidebar">
          <main className="flex-1">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
