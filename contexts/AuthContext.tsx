"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import { redirect, useRouter } from "next/navigation"

export interface User {
  _id: string
  name: string
  role: "admin" | "coordinator"
  centerId?: string
  centerName?: string
  area: string
  areaCode: string
}

interface AuthContextType {
  user: User | null
  login: (credentials: { username: string; password: string }) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  checkSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkSession = async () => {
    try {
      const response = await apiClient.getSession();

      if (response.success && response?.user) {
        setUser(response?.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Session check failed:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

  const login = async (credentials: { username: string; password: string }): Promise<boolean> => {
    try {
      const response = await apiClient.login(credentials)

      if (response.success && response?.user) {
        setUser(response?.user)
        return true
      }

      return false
    } catch (error) {
      console.error("Login failed:", error)
      return false
    }
  }

  const logout = async () => {
    try {
      await apiClient.logout();
      router.push("/")
    } catch (error) {
      console.error("Logout failed:", error)
    } finally {
      setUser(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, checkSession }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
