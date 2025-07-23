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
  tempSewadars: TempSewadar[]
  nominalRollImages: string[]
  submittedBy: {
    _id: string
    name: string
  }
  submittedAt: string
}

export interface TempSewadar {
  id: string
  name: string
  fatherName: string
  age: number
  gender: "MALE" | "FEMALE"
  phone: string
  tempBadge: string
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
  fetchAttendance: (params?: any) => Promise<void>
  fetchCenters: (params?: any) => Promise<void>
  fetchCoordinators: (params?: any) => Promise<void>

  createSewadar: (data: any) => Promise<boolean>
  updateSewadar: (id: string, data: any) => Promise<boolean>
  deleteSewadar: (id: string) => Promise<boolean>
  importSewadars: (file: File) => Promise<boolean>

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
      // Use provided params, with defaults for backward compatibility
      const fetchParams = {
        limit: 10000, // Set a high limit to fetch all sewadars
        page: 1,   // Default page
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

  const fetchEvents = useCallback(async (params?: any) => {
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
      }
    } catch (error: any) {
      // Don't log error if request was aborted
      if (error.name === 'AbortError' || controller.signal.aborted) {
        return
      }
      console.error("Failed to fetch events:", error)
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
      const response = await apiClient.createSewadar(data)
      const success = handleApiResponse(response, "Sewadar created successfully")
      if (success) {
        await fetchSewadars()
      }
      return success
    },
    [handleApiResponse, fetchSewadars],
  )

  const updateSewadar = useCallback(
    async (id: string, data: any) => {
      const response = await apiClient.updateSewadar(id, data)
      const success = handleApiResponse(response, "Sewadar updated successfully")
      if (success) {
        await fetchSewadars()
      }
      return success
    },
    [handleApiResponse, fetchSewadars],
  )

  const deleteSewadar = useCallback(
    async (id: string) => {
      const response = await apiClient.deleteSewadar(id)
      const success = handleApiResponse(response, "Sewadar deleted successfully")
      if (success) {
        await fetchSewadars()
      }
      return success
    },
    [handleApiResponse, fetchSewadars],
  )

  const importSewadars = useCallback(
    async (file: File) => {
      const response = await apiClient.importSewadars(file)
      const success = handleApiResponse(response, response.data?.message || "Sewadars imported successfully")
      if (success) {
        await fetchSewadars()
      }
      return success
    },
    [handleApiResponse, fetchSewadars],
  )

  // CRUD operations for Events
  const createEvent = useCallback(
    async (data: any) => {
      const response = await apiClient.createEvent(data)
      const success = handleApiResponse(response, "Event created successfully")
      if (success) {
        await fetchEvents()
      }
      return success
    },
    [handleApiResponse, fetchEvents],
  )

  const updateEvent = useCallback(
    async (id: string, data: any) => {
      const response = await apiClient.updateEvent(id, data)
      const success = handleApiResponse(response, "Event updated successfully")
      if (success) {
        await fetchEvents()
      }
      return success
    },
    [handleApiResponse, fetchEvents],
  )

  const deleteEvent = useCallback(
    async (id: string) => {
      const response = await apiClient.deleteEvent(id)
      const success = handleApiResponse(response, "Event deleted successfully")
      if (success) {
        await fetchEvents()
      }
      return success
    },
    [handleApiResponse, fetchEvents],
  )

  // CRUD operations for Attendance
  const createAttendance = useCallback(
    async (data: any) => {
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
          await fetchSewadars()
        }
      }
      return success
    },
    [handleApiResponse, fetchAttendance, fetchSewadars],
  )

  const updateAttendance = useCallback(
    async (id: string, data: any) => {
      const response = await apiClient.updateAttendance(id, data)
      const success = handleApiResponse(response, "Attendance updated successfully")
      if (success) {
        await fetchAttendance()
      }
      return success
    },
    [handleApiResponse, fetchAttendance],
  )

  const deleteAttendance = useCallback(
    async (id: string) => {
      const response = await apiClient.deleteAttendance(id)
      const success = handleApiResponse(response, "Attendance deleted successfully")
      if (success) {
        await fetchAttendance()
      }
      return success
    },
    [handleApiResponse, fetchAttendance],
  )

  // CRUD operations for Centers
  const createCenter = useCallback(
    async (data: any) => {
      const response = await apiClient.createCenter(data)
      const success = handleApiResponse(response, "Center created successfully")
      if (success) {
        await fetchCenters()
      }
      return success
    },
    [handleApiResponse, fetchCenters],
  )

  const updateCenter = useCallback(
    async (id: string, data: any) => {
      const response = await apiClient.updateCenter(id, data)
      const success = handleApiResponse(response, "Center updated successfully")
      if (success) {
        await fetchCenters()
      }
      return success
    },
    [handleApiResponse, fetchCenters],
  )

  const deleteCenter = useCallback(
    async (id: string) => {
      const response = await apiClient.deleteCenter(id)
      const success = handleApiResponse(response, "Center deleted successfully")
      if (success) {
        await fetchCenters()
      }
      return success
    },
    [handleApiResponse, fetchCenters],
  )

  // CRUD operations for Coordinators
  const createCoordinator = useCallback(
    async (data: any) => {
      const response = await apiClient.createCoordinator(data)
      const success = handleApiResponse(response, "Coordinator created successfully")
      if (success) {
        await fetchCoordinators()
      }
      return success
    },
    [handleApiResponse, fetchCoordinators],
  )

  const updateCoordinatorStatus = useCallback(
    async (id: string, isActive: boolean) => {
      const response = await apiClient.updateCoordinatorStatus(id, isActive)
      const success = handleApiResponse(response, "Coordinator status updated successfully")
      if (success) {
        await fetchCoordinators()
      }
      return success
    },
    [handleApiResponse, fetchCoordinators],
  )

  const deleteCoordinator = useCallback(
    async (id: string) => {
      const response = await apiClient.deleteCoordinator(id)
      const success = handleApiResponse(response, "Coordinator deleted successfully")
      if (success) {
        await fetchCoordinators()
      }
      return success
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
    await Promise.all([fetchSewadars(), fetchEvents(), fetchAttendance(), fetchCenters(), fetchCoordinators()])
  }, [fetchSewadars, fetchEvents, fetchAttendance, fetchCenters, fetchCoordinators])

  const refreshSewadars = fetchSewadars
  const refreshEvents = fetchEvents
  const refreshAttendance = fetchAttendance
  const refreshCenters = fetchCenters
  const refreshCoordinators = fetchCoordinators

  // Initial data fetch
  useEffect(() => {
    if (!user) return;
    refreshAll()
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
