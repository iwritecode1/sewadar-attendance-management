"use client"

import { useAuth } from "@/contexts/AuthContext"
import Layout from "@/components/Layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, Building, TrendingUp, BarChart3, PieChart, Activity, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api-client"

interface DashboardStats {
  overview: {
    centerCount: number
    sewadarCount: number
    eventCount: number
    coordinatorCount: number
    totalAttendance: number
  }
  centerStats: Array<{
    _id: string
    name: string
    code: string
    sewadarCount: number
    attendanceCount: number
    eventCount: number
  }>
  departmentStats: Array<{
    department: string
    count: number
  }>
  recentEvents: Array<{
    _id: string
    place: string
    department: string
    fromDate: string
    toDate: string
    createdBy: {
      name: string
    }
  }>
  attendanceTrends: Array<{
    date: string
    count: number
  }>
  genderStats: Array<{
    gender: string
    count: number
  }>
  badgeStatusStats: Array<{
    status: string
    count: number
  }>
}

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/attendance")
    }
  }, [user, router])

  const fetchDashboardStats = async () => {
    setLoading(true)
    try {
      const response = await apiClient.getDashboardStats(30)
      if (response.success && response.data) {
        setDashboardStats(response.data)
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === "admin") {
      fetchDashboardStats()
    }
  }, [user])

  if (!user || user.role !== "admin") {
    return null
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading dashboard...</span>
        </div>
      </Layout>
    )
  }

  if (!dashboardStats) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Failed to load dashboard data</p>
          <Button onClick={fetchDashboardStats} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </Layout>
    )
  }

  const { overview, centerStats, departmentStats, recentEvents, genderStats } = dashboardStats

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">RSSB {user.area} Area - Overview & Analytics</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button onClick={fetchDashboardStats} variant="outline" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Centers</CardTitle>
              <Building className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{overview.centerCount}</div>
              <p className="text-xs text-gray-500 mt-1">Active centers in {user.area}</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Sewadars</CardTitle>
              <Users className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{overview.sewadarCount}</div>
              <p className="text-xs text-gray-500 mt-1">Registered volunteers</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Events</CardTitle>
              <Calendar className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{overview.eventCount}</div>
              <p className="text-xs text-gray-500 mt-1">Sewa events organized</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Coordinators</CardTitle>
              <Activity className="h-5 w-5 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{overview.coordinatorCount}</div>
              <p className="text-xs text-gray-500 mt-1">Active coordinators</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Attendance</CardTitle>
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{overview.totalAttendance}</div>
              <p className="text-xs text-gray-500 mt-1">Attendance records</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Center Performance Chart */}
          <Card className="chart-container">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-blue-600" />
                Center Performance
              </CardTitle>
              <CardDescription>Attendance statistics by center</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {centerStats.map((center) => (
                  <div key={center._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{center.name}</h3>
                      <p className="text-sm text-gray-600">
                        {center.sewadarCount} sewadars • {center.eventCount} events
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{center.attendanceCount}</p>
                      <p className="text-sm text-gray-600">Total attendance</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Department Distribution */}
          <Card className="chart-container">
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="mr-2 h-5 w-5 text-green-600" />
                Department Distribution
              </CardTitle>
              <CardDescription>Sewadars by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {departmentStats
                  .sort((a, b) => b.count - a.count)
                  .map((dept) => (
                    <div key={dept.department} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">{dept.department}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(dept.count / overview.sewadarCount) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-gray-900 w-8 text-right">{dept.count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gender Distribution */}
        <Card className="enhanced-card">
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
            <CardDescription>Breakdown of sewadars by gender</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {genderStats.map((gender) => (
                <div
                  key={gender.gender}
                  className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl"
                >
                  <div className="text-4xl font-bold text-blue-600 mb-2">{gender.count}</div>
                  <p className="text-gray-700 font-medium">{gender.gender}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {((gender.count / overview.sewadarCount) * 100).toFixed(1)}% of total
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card className="enhanced-card">
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
            <CardDescription>Latest sewa events organized</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEvents.map((event) => (
                <div
                  key={event._id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{event.place}</h3>
                      <p className="text-sm text-gray-600">{event.department}</p>
                      <p className="text-xs text-gray-500">Created by {event.createdBy.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{event.fromDate}</p>
                    <p className="text-sm text-gray-600">to {event.toDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
