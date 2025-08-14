"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "./AuthContext"

export interface Sewadar {
  _id: string
  badgeNumber: string
  name: string
  fatherHusbandName: string
  dob: string
  age?: number
  gender: "MALE" | "FEMALE"
  badgeStatus: "PERMANENT" | "OPEN" | "TEMPORARY"
  zone: string
  area: string
  center: string
  centerId: string
  department: string
  contactNo: string
  emergencyContact: string
  createdAt: string
  updatedAt: string
  stats?: {
    attendanceCount: number
  }
  attendanceHistory?: AttendanceRecord[]
}

export interface SewaEvent {
  _id: string
  place: string
  department: string
  fromDate: string
  toDate: string
  area: string
  areaCode: string
  createdBy: {
    _id: string
    name: string
  }
  createdAt: string
  stats?: {
    totalAttendance: number
    centersParticipated: number
    attendanceRecords: number
    duration: number
  }
}

export interface AttendanceRecord {
  _id: string
  eventId: {
    _id: string
    place: string
    department: string
    fromDate: string
    toDate: string
  }
  centerId: string
  centerName: string
  sewadars: Sewadar[]
  nominalRollImages: string[]
  submittedBy: {
    _id: string
    name: string
  }
  submittedAt: string
}

export interface Center {
  _id: string
  name: string
  code: string
  area: string
  areaCode: string
  createdAt: string
  stats?: {
    sewadarCount: number
    attendanceCount: number
    coordinatorCount: number
    maleCount: number
    femaleCount: number
    departments: Array<{
      department: string
      count: number
    }>
  }
}

export interface Coordinator {
  _id: string
  name: string
  username: string
  role: string
  area: string
  areaCode: string
  centerId: string
  centerName: string
  isActive: boolean
  createdAt: string
}

interface DataContextType {
  // Data
  sewadars: Sewadar[]
  events: SewaEvent[]
  attendance: AttendanceRecord[]
  centers: Center[]
  coordinators: Coordinator[]
  places: string[]
  departments: string[]

  // Loading states
  loading: {
    sewadars: boolean
    events: boolean
    attendance: boolean
    centers: boolean
    coordinators: boolean
  }

  // Pagination
  pagination: {
    sewadars: any
    events: any
    attendance: any
    centers: any
    coordinators: any
  }

  // Actions
  fetchSewadars: (params?: any) => Promise<void>
  fetchEvents: (params?: any) => Promise<void>
  fetchEventsForAttendance: (params?: any) => Promise<void>
  fetchAttendance: (params?: any) => Promise<void>
  fetchCenters: (params?: any) => Promise<void>
  fetchCoordinators: (params?: any) => Promise<void>

  createSewadar: (data: any) => Promise<boolean>
  updateSewadar: (id: string, data: any) => Promise<boolean>
  deleteSewadar: (id: string) => Promise<boolean>
  importSewadars: (file: File) => Promise<boolean | { success: boolean; jobId: string; total: number }>

  createEvent: (data: any) => Promise<boolean>
  updateEvent: (id: string, data: any) => Promise<boolean>
  deleteEvent: (id: string) => Promise<boolean>

  createAttendance: (data: any) => Promise<boolean>
  updateAttendance: (id: string, data: any) => Promise<boolean>
  deleteAttendance: (id: string) => Promise<boolean>

  createCenter: (data: any) => Promise<boolean>
  updateCenter: (id: string, data: any) => Promise<boolean>
  deleteCenter: (id: string) => Promise<boolean>

  createCoordinator: (data: any) => Promise<boolean>
  updateCoordinatorStatus: (id: string, isActive: boolean) => Promise<boolean>
  deleteCoordinator: (id: string) => Promise<boolean>

  // Utility functions
  getSewadarsForCenter: (centerId: string) => Sewadar[]
  fetchSewadarsForCenter: (centerId: string) => Promise<void>
  getAttendanceForSewadar: (sewadarId: string) => AttendanceRecord[]
  getExistingAttendanceForEvent: (eventId: string, centerId: string) => AttendanceRecord | undefined
  getExistingAttendanceForEventByUser: (eventId: string, userId: string) => AttendanceRecord | undefined
  addPlace: (place: string) => void
  addDepartment: (department: string) => void

  // Refresh functions
  refreshAll: () => Promise<void>
  refreshSewadars: () => Promise<void>
  refreshEvents: () => Promise<void>
  refreshAttendance: () => Promise<void>
  refreshCenters: () => Promise<void>
  refreshCoordinators: () => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { toast } = useToast()

  // State
  const [sewadars, setSewadars] = useState<Sewadar[]>([])
  const [events, setEvents] = useState<SewaEvent[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [centers, setCenters] = useState<Center[]>([])
  const [coordinators, setCoordinators] = useState<Coordinator[]>([])
  const [places, setPlaces] = useState<string[]>([])
  const [departments, setDepartments] = useState<string[]>([])

  // Loading states
  const [loading, setLoading] = useState({
    sewadars: false,
    events: false,
    attendance: false,
    centers: false,
    coordinators: false,
    // CRUD operation loading states
    createSewadar: false,
    updateSewadar: false,
    deleteSewadar: false,
    importSewadars: false,
    createEvent: false,
    updateEvent: false,
    deleteEvent: false,
    createAttendance: false,
    updateAttendance: false,
    deleteAttendance: false,
    createCenter: false,
    updateCenter: false,
    deleteCenter: false,
    createCoordinator: false,
    updateCoordinator: false,
    deleteCoordinator: false,
  })

  // Pagination states
  const [pagination, setPagination] = useState({
    sewadars: null,
    events: null,
    attendance: null,
    centers: null,
    coordinators: null,
  })

  // Request cancellation controllers using refs to avoid dependency issues
  const currentSewadarsController = useRef<AbortController | null>(null)
  const currentEventsController = useRef<AbortController | null>(null)
  const currentAttendanceController = useRef<AbortController | null>(null)

  // Helper function to handle API responses
  const handleApiResponse = useCallback(
    (response: any, successMessage?: string, errorMessage?: string) => {
      if (response.success) {
        // Handle success with potential temp sewadar information
        if (response.tempSewadarInfo && response.tempSewadarInfo.length > 0) {
          // Show main success message
          toast({
            title: "Attendance Submitted",
            description: response.message || "Attendance submitted successfully",
            variant: "default",
          })

          // Show detailed temp sewadar information in a separate toast
          setTimeout(() => {
            toast({
              title: "Temporary Sewadar Details",
              description: response.tempSewadarInfo.join("; "),
              variant: "default",
              duration: 10000, // Longer duration for detailed info
            })
          }, 1500)

          // Show warnings if any
          if (response.warnings && response.warnings.length > 0) {
            setTimeout(() => {
              toast({
                title: "Processing Errors",
                description: response.warnings.join("; "),
                variant: "destructive",
                duration: 8000,
              })
            }, 3000)
          }
        } else if (response.warnings && response.warnings.length > 0) {
          // Show warning toast for other types of warnings
          toast({
            title: "Partial Success",
            description: response.message || "Some items were processed with warnings",
            variant: "default",
          })
          // Show detailed warnings in a separate toast
          setTimeout(() => {
            toast({
              title: "Processing Warnings",
              description: response.warnings.join("; "),
              variant: "destructive",
              duration: 8000,
            })
          }, 1000)
        } else if (successMessage || response.message) {
          toast({
            title: "Success",
            description: response.message || successMessage,
          })
        }
        return true
      } else {
        toast({
          title: "Error",
          description: errorMessage || response.error || "An error occurred",
          variant: "destructive",
        })
        return false
      }
    },
    [toast],
  )

  // Fetch functions
  const fetchSewadars = useCallback(async (params?: any) => {
    // Cancel previous sewadars request if it exists
    if (currentSewadarsController.current) {
      currentSewadarsController.current.abort()
    }

    // Create new AbortController for this request
    const controller = new AbortController()
    currentSewadarsController.current = controller

    setLoading((prev) => ({ ...prev, sewadars: true }))
    try {
      // Use provided params, with sensible defaults for pagination
      // Note: For fetching all sewadars for a specific center, use fetchSewadarsForCenter()
      const fetchParams = {
        page: 1,   // Default page
        limit: 50, // Default limit for pagination (prevents loading all sewadars accidentally)
        signal: controller.signal, // Pass abort signal
        ...params  // Override with provided params
      }
      const response = await apiClient.getSewadars(fetchParams)

      // Check if request was aborted
      if (controller.signal.aborted) {
        return
      }

      if (response.success && response.data) {
        setSewadars(response.data)
        setPagination((prev) => ({ ...prev, sewadars: response.pagination }))
      }
    } catch (error: any) {
      // Don't log error if request was aborted
      if (error.name === 'AbortError' || controller.signal.aborted) {
        return
      }
      console.error("Failed to fetch sewadars:", error)
    } finally {
      // Only update loading state if request wasn't aborted
      if (!controller.signal.aborted) {
        setLoading((prev) => ({ ...prev, sewadars: false }))
        currentSewadarsController.current = null
      }
    }
  }, [])

  const fetchEventsForAttendance = useCallback(async (params?: any, retryCount = 0) => {
    // Cancel previous events request if it exists
    if (currentEventsController.current) {
      currentEventsController.current.abort()
    }

    // Create new AbortController for this request
    const controller = new AbortController()
    currentEventsController.current = controller

    // Clear existing events to ensure fresh load for attendance
    setEvents([])
    setLoading((prev) => ({ ...prev, events: true }))
    try {
      const response = await apiClient.getEvents({
        signal: controller.signal,
        forAttendance: true, // This ensures all events are returned for attendance
        ...params
      })

      // Check if request was aborted
      if (controller.signal.aborted) {
        return
      }

      if (response.success && response.data) {
        setEvents(response.data)
        setPagination((prev) => ({ ...prev, events: response.pagination }))

        // Extract unique places and departments
        const uniquePlaces = [...new Set(response.data.map((e: SewaEvent) => e.place))]
        const uniqueDepartments = [...new Set(response.data.map((e: SewaEvent) => e.department))]
        setPlaces(uniquePlaces)
        setDepartments(uniqueDepartments)
      } else if (params?.includeStats && retryCount < 2) {
        // If stats request failed and we haven't retried too many times, retry after a delay
        setTimeout(() => {
          fetchEventsForAttendance(params, retryCount + 1)
        }, 1000 * (retryCount + 1))
        return
      }
    } catch (error: any) {
      // Don't log error if request was aborted
      if (error.name === 'AbortError' || controller.signal.aborted) {
        return
      }
      console.error("Failed to fetch events for attendance:", error)

      // Retry for stats requests if it's a network/timing issue
      if (params?.includeStats && retryCount < 2) {
        setTimeout(() => {
          fetchEventsForAttendance(params, retryCount + 1)
        }, 1000 * (retryCount + 1))
        return
      }
    } finally {
      // Only update loading state if request wasn't aborted
      if (!controller.signal.aborted) {
        setLoading((prev) => ({ ...prev, events: false }))
        currentEventsController.current = null
      }
    }
  }, [])

  const fetchEvents = useCallback(async (params?: any, retryCount = 0) => {
    // Cancel previous events request if it exists
    if (currentEventsController.current) {
      currentEventsController.current.abort()
    }

    // Create new AbortController for this request
    const controller = new AbortController()
    currentEventsController.current = controller

    setLoading((prev) => ({ ...prev, events: true }))
    try {
      const response = await apiClient.getEvents({
        signal: controller.signal,
        ...params
      })

      // Check if request was aborted
      if (controller.signal.aborted) {
        return
      }

      if (response.success && response.data) {
        setEvents(response.data)
        setPagination((prev) => ({ ...prev, events: response.pagination }))

        // Extract unique places and departments
        const uniquePlaces = [...new Set(response.data.map((e: SewaEvent) => e.place))]
        const uniqueDepartments = [...new Set(response.data.map((e: SewaEvent) => e.department))]
        setPlaces(uniquePlaces)
        setDepartments(uniqueDepartments)
      } else if (params?.includeStats && retryCount < 2) {
        // If stats request failed and we haven't retried too many times, retry after a delay
        setTimeout(() => {
          fetchEvents(params, retryCount + 1)
        }, 1000 * (retryCount + 1))
        return
      }
    } catch (error: any) {
      // Don't log error if request was aborted
      if (error.name === 'AbortError' || controller.signal.aborted) {
        return
      }
      console.error("Failed to fetch events:", error)

      // Retry for stats requests if it's a network/timing issue
      if (params?.includeStats && retryCount < 2) {
        setTimeout(() => {
          fetchEvents(params, retryCount + 1)
        }, 1000 * (retryCount + 1))
        return
      }
    } finally {
      // Only update loading state if request wasn't aborted
      if (!controller.signal.aborted) {
        setLoading((prev) => ({ ...prev, events: false }))
        currentEventsController.current = null
      }
    }
  }, [])

  const fetchAttendance = useCallback(async (params?: any) => {
    setLoading((prev) => ({ ...prev, attendance: true }))
    try {
      const response = await apiClient.getAttendance(params)
      if (response.success && response.data) {
        setAttendance(response.data)
        setPagination((prev) => ({ ...prev, attendance: response.pagination }))
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error)
    } finally {
      setLoading((prev) => ({ ...prev, attendance: false }))
    }
  }, [])

  const fetchCenters = useCallback(async (params?: any) => {
    setLoading((prev) => ({ ...prev, centers: true }))
    try {
      const response = await apiClient.getCenters({ includeStats: true, ...params })
      if (response.success && response.data) {
        setCenters(response.data)
        setPagination((prev) => ({ ...prev, centers: response.pagination }))
      }
    } catch (error) {
      console.error("Failed to fetch centers:", error)
    } finally {
      setLoading((prev) => ({ ...prev, centers: false }))
    }
  }, [])

  const fetchCoordinators = useCallback(async (params?: any) => {
    setLoading((prev) => ({ ...prev, coordinators: true }))
    try {
      const response = await apiClient.getCoordinators(params)
      if (response.success && response.data) {
        setCoordinators(response.data)
        setPagination((prev) => ({ ...prev, coordinators: response.pagination }))
      }
    } catch (error) {
      console.error("Failed to fetch coordinators:", error)
    } finally {
      setLoading((prev) => ({ ...prev, coordinators: false }))
    }
  }, [])

  // CRUD operations for Sewadars
  const createSewadar = useCallback(
    async (data: any) => {
      setLoading((prev) => ({ ...prev, createSewadar: true }))
      try {
        const response = await apiClient.createSewadar(data)
        const success = handleApiResponse(response, "Sewadar created successfully")
        if (success) {
          // Refresh with current pagination settings
          await fetchSewadars({ limit: 50, page: 1 })
        }
        return success
      } catch (error) {
        console.error("Error creating sewadar:", error)
        handleApiResponse({ success: false, error: "Failed to create sewadar" })
        return false
      } finally {
        setLoading((prev) => ({ ...prev, createSewadar: false }))
      }
    },
    [handleApiResponse, fetchSewadars],
  )

  const updateSewadar = useCallback(
    async (id: string, data: any) => {
      setLoading((prev) => ({ ...prev, updateSewadar: true }))
      try {
        const response = await apiClient.updateSewadar(id, data)
        const success = handleApiResponse(response, "Sewadar updated successfully")
        if (success) {
          // Refresh with current pagination settings
          await fetchSewadars({ limit: 50, page: 1 })
        }
        return success
      } catch (error) {
        console.error("Error updating sewadar:", error)
        handleApiResponse({ success: false, error: "Failed to update sewadar" })
        return false
      } finally {
        setLoading((prev) => ({ ...prev, updateSewadar: false }))
      }
    },
    [handleApiResponse, fetchSewadars],
  )

  const deleteSewadar = useCallback(
    async (id: string) => {
      setLoading((prev) => ({ ...prev, deleteSewadar: true }))
      try {
        const response = await apiClient.deleteSewadar(id)
        const success = handleApiResponse(response, "Sewadar deleted successfully")
        if (success) {
          // Refresh with current pagination settings
          await fetchSewadars({ limit: 50, page: 1 })
        }
        return success
      } catch (error) {
        console.error("Error deleting sewadar:", error)
        handleApiResponse({ success: false, error: "Failed to delete sewadar" })
        return false
      } finally {
        setLoading((prev) => ({ ...prev, deleteSewadar: false }))
      }
    },
    [handleApiResponse, fetchSewadars],
  )

  const importSewadars = useCallback(
    async (file: File) => {
      setLoading((prev) => ({ ...prev, importSewadars: true }))
      try {
        const response = await apiClient.importSewadars(file)
        
        if (response.success) {
          // New optimized import returns jobId for progress tracking
          if (response.jobId) {
            // No toast needed - the progress modal will handle all communication
            return { success: true, jobId: response.jobId, total: response.total }
          } else {
            // Fallback for old import format
            const success = handleApiResponse(response, response.data?.message || "Sewadars imported successfully")
            if (success) {
              await fetchSewadars({ limit: 50, page: 1 })
            }
            return success
          }
        } else {
          handleApiResponse(response)
          return false
        }
      } catch (error) {
        console.error("Error importing sewadars:", error)
        handleApiResponse({ success: false, error: "Failed to import sewadars" })
        return false
      } finally {
        setLoading((prev) => ({ ...prev, importSewadars: false }))
      }
    },
    [handleApiResponse, fetchSewadars, toast],
  )

  // CRUD operations for Events
  const createEvent = useCallback(
    async (data: any) => {
      setLoading((prev) => ({ ...prev, createEvent: true }))
      try {
        const response = await apiClient.createEvent(data)
        const success = handleApiResponse(response, "Event created successfully")
        if (success) {
          await fetchEvents()
        }
        return success
      } catch (error) {
        console.error("Error creating event:", error)
        handleApiResponse({ success: false, error: "Failed to create event" })
        return false
      } finally {
        setLoading((prev) => ({ ...prev, createEvent: false }))
      }
    },
    [handleApiResponse, fetchEvents],
  )

  const updateEvent = useCallback(
    async (id: string, data: any) => {
      setLoading((prev) => ({ ...prev, updateEvent: true }))
      try {
        const response = await apiClient.updateEvent(id, data)
        const success = handleApiResponse(response, "Event updated successfully")
        if (success) {
          await fetchEvents()
        }
        return success
      } catch (error) {
        console.error("Error updating event:", error)
        handleApiResponse({ success: false, error: "Failed to update event" })
        return false
      } finally {
        setLoading((prev) => ({ ...prev, updateEvent: false }))
      }
    },
    [handleApiResponse, fetchEvents],
  )

  const deleteEvent = useCallback(
    async (id: string) => {
      setLoading((prev) => ({ ...prev, deleteEvent: true }))
      try {
        const response = await apiClient.deleteEvent(id)
        const success = handleApiResponse(response, "Event deleted successfully")
        if (success) {
          await fetchEvents()
        }
        return success
      } catch (error) {
        console.error("Error deleting event:", error)
        handleApiResponse({ success: false, error: "Failed to delete event" })
        return false
      } finally {
        setLoading((prev) => ({ ...prev, deleteEvent: false }))
      }
    },
    [handleApiResponse, fetchEvents],
  )

  // CRUD operations for Attendance
  const createAttendance = useCallback(
    async (data: any) => {
      setLoading((prev) => ({ ...prev, createAttendance: true }))
      try {
        const response = await apiClient.createAttendance(data)
        const success = handleApiResponse(response, "Attendance submitted successfully")
        if (success) {
          await fetchAttendance()
          // Refresh sewadars to include newly created temporary sewadars
          if (data.centerId) {
            // Fetch sewadars for the specific center
            setLoading((prev) => ({ ...prev, sewadars: true }))
            try {
              const sewadarResponse = await apiClient.getSewadars({ centerId: data.centerId, limit: 10000 })
              if (sewadarResponse.success && sewadarResponse.data) {
                setSewadars((prev) => {
                  const filtered = prev.filter((s) => s.centerId !== data.centerId)
                  return [...filtered, ...sewadarResponse.data]
                })
              }
            } catch (error) {
              console.error("Failed to refresh sewadars:", error)
            } finally {
              setLoading((prev) => ({ ...prev, sewadars: false }))
            }
          } else {
            await fetchSewadars({ limit: 50, page: 1 })
          }
        }
        return success
      } catch (error) {
        console.error("Error creating attendance:", error)
        handleApiResponse({ success: false, error: "Failed to submit attendance" })
        return false
      } finally {
        setLoading((prev) => ({ ...prev, createAttendance: false }))
      }
    },
    [handleApiResponse, fetchAttendance, fetchSewadars],
  )

  const updateAttendance = useCallback(
    async (id: string, data: any) => {
      setLoading((prev) => ({ ...prev, updateAttendance: true }))
      try {
        const response = await apiClient.updateAttendance(id, data)
        const success = handleApiResponse(response, "Attendance updated successfully")
        if (success) {
          await fetchAttendance()
        }
        return success
      } catch (error) {
        console.error("Error updating attendance:", error)
        handleApiResponse({ success: false, error: "Failed to update attendance" })
        return false
      } finally {
        setLoading((prev) => ({ ...prev, updateAttendance: false }))
      }
    },
    [handleApiResponse, fetchAttendance],
  )

  const deleteAttendance = useCallback(
    async (id: string) => {
      setLoading((prev) => ({ ...prev, deleteAttendance: true }))
      try {
        const response = await apiClient.deleteAttendance(id)
        const success = handleApiResponse(response, "Attendance deleted successfully")
        if (success) {
          await fetchAttendance()
        }
        return success
      } catch (error) {
        console.error("Error deleting attendance:", error)
        handleApiResponse({ success: false, error: "Failed to delete attendance" })
        return false
      } finally {
        setLoading((prev) => ({ ...prev, deleteAttendance: false }))
      }
    },
    [handleApiResponse, fetchAttendance],
  )

  // CRUD operations for Centers
  const createCenter = useCallback(
    async (data: any) => {
      setLoading((prev) => ({ ...prev, createCenter: true }))
      try {
        const response = await apiClient.createCenter(data)
        const success = handleApiResponse(response, "Center created successfully")
        if (success) {
          await fetchCenters()
        }
        return success
      } catch (error) {
        console.error("Error creating center:", error)
        handleApiResponse({ success: false, error: "Failed to create center" })
        return false
      } finally {
        setLoading((prev) => ({ ...prev, createCenter: false }))
      }
    },
    [handleApiResponse, fetchCenters],
  )

  const updateCenter = useCallback(
    async (id: string, data: any) => {
      setLoading((prev) => ({ ...prev, updateCenter: true }))
      try {
        const response = await apiClient.updateCenter(id, data)
        const success = handleApiResponse(response, "Center updated successfully")
        if (success) {
          await fetchCenters()
        }
        return success
      } catch (error) {
        console.error("Error updating center:", error)
        handleApiResponse({ success: false, error: "Failed to update center" })
        return false
      } finally {
        setLoading((prev) => ({ ...prev, updateCenter: false }))
      }
    },
    [handleApiResponse, fetchCenters],
  )

  const deleteCenter = useCallback(
    async (id: string) => {
      setLoading((prev) => ({ ...prev, deleteCenter: true }))
      try {
        const response = await apiClient.deleteCenter(id)
        const success = handleApiResponse(response, "Center deleted successfully")
        if (success) {
          await fetchCenters()
        }
        return success
      } catch (error) {
        console.error("Error deleting center:", error)
        handleApiResponse({ success: false, error: "Failed to delete center" })
        return false
      } finally {
        setLoading((prev) => ({ ...prev, deleteCenter: false }))
      }
    },
    [handleApiResponse, fetchCenters],
  )

  // CRUD operations for Coordinators
  const createCoordinator = useCallback(
    async (data: any) => {
      setLoading((prev) => ({ ...prev, createCoordinator: true }))
      try {
        const response = await apiClient.createCoordinator(data)
        const success = handleApiResponse(response, "Coordinator created successfully")
        if (success) {
          await fetchCoordinators()
        }
        return success
      } catch (error) {
        console.error("Error creating coordinator:", error)
        handleApiResponse({ success: false, error: "Failed to create coordinator" })
        return false
      } finally {
        setLoading((prev) => ({ ...prev, createCoordinator: false }))
      }
    },
    [handleApiResponse, fetchCoordinators],
  )

  const updateCoordinatorStatus = useCallback(
    async (id: string, isActive: boolean) => {
      setLoading((prev) => ({ ...prev, updateCoordinator: true }))
      try {
        const response = await apiClient.updateCoordinatorStatus(id, isActive)
        const success = handleApiResponse(response, "Coordinator status updated successfully")
        if (success) {
          await fetchCoordinators()
        }
        return success
      } catch (error) {
        console.error("Error updating coordinator status:", error)
        handleApiResponse({ success: false, error: "Failed to update coordinator status" })
        return false
      } finally {
        setLoading((prev) => ({ ...prev, updateCoordinator: false }))
      }
    },
    [handleApiResponse, fetchCoordinators],
  )

  const deleteCoordinator = useCallback(
    async (id: string) => {
      setLoading((prev) => ({ ...prev, deleteCoordinator: true }))
      try {
        const response = await apiClient.deleteCoordinator(id)
        const success = handleApiResponse(response, "Coordinator deleted successfully")
        if (success) {
          await fetchCoordinators()
        }
        return success
      } catch (error) {
        console.error("Error deleting coordinator:", error)
        handleApiResponse({ success: false, error: "Failed to delete coordinator" })
        return false
      } finally {
        setLoading((prev) => ({ ...prev, deleteCoordinator: false }))
      }
    },
    [handleApiResponse, fetchCoordinators],
  )

  // Function to fetch sewadars for a specific center
  const fetchSewadarsForCenter = useCallback(async (centerId: string) => {
    if (!centerId) return

    setLoading((prev) => ({ ...prev, sewadars: true }))
    try {
      // Fetch all sewadars for the center by setting a high limit
      const response = await apiClient.getSewadars({ centerId, limit: 10000 })
      if (response.success && response.data) {
        // Update sewadars array by replacing sewadars from this center
        setSewadars((prev) => {
          // Remove existing sewadars from this center
          const filtered = prev.filter((s) => s.centerId !== centerId)
          // Add new sewadars from this center
          return [...filtered, ...response.data]
        })
        setPagination((prev) => ({ ...prev, sewadars: response.pagination }))
      }
    } catch (error) {
      console.error("Failed to fetch sewadars for center:", error)
    } finally {
      setLoading((prev) => ({ ...prev, sewadars: false }))
    }
  }, [])

  // Utility functions
  const getSewadarsForCenter = useCallback(
    (centerId: string) => {
      return sewadars.filter((sewadar) => sewadar.centerId === centerId)
    },
    [sewadars],
  )

  const getAttendanceForSewadar = useCallback(
    (sewadarId: string) => {
      return attendance.filter((record) => record.sewadars.some((sewadar) => sewadar._id === sewadarId))
    },
    [attendance],
  )

  const getExistingAttendanceForEvent = useCallback(
    (eventId: string, centerId: string) => {
      return attendance.find((record) =>
        record.eventId._id === eventId && record.centerId === centerId
      )
    },
    [attendance],
  )

  const getExistingAttendanceForEventByUser = useCallback(
    (eventId: string, userId: string) => {
      return attendance.find((record) =>
        record.eventId._id === eventId && record.submittedBy._id === userId
      )
    },
    [attendance],
  )

  const addPlace = useCallback(
    (place: string) => {
      if (!places.includes(place)) {
        setPlaces((prev) => [...prev, place])
      }
    },
    [places],
  )

  const addDepartment = useCallback(
    (department: string) => {
      if (!departments.includes(department)) {
        setDepartments((prev) => [...prev, department])
      }
    },
    [departments],
  )

  // Refresh functions
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchEvents(),
      fetchAttendance(),
      fetchCenters(),
      fetchCoordinators()
    ])
    // Note: Sewadars are not refreshed here to avoid duplicate calls
    // Individual pages should handle their own sewadar refreshing
  }, [fetchEvents, fetchAttendance, fetchCenters, fetchCoordinators])

  const refreshSewadars = fetchSewadars
  const refreshEvents = fetchEvents
  const refreshAttendance = fetchAttendance
  const refreshCenters = fetchCenters
  const refreshCoordinators = fetchCoordinators

  // Initial data fetch - stagger the requests to avoid race conditions
  useEffect(() => {
    if (!user) return;

    const initializeData = async () => {
      try {
        // First fetch basic data that doesn't depend on each other
        await Promise.all([
          fetchCenters(),
          fetchCoordinators()
        ])

        // Then fetch attendance data
        await fetchAttendance()

        // Wait a moment to ensure database operations are complete
        await new Promise(resolve => setTimeout(resolve, 200))

        // Then fetch events with stats (after attendance is loaded)
        await fetchEvents({ includeStats: true })

        // Skip general sewadars fetch - let individual pages handle their own sewadar fetching
        // This prevents duplicate API calls on pages like /sewadars that have their own fetch logic
      } catch (error) {
        console.error('Error initializing data:', error)
        // Fallback: try to fetch events without stats first, then with stats
        await fetchEvents()
        setTimeout(() => {
          fetchEvents({ includeStats: true })
        }, 1000)
      }
    }

    initializeData()
  }, [user]);

  // Cleanup: Cancel any pending requests when component unmounts
  useEffect(() => {
    return () => {
      if (currentSewadarsController.current) {
        currentSewadarsController.current.abort()
      }
      if (currentEventsController.current) {
        currentEventsController.current.abort()
      }
      if (currentAttendanceController.current) {
        currentAttendanceController.current.abort()
      }
    }
  }, [])

  return (
    <DataContext.Provider
      value={{
        // Data
        sewadars,
        events,
        attendance,
        centers,
        coordinators,
        places,
        departments,

        // Loading states
        loading,
        pagination,

        // Fetch functions
        fetchSewadars,
        fetchEvents,
        fetchEventsForAttendance,
        fetchAttendance,
        fetchCenters,
        fetchCoordinators,

        // CRUD operations
        createSewadar,
        updateSewadar,
        deleteSewadar,
        importSewadars,

        createEvent,
        updateEvent,
        deleteEvent,

        createAttendance,
        updateAttendance,
        deleteAttendance,

        createCenter,
        updateCenter,
        deleteCenter,

        createCoordinator,
        updateCoordinatorStatus,
        deleteCoordinator,

        // Utility functions
        getSewadarsForCenter,
        fetchSewadarsForCenter,
        getAttendanceForSewadar,
        getExistingAttendanceForEvent,
        getExistingAttendanceForEventByUser,
        addPlace,
        addDepartment,

        // Refresh functions
        refreshAll,
        refreshSewadars,
        refreshEvents,
        refreshAttendance,
        refreshCenters,
        refreshCoordinators,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
