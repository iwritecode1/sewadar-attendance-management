"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useData } from "@/contexts/DataContext"
import { useAuth } from "@/contexts/AuthContext"
import Layout from "@/components/Layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Search, RefreshCw, Eye, Edit, Trash2, MoreHorizontal, Plus, Filter, X, Users, MapPin, Building } from "lucide-react"
import { useRouter } from "next/navigation"
import EventDetailsModal from "@/components/EventDetailsModal"
import EditEventModal from "@/components/EditEventModal"
import SearchablePlaceSelect from "@/components/SearchablePlaceSelect"
import SearchableDepartmentSelect from "@/components/SearchableDepartmentSelect"
import { formatDate } from "@/lib/date-utils"
import { DEPARTMENTS } from "@/lib/constants"
import { toTitleCase } from "@/lib/text-utils"

export default function EventsPage() {
  const { user } = useAuth()
  const { events, loading, pagination, fetchEvents, deleteEvent, updateEvent, places, departments, attendance, sewadars } = useData()
  const { toast } = useToast()
  const router = useRouter()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPlace, setSelectedPlace] = useState("all")
  const [selectedDepartment, setSelectedDepartment] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [viewingEvent, setViewingEvent] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [allEventDepartments, setAllEventDepartments] = useState<string[]>([])
  const [allEventPlaces, setAllEventPlaces] = useState<string[]>([])

  // Allow both admin and coordinator access
  // Coordinators get read-only access

  // Fetch all departments and places on initial load (without filters to get complete list)
  useEffect(() => {
    if (user && allEventDepartments.length === 0 && allEventPlaces.length === 0) {
      // Fetch all events without filters to get complete department and place lists
      fetchEvents({ page: 1, limit: 1000, includeStats: false })
        .then(() => {
          // This will trigger the departments and places update in the next useEffects
        })
        .catch(console.error)
    }
  }, [user, allEventDepartments.length, allEventPlaces.length, fetchEvents])

  // Update allEventDepartments when departments change
  useEffect(() => {
    if (departments.length > 0) {
      setAllEventDepartments(prev => {
        const combined = [...new Set([...prev, ...departments])]
        return combined.sort()
      })
    }
  }, [departments])

  // Update allEventPlaces when places change
  useEffect(() => {
    if (places.length > 0) {
      setAllEventPlaces(prev => {
        const combined = [...new Set([...prev, ...places])]
        return combined.sort()
      })
    }
  }, [places])

  // Fetch events when filters change
  useEffect(() => {
    if (user) {
      const params: any = {
        page: currentPage,
        limit: 20,
        includeStats: true,
      }

      if (searchTerm) params.search = searchTerm
      if (selectedPlace !== "all") params.place = selectedPlace
      if (selectedDepartment !== "all") params.department = selectedDepartment

      // Add a small delay to ensure database is ready after hard refresh
      const timeoutId = setTimeout(() => {
        fetchEvents(params)
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [searchTerm, selectedPlace, selectedDepartment, currentPage, fetchEvents, user])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedPlace("all")
    setSelectedDepartment("all")
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const refreshData = () => {
    fetchEvents({
      page: currentPage,
      limit: 20,
      includeStats: true,
      search: searchTerm || undefined,
      place: selectedPlace !== "all" ? selectedPlace : undefined,
      department: selectedDepartment !== "all" ? selectedDepartment : undefined,
    })
  }

  // Auto-refresh if stats are showing 0 for all events (likely a race condition)
  useEffect(() => {
    if (events.length > 0 && !loading.events) {
      const hasAnyStats = events.some(event => event.stats && event.stats.totalAttendance > 0)
      if (!hasAnyStats) {
        // Wait a bit and retry once
        const timeoutId = setTimeout(() => {
          refreshData()
        }, 2000)
        return () => clearTimeout(timeoutId)
      }
    }
  }, [events, loading.events])

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event? This will also delete all associated attendance records.")) {
      return
    }

    try {
      const success = await deleteEvent(eventId)
      if (success) {
        refreshData()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      })
    }
  }

  // Calculate unique sewadars across all events
  const getUniqueSewadarsCount = () => {
    const uniqueSewadarIds = new Set<string>()

    attendance.forEach(record => {
      // Add sewadars (includes both regular and formerly temporary sewadars)
      if (record.sewadars && Array.isArray(record.sewadars)) {
        record.sewadars.forEach((sewadar: any) => {
          // Handle both string IDs and sewadar objects
          const sewadarId = typeof sewadar === 'string' ? sewadar : sewadar._id
          if (sewadarId) {
            uniqueSewadarIds.add(sewadarId)
          }
        })
      }
    })

    return uniqueSewadarIds.size
  }

  if (!user) {
    return null
  }

  return (
    <Layout>
      <div className="space-y-2 md:space-y-4 px-0 md:px-0">
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg md:text-xl text-gray-900">
              {user.role === "admin" ? "Manage Sewa Events" : "View Sewa Events"}
            </h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              {user.role === "admin"
                ? `Create and manage sewa events for ${user.area} Area`
                : `View sewa events for ${user.area} Area`
              }
            </p>
          </div>

          {/* Mobile - More Actions Dropdown */}
          <div className="block md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full">
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => setShowCreateForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Sewa
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={refreshData} disabled={loading.events}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading.events ? "animate-spin" : ""}`} />
                  Refresh Data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop - Individual Buttons */}
          <div className="hidden md:flex space-x-2">
            {user.role === "admin" && (
              <Button onClick={() => setShowCreateForm(true)} className="text-sm rssb-primary">
                <Plus className="h-4 w-4" />
                Add New Sewa
              </Button>
            )}
            <Button onClick={refreshData} variant="outline" disabled={loading.events} className="text-sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading.events ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Create Event Form - Admin Only */}
        {user.role === "admin" && showCreateForm && (
          <CreateEventForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={() => {
              setShowCreateForm(false)
              refreshData()
            }}
          />
        )}

        {/* Edit Event Modal - Admin Only */}
        {user.role === "admin" && (
          <EditEventModal
            isOpen={!!editingEvent}
            onClose={() => setEditingEvent(null)}
            eventId={editingEvent}
            onSuccess={() => {
              setEditingEvent(null)
              refreshData()
            }}
          />
        )}

        {/* Filters and Search */}
        <Card className="enhanced-card">
          <CardContent className="pt-6">
            {/* Mobile Layout - Search with Filter Toggle */}
            <div className="block md:hidden space-y-4">
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by place or department"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              {/* Collapsible Filters */}
              {showFilters && (
                <div className="space-y-3 pt-2 border-t">
                  <Select value={selectedPlace} onValueChange={setSelectedPlace}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Places" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Places</SelectItem>
                      {allEventPlaces.map((place) => (
                        <SelectItem key={place} value={place}>
                          {toTitleCase(place)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {allEventDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {toTitleCase(dept)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={clearFilters} className="w-full bg-transparent">
                    <Filter className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>

            {/* Desktop Layout - All Filters Visible */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by place or department"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={selectedPlace} onValueChange={setSelectedPlace}>
                <SelectTrigger>
                  <SelectValue placeholder="All Places" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Places</SelectItem>
                  {allEventPlaces.map((place) => (
                    <SelectItem key={place} value={place}>
                      {toTitleCase(place)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {allEventDepartments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {toTitleCase(dept)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters} className="w-full bg-transparent">
                <Filter className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        {/* Mobile - Combined Stats Card */}
        <div className="block md:hidden">
          <Card className="stat-card">
            <CardContent className="py-2">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Events</span>
                  </div>
                  <p className="text-2xl text-gray-900">{pagination.events?.total || events.length}</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Places</span>
                  </div>
                  <p className="text-2xl text-gray-900">{places.length}</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Building className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Departments</span>
                  </div>
                  <p className="text-2xl text-gray-900">{departments.length}</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Users className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-gray-600">Sewadars</span>
                  </div>
                  <p className="text-2xl text-gray-900">{getUniqueSewadarsCount()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop - Individual Cards */}
        <div className="hidden md:grid grid-cols-4 gap-4">
          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-2xl text-gray-900">{pagination.events?.total || events.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sewa Places</p>
                  <p className="text-2xl text-gray-900">{places.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Departments</p>
                  <p className="text-2xl text-gray-900">{departments.length}</p>
                </div>
                <Building className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unique Sewadars</p>
                  <p className="text-2xl text-gray-900">{getUniqueSewadarsCount()}</p>
                </div>
                <Users className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events Table */}
        <Card className="enhanced-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base md:text-lg">
              <span>Sewa Events ({pagination.events?.total || events.length})</span>
              <Badge variant="secondary" className="ml-2">
                {user.area}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading.events ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading events...</span>
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="block md:hidden space-y-3">
                  {events.map((event, index) => (
                    <div
                      key={event._id}
                      className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${index % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}`}
                      onClick={() => setViewingEvent(event._id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm truncate">
                            {event.place}
                          </h4>
                          <p className="text-xs text-gray-600 truncate mt-1">
                            {event.department}
                          </p>
                        </div>
                        <div className="ml-3 flex-shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {formatDate(event.fromDate)} - {formatDate(event.toDate)}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {event.stats?.totalAttendance || 0}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {event.stats?.centersParticipated || 0} Centers
                          </Badge>
                        </div>

                        <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800"
                            onClick={() => setViewingEvent(event._id)}
                            title="View Details"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {user.role === "admin" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-green-600 hover:text-green-800"
                                onClick={() => setEditingEvent(event._id)}
                                title="Edit Event"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-800"
                                onClick={() => handleDeleteEvent(event._id)}
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden md:block overflow-x-auto">
                  <Table className="enhanced-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Place</TableHead>
                        <TableHead className="w-40">Department</TableHead>
                        <TableHead className="w-32">Duration</TableHead>
                        <TableHead className="w-24">Sewadars</TableHead>
                        {/* <TableHead className="w-24">Centers</TableHead> */}
                        <TableHead className="w-32">Created By</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event, index) => (
                        <TableRow
                          key={event._id}
                          className={`cursor-pointer hover:bg-blue-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-100"}`}
                          onClick={() => setViewingEvent(event._id)}
                        >
                          <TableCell className="w-32">{event.place}</TableCell>
                          <TableCell className="w-40">{event.department}</TableCell>
                          <TableCell className="w-32 text-sm">
                            <div>
                              <div>{formatDate(event.fromDate)}</div>
                              <div className="text-gray-500">to {formatDate(event.toDate)}</div>
                            </div>
                          </TableCell>
                          <TableCell className="w-24">
                            <Badge variant="secondary">
                              <Users className="h-3 w-3 mr-1" />
                              {event.stats?.totalAttendance || 0}
                            </Badge>
                          </TableCell>
                          {/* <TableCell className="w-24">
                            <Badge variant="outline">
                              {event.stats?.centersParticipated || 0}
                            </Badge>
                          </TableCell> */}
                          <TableCell className="w-32 text-sm">{event.createdBy.name}</TableCell>
                          <TableCell className="w-20">
                            <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                                onClick={() => setViewingEvent(event._id)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {user.role === "admin" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-800"
                                    onClick={() => setEditingEvent(event._id)}
                                    title="Edit Event"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                    onClick={() => handleDeleteEvent(event._id)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.events && pagination.events.pages > 1 && (
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-6 space-y-4 md:space-y-0">
                    <div className="text-xs md:text-sm text-gray-600 text-center md:text-left">
                      Showing {(pagination.events.page - 1) * pagination.events.limit + 1} to{" "}
                      {Math.min(pagination.events.page * pagination.events.limit, pagination.events.total)} of{" "}
                      {pagination.events.total} results
                    </div>
                    <div className="flex justify-center md:justify-end">
                      <div className="flex space-x-1 md:space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.events.page - 1)}
                          disabled={pagination.events.page <= 1}
                          className="text-xs md:text-sm px-2 md:px-3"
                        >
                          <span className="hidden md:inline">Previous</span>
                          <span className="md:hidden">Prev</span>
                        </Button>
                        {Array.from({ length: Math.min(3, pagination.events.pages) }, (_, i) => {
                          const page = i + 1
                          return (
                            <Button
                              key={page}
                              variant={page === pagination.events.page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page)}
                              className="text-xs md:text-sm px-2 md:px-3 min-w-[32px] md:min-w-[40px]"
                            >
                              {page}
                            </Button>
                          )
                        })}
                        {pagination.events.pages > 3 && (
                          <>
                            <span className="flex items-center text-gray-400 px-1">...</span>
                            <Button
                              variant={pagination.events.pages === pagination.events.page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pagination.events.pages)}
                              className="text-xs md:text-sm px-2 md:px-3 min-w-[32px] md:min-w-[40px]"
                            >
                              {pagination.events.pages}
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.events.page + 1)}
                          disabled={pagination.events.page >= pagination.events.pages}
                          className="text-xs md:text-sm px-2 md:px-3"
                        >
                          <span className="hidden md:inline">Next</span>
                          <span className="md:hidden">Next</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Event Details Modal */}
        <EventDetailsModal
          isOpen={!!viewingEvent}
          onClose={() => setViewingEvent(null)}
          eventId={viewingEvent}
          eventName={events.find(e => e._id === viewingEvent)?.place || ""}
        />
      </div>
    </Layout>
  )
}

// Create Event Form Component
function CreateEventForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { createEvent } = useData()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    place: "",
    department: "",
    fromDate: "",
    toDate: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.place || !formData.department || !formData.fromDate || !formData.toDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (new Date(formData.fromDate) > new Date(formData.toDate)) {
      toast({
        title: "Error",
        description: "From date cannot be after to date",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const success = await createEvent(formData)
      if (success) {
        onSuccess()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="enhanced-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-base">
              <Plus className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              Add New Sewa Event
            </CardTitle>
            <CardDescription className="text-sm">
              Add a new sewa event for attendance tracking
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Place <span className="text-red-500">*</span>
              </label>
              <SearchablePlaceSelect
                value={formData.place}
                onValueChange={(value) => setFormData({ ...formData, place: value })}
                placeholder="Search or add place"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <SearchableDepartmentSelect
                value={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
                placeholder="Search or add department"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={formData.fromDate}
                onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={formData.toDate}
                onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rssb-primary">
              {isSubmitting ? "Creating..." : "Add Sewa"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

