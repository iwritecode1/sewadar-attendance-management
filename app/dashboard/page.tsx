"use client"

import { useAuth } from "@/contexts/AuthContext"
import Layout from "@/components/Layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, Building, TrendingUp, BarChart3, PieChart, Activity, RefreshCw, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api-client"
import EventDetailsModal from "@/components/EventDetailsModal"
import { formatDate } from "@/lib/date-utils"

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
    totalSewadars: number
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
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedEventName, setSelectedEventName] = useState<string>("")
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)

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

  const handleEventClick = (eventId: string, eventName: string) => {
    setSelectedEventId(eventId)
    setSelectedEventName(eventName)
    setIsEventModalOpen(true)
  }

  const handleCloseEventModal = () => {
    setIsEventModalOpen(false)
    setSelectedEventId(null)
    setSelectedEventName("")
  }

  return (
    <Layout>
      <div className="space-y-4 md:space-y-8 px-0 md:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 md:px-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">Overview & Analytics</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button onClick={fetchDashboardStats} variant="outline" disabled={loading} className="w-full sm:w-auto">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">Refresh Data</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {/* Mobile - Combined Stats Cards */}
        <div className="block lg:hidden space-y-4 px-4 md:px-0">
          {/* First Row - Centers, Sewadars, Events */}
          <Card className="stat-card">
            <CardContent className="py-4 px-4">
              <div className="grid grid-cols-3 gap-3">
                {/* <div className="text-center space-y-1">
                  <div className="flex items-center justify-center space-x-1">
                    <Building className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-gray-600">Centers</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{overview.centerCount}</p>
                </div> */}
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center space-x-1">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-medium text-gray-600">Events</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{overview.eventCount}</p>
                </div>
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center space-x-1">
                    <Users className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-gray-600">Sewadars</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{overview.sewadarCount}</p>
                </div>
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center space-x-1">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <span className="text-xs font-medium text-gray-600">Attendance</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{overview.totalAttendance}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Second Row - Coordinators, Attendance */}
          <Card className="stat-card">
            <CardContent className="py-4 px-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Building className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Centers</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{overview.centerCount}</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Activity className="h-5 w-5 text-indigo-600" />
                    <span className="text-sm font-medium text-gray-600">Coordinators</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{overview.coordinatorCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop - Individual Cards */}
        <div className="hidden lg:grid grid-cols-5 gap-6">

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Sewadars</CardTitle>
              <Users className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{overview.sewadarCount}</div>
              <p className="text-xs text-gray-500 mt-1">Registered</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Centers</CardTitle>
              <Building className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{overview.centerCount}</div>
              <p className="text-xs text-gray-500 mt-1">Active in {user.area}</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Coordinators</CardTitle>
              <Activity className="h-5 w-5 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{overview.coordinatorCount}</div>
              <p className="text-xs text-gray-500 mt-1">Active</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Events</CardTitle>
              <Calendar className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{overview.eventCount}</div>
              <p className="text-xs text-gray-500 mt-1">Sewa Jatha</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Attended</CardTitle>
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{overview.totalAttendance}</div>
              <p className="text-xs text-gray-500 mt-1">Sewadars</p>
            </CardContent>
          </Card>

        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 px-4 md:px-0">
          {/* Center Performance Chart */}
          <Card className="chart-container">
            <CardHeader>
              <CardTitle className="flex items-center text-base md:text-lg">
                <BarChart3 className="mr-2 h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                <span className="hidden md:inline">Center Performance</span>
                <span className="md:hidden">Centers</span>
              </CardTitle>
              <CardDescription className="text-sm">
                <span className="hidden md:inline">Attendance statistics by center</span>
                <span className="md:hidden">Attendance by center</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4">
                {centerStats.map((center) => (
                  <div key={center._id} className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 text-sm md:text-base truncate">{center.name}</h3>
                      <p className="text-xs md:text-sm text-gray-600">
                        {center.sewadarCount} sewadars • {center.eventCount} events
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-xl md:text-2xl font-bold text-blue-600">{center.attendanceCount}</p>
                      <p className="text-xs md:text-sm text-gray-600">Participated</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Department Distribution */}
          <Card className="chart-container">
            <CardHeader>
              <CardTitle className="flex items-center text-base md:text-lg">
                <PieChart className="mr-2 h-4 w-4 md:h-5 md:w-5 text-green-600" />
                <span className="hidden md:inline">Department Distribution</span>
                <span className="md:hidden">Departments</span>
              </CardTitle>
              <CardDescription className="text-sm">
                <span className="hidden md:inline">Sewadars by department</span>
                <span className="md:hidden">Sewadar distribution</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {departmentStats
                  .sort((a, b) => b.count - a.count)
                  .map((dept) => (
                    <div key={dept.department} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
                        <div className="w-3 h-3 bg-blue-600 rounded-full flex-shrink-0"></div>
                        <span className="text-sm font-medium text-gray-700 truncate">{dept.department}</span>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <div className="w-16 md:w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(dept.count / overview.sewadarCount) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-gray-900 w-6 md:w-8 text-right">{dept.count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gender Distribution */}
        <Card className="enhanced-card mx-4 md:mx-0">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Gender Distribution</CardTitle>
            <CardDescription className="text-sm">Breakdown of sewadars by gender</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {genderStats.map((gender) => (
                <div
                  key={gender.gender}
                  className="text-center p-4 md:p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl"
                >
                  <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">{gender.count}</div>
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
        <Card className="enhanced-card mx-4 md:mx-0">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Recent Events</CardTitle>
            <CardDescription className="text-sm">Latest sewa events organized</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEvents.map((event) => (
                <div
                  key={event._id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors cursor-pointer"
                  onClick={() => handleEventClick(event._id, `${event.place} - ${event.department}`)}
                >
                  {/* Mobile Layout (default) */}
                  <div className="block md:hidden">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-900 text-sm truncate">{event.place}</h3>
                          <p className="text-sm text-gray-600 truncate">{event.department}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 ml-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEventClick(event._id, `${event.place} - ${event.department}`)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="flex items-center justify-center mb-1">
                          <Users className="h-3 w-3 text-blue-600 mr-1" />
                          <span className="text-sm font-medium text-gray-900">{event.totalSewadars}</span>
                        </div>
                        <p className="text-xs text-gray-500 text-center">Sewadars</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-sm font-medium text-gray-900 text-center">{formatDate(event.fromDate)}</p>
                        <p className="text-xs text-gray-500 text-center">to {formatDate(event.toDate)}</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500">Created by {event.createdBy.name}</p>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:flex md:items-center md:justify-between">
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
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <Badge variant="secondary" className="mb-1">
                          <Users className="h-3 w-3 mr-1" />
                          {event.totalSewadars} Sewadars
                        </Badge>
                        <p className="text-xs text-gray-500">Total Participants</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{formatDate(event.fromDate)}</p>
                        <p className="text-sm text-gray-600">to {formatDate(event.toDate)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEventClick(event._id, `${event.place} - ${event.department}`)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Details Modal */}
      <EventDetailsModal
        isOpen={isEventModalOpen}
        onClose={handleCloseEventModal}
        eventId={selectedEventId}
        eventName={selectedEventName}
      />
    </Layout>
  )
}
