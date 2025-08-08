"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import Layout from "@/components/Layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Search, User, Calendar, Download, RefreshCw, FileText, X, Filter, BarChart3, FileSpreadsheet, ChevronDown, ChevronUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import SewadarAttendanceModal from "@/components/SewadarAttendanceModal"
import * as XLSX from "xlsx"
import { apiClient } from "@/lib/api-client"
import { DEPARTMENTS } from "@/lib/constants"
import { formatDate } from "@/lib/date-utils"
import { Badge } from "@/components/ui/badge"

interface Sewadar {
  _id: string
  badgeNumber: string
  name: string
  fatherHusbandName: string
  gender: "MALE" | "FEMALE"
  badgeStatus: "PERMANENT" | "TEMPORARY"
  centerId: string
  center: string
  department: string
  contactNo?: string
  dob?: string
  createdAt: string
}

interface AttendanceRecord {
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
  submittedAt: string
  submittedBy: {
    _id: string
    name: string
  }
}

interface SearchSuggestion {
  type: "center" | "department"
  value: string
  label: string
  count: number
}

export default function SewadarLookupPage() {
  const { user } = useAuth()
  const { centers, sewadars, attendance, fetchSewadars } = useData()
  const { toast } = useToast()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Sewadar[]>([])
  const [selectedSewadar, setSelectedSewadar] = useState<Sewadar | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [hasSearched, setHasSearched] = useState(false)

  // Request cancellation
  const [currentSearchController, setCurrentSearchController] = useState<AbortController | null>(null)
  const [currentFilterController, setCurrentFilterController] = useState<AbortController | null>(null)

  // Attendance filter states
  const [showAttendanceFilters, setShowAttendanceFilters] = useState(false)
  const [attendanceFilterCenter, setAttendanceFilterCenter] = useState(user?.role === "admin" ? "all" : (user?.centerId || "all"))
  const [attendanceFilterOperator, setAttendanceFilterOperator] = useState("less_than")
  const [attendanceFilterCount, setAttendanceFilterCount] = useState("")
  const [genderFilter, setGenderFilter] = useState("all")
  const [showExamples, setShowExamples] = useState(false)

  // No attendance filter states
  const [noAttendanceFilter, setNoAttendanceFilter] = useState(false)
  const [noAttendanceDays, setNoAttendanceDays] = useState("")

  // Mobile filter collapse state
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20) // 20 results per page
  const [totalResults, setTotalResults] = useState(0)

  // Calculate pagination
  const totalPages = Math.ceil(searchResults.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedResults = searchResults.slice(startIndex, endIndex)

  // Reset pagination when search results change
  useEffect(() => {
    setCurrentPage(1)
    setTotalResults(searchResults.length)
  }, [searchResults])

  // Scroll selected suggestion into view
  useEffect(() => {
    if (selectedSuggestionIndex >= 0 && showSuggestions) {
      const suggestionElement = document.getElementById(`suggestion-${selectedSuggestionIndex}`)
      if (suggestionElement) {
        suggestionElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }
    }
  }, [selectedSuggestionIndex, showSuggestions])

  // Cleanup: Cancel any pending requests when component unmounts
  useEffect(() => {
    return () => {
      if (currentSearchController) {
        currentSearchController.abort()
      }
      if (currentFilterController) {
        currentFilterController.abort()
      }
    }
  }, [])

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top of results
    const resultsElement = document.getElementById('search-results')
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: 'smooth' })
    }
  }



  // Load recent searches and generate suggestions
  useEffect(() => {
    const saved = localStorage.getItem("sewadar-lookup-recent-searches")
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (error) {
        console.error("Error loading recent searches:", error)
      }
    }
    generateSearchSuggestions()
  }, [centers, user])

  // Generate search suggestions based on centers and departments
  const generateSearchSuggestions = () => {
    const suggestions: SearchSuggestion[] = []

    // Add center suggestions - only for admin users or their own center for coordinators
    if (user?.role === "admin") {
      // Admin can see all centers
      centers.forEach((center) => {
        suggestions.push({
          type: "center",
          value: center.name,
          label: `Center: ${center.name}`,
          count: 0, // We don't have counts without pre-loading all sewadars
        })
      })
    } else if (user?.centerId) {
      // Center coordinators only see their own center
      const userCenter = centers.find(center => center.code === user.centerId)
      if (userCenter) {
        suggestions.push({
          type: "center",
          value: userCenter.name,
          label: `Center: ${userCenter.name}`,
          count: 0,
        })
      }
    }

    // Add department suggestions from constants
    DEPARTMENTS.forEach((dept) => {
      suggestions.push({
        type: "department",
        value: dept,
        label: `Department: ${dept}`,
        count: 0, // We don't have counts without pre-loading all sewadars
      })
    })

    setSearchSuggestions(suggestions)
  }

  // Save search term to recent searches
  const saveToRecentSearches = (term: string) => {
    const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem("sewadar-lookup-recent-searches", JSON.stringify(updated))
  }

  // Unified search and filter function
  const handleSearchAndFilter = async (searchValue?: string) => {
    const term = searchValue || searchTerm

    // Need either search term, attendance filter, or no attendance filter
    if (!term.trim() && !attendanceFilterCount && !noAttendanceFilter) {
      return
    }

    // Cancel previous search request if it exists
    if (currentSearchController) {
      currentSearchController.abort()
    }

    // Create new AbortController for this request
    const controller = new AbortController()
    setCurrentSearchController(controller)

    setIsSearching(true)
    setShowSuggestions(false)

    try {
      let searchParams: any = {}

      // Handle search term if provided
      if (term.trim()) {
        // For admin users, check center and department matches
        if (user?.role === "admin") {
          // Check if it's a center search
          const centerMatch = centers.find(c =>
            c.name.toLowerCase().includes(term.toLowerCase()) ||
            term.toLowerCase().includes(c.name.toLowerCase())
          )

          // Check if it's a department search
          const departmentMatch = DEPARTMENTS.find(d =>
            d.toLowerCase().includes(term.toLowerCase()) ||
            term.toLowerCase().includes(d.toLowerCase())
          )

          if (centerMatch) {
            searchParams.centerId = centerMatch.code
          } else if (departmentMatch) {
            searchParams.department = departmentMatch
          } else {
            // General search by name, badge number, or father/husband name
            searchParams.search = term
          }
        } else {
          // For center coordinators, only check department matches
          const departmentMatch = DEPARTMENTS.find(d =>
            d.toLowerCase().includes(term.toLowerCase()) ||
            term.toLowerCase().includes(d.toLowerCase())
          )

          if (departmentMatch) {
            searchParams.department = departmentMatch
          } else {
            // General search by name, badge number, or father/husband name only
            searchParams.search = term
          }
        }
      }

      // Add center filter if not "all" (and not already set by center search)
      if (attendanceFilterCenter !== "all" && !searchParams.centerId) {
        searchParams.centerId = attendanceFilterCenter
      }

      // For center coordinators, always scope to their center (unless they're searching for a specific center)
      if (user?.role !== "admin" && user?.centerId && !searchParams.centerId) {
        searchParams.centerId = user.centerId
      }

      // Add gender filter if not "all"
      if (genderFilter !== "all") {
        searchParams.gender = genderFilter
      }

      const response = await apiClient.getSewadars({
        ...searchParams,
        limit: 10000,
        signal: controller.signal,
      })

      if (controller.signal.aborted) {
        return
      }

      if (response.success) {
        let results = response.data || []

        // Apply attendance filtering if specified
        if (attendanceFilterCount) {
          const targetCount = parseInt(attendanceFilterCount)
          const targetCenterId = attendanceFilterCenter !== "all" ? attendanceFilterCenter : undefined

          results = results.filter(sewadar => {
            if (controller.signal.aborted) {
              return false
            }

            const attendanceCount = getSewadarAttendanceCount(sewadar._id, targetCenterId)

            switch (attendanceFilterOperator) {
              case "less_than":
                return attendanceCount < targetCount
              case "less_than_equal":
                return attendanceCount <= targetCount
              case "equal":
                return attendanceCount === targetCount
              case "greater_than_equal":
                return attendanceCount >= targetCount
              case "greater_than":
                return attendanceCount > targetCount
              default:
                return false
            }
          })
        }

        // Apply no attendance filter if specified
        if (noAttendanceFilter && noAttendanceDays) {
          const targetDays = parseInt(noAttendanceDays)
          const targetCenterId = attendanceFilterCenter !== "all" ? attendanceFilterCenter : undefined

          results = results.filter(sewadar => {
            if (controller.signal.aborted) {
              return false
            }

            return hasNoAttendanceInLastDays(sewadar._id, targetDays, targetCenterId)
          })
        }

        setSearchResults(results)
        setHasSearched(true)

        if (term.trim()) {
          saveToRecentSearches(term)
        }
      } else {
        throw new Error(response.error || "Search failed")
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        return
      }

      console.error("Search error:", error)
      setSearchResults([])
      setHasSearched(true)
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false)
        setCurrentSearchController(null)
      }
    }
  }

  // Legacy search function for backward compatibility
  const handleSearch = async (searchValue?: string) => {
    await handleSearchAndFilter(searchValue)
  }

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("")
    setSearchResults([])
    setSelectedSewadar(null)
    setAttendanceRecords([])
    setShowSuggestions(false)
    setAttendanceFilterCenter(user?.role === "admin" ? "all" : (user?.centerId || "all"))
    setGenderFilter("all")
    setAttendanceFilterOperator("less_than")
    setAttendanceFilterCount("")
    setNoAttendanceFilter(false)
    setNoAttendanceDays("")
    setHasSearched(false)
    searchInputRef.current?.focus()
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchTerm(suggestion.value)
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
    handleSearch(suggestion.value)
  }

  // Check if sewadar has no attendance in the last x days
  const hasNoAttendanceInLastDays = (sewadarId: string, days: number, centerId?: string) => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const recentRecords = attendance.filter(record => {
      // Check if this attendance record includes the sewadar
      let hasSewadar = false

      // Check sewadars (includes both regular and formerly temporary sewadars)
      if (record.sewadars && Array.isArray(record.sewadars)) {
        hasSewadar = record.sewadars.some(sewadar =>
          typeof sewadar === 'string' ? sewadar === sewadarId : sewadar._id === sewadarId
        )
      }

      if (!hasSewadar) return false

      // If specific center is requested, filter by center code
      if (centerId && centerId !== "all") {
        if (record.centerId !== centerId) return false
      }

      // Check if the event ended after the cutoff date (meaning it's within the last x days)
      if (record.eventId?.toDate) {
        const eventEndDate = new Date(record.eventId.toDate)
        return eventEndDate >= cutoffDate
      }

      return false
    })

    // Return true if no recent attendance found
    return recentRecords.length === 0
  }

  // Calculate attendance count for a sewadar in a specific center or all centers
  // This should return the total number of DAYS attended, not just number of events
  const getSewadarAttendanceCount = (sewadarId: string, centerId?: string) => {
    const matchingRecords = attendance.filter(record => {
      // Check if this attendance record includes the sewadar
      let hasSewadar = false

      // Check sewadars (includes both regular and formerly temporary sewadars)
      if (record.sewadars && Array.isArray(record.sewadars)) {
        // The sewadars array contains sewadar objects, not just IDs
        hasSewadar = record.sewadars.some(sewadar =>
          typeof sewadar === 'string' ? sewadar === sewadarId : sewadar._id === sewadarId
        )
      }

      if (!hasSewadar) return false

      // If specific center is requested, filter by center code
      if (centerId && centerId !== "all") {
        return record.centerId === centerId
      }

      return true
    })

    // Calculate total days instead of just counting records
    return matchingRecords.reduce((totalDays, record) => {
      if (!record.eventId?.fromDate || !record.eventId?.toDate) return totalDays

      const fromDate = new Date(record.eventId.fromDate)
      const toDate = new Date(record.eventId.toDate)
      const diffTime = Math.abs(toDate.getTime() - fromDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end dates

      return totalDays + diffDays
    }, 0)
  }

  // Handle attendance filter
  const handleAttendanceFilter = async () => {
    if (!attendanceFilterCount) {
      return
    }

    // Cancel previous filter request if it exists
    if (currentFilterController) {
      currentFilterController.abort()
    }

    // Create new AbortController for this request
    const controller = new AbortController()
    setCurrentFilterController(controller)

    setIsSearching(true)
    setShowSuggestions(false)

    try {
      const targetCount = parseInt(attendanceFilterCount)
      const targetCenterId = attendanceFilterCenter !== "all" ? attendanceFilterCenter : undefined

      // First, fetch ALL sewadars with a high limit to overcome the default 50 limit
      // We need to get all sewadars to properly filter by attendance count
      let searchParams: any = {
        centerId: targetCenterId,
        limit: 10000, // Use a very high limit to get all sewadars
        signal: controller.signal,
      }

      // Add gender filter if not "all"
      if (genderFilter !== "all") {
        searchParams.gender = genderFilter
      }

      const response = await apiClient.getSewadars(searchParams);

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to fetch sewadars");
      }

      // Now we have all the sewadars, filter them by attendance count
      const allSewadars = response.data;

      // Filter sewadars based on attendance count
      const filteredSewadars = allSewadars.filter(sewadar => {
        // Check if request was aborted during filtering
        if (controller.signal.aborted) {
          return false
        }

        const attendanceCount = getSewadarAttendanceCount(sewadar._id, targetCenterId)

        switch (attendanceFilterOperator) {
          case "less_than":
            return attendanceCount < targetCount
          case "less_than_equal":
            return attendanceCount <= targetCount
          case "equal":
            return attendanceCount === targetCount
          case "greater_than_equal":
            return attendanceCount >= targetCount
          case "greater_than":
            return attendanceCount > targetCount
          default:
            return false
        }
      })

      // Check if request was aborted before setting results
      if (controller.signal.aborted) {
        return
      }

      setSearchResults(filteredSewadars)

      // Clear search term since this is a filter operation
      setSearchTerm("")

      // Results are displayed in the UI, no need for toast notifications
    } catch (error: any) {
      // Don't show error if request was aborted
      if (error.name === 'AbortError' || controller.signal.aborted) {
        return
      }

      console.error("Filter error:", error)
      setSearchResults([])
    } finally {
      // Only update loading state if request wasn't aborted
      if (!controller.signal.aborted) {
        setIsSearching(false)
        setCurrentFilterController(null)
      }
    }
  }

  // Select sewadar - now just opens the modal
  const handleSelectSewadar = (sewadar: Sewadar) => {
    setSelectedSewadar(sewadar)
  }

  // Export attendance as CSV
  const handleExportAttendance = async () => {
    if (!selectedSewadar) return

    setIsExporting(true)
    try {
      const response = await apiClient.getAttendanceReport({
        sewadarId: selectedSewadar._id,
        format: "csv",
      })

      if (response.success && response.data) {
        const blob = new Blob([response.data], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${selectedSewadar.badgeNumber}_attendance_report.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast({
          title: "Export Successful",
          description: "Attendance report downloaded successfully",
        })
      } else {
        throw new Error(response.error || "Export failed")
      }
    } catch (error: any) {
      console.error("Export error:", error)
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export attendance report",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Export search results as Excel
  const handleExportSearchResults = () => {
    if (searchResults.length === 0) {
      toast({
        title: "No Data",
        description: "No search results to export",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)
    try {
      // Prepare data for export
      const exportData = searchResults.map((sewadar) => {
        const attendanceCount = getSewadarAttendanceCount(sewadar._id)
        return {
          "Badge Number": sewadar.badgeNumber,
          "Name": sewadar.name,
          "Father/Husband Name": sewadar.fatherHusbandName,
          "Contact": sewadar.contactNo || "N/A",
          "Center": sewadar.center,
          "Attendance Count (Days)": attendanceCount,
        }
      })

      // Create Excel file
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Sewadar Results")

      // Generate filename based on search criteria
      let filename = "sewadar_lookup_results"
      if (searchTerm) {
        filename += `_${searchTerm.replace(/[^a-zA-Z0-9]/g, "_")}`
      }
      if (attendanceFilterCount) {
        const centerName = attendanceFilterCenter === "all"
          ? "all_centers"
          : centers.find(c => c.code === attendanceFilterCenter)?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "center"
        filename += `_${attendanceFilterOperator}_${attendanceFilterCount}_${centerName}`
      }
      filename += `_${new Date().toISOString().split("T")[0]}.xlsx`

      // Download file
      XLSX.writeFile(wb, filename)

      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} sewadar records to Excel`,
      })
    } catch (error: any) {
      console.error("Export error:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export search results",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Handle keyboard navigation in search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredSuggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault()
        handleSearch()
      } else if (e.key === "Escape") {
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedSuggestionIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        )
        break
      case "Enter":
        e.preventDefault()
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < filteredSuggestions.length) {
          handleSuggestionClick(filteredSuggestions[selectedSuggestionIndex])
        } else {
          handleSearch()
        }
        break
      case "Escape":
        e.preventDefault()
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
      default:
        // Reset selection when typing
        setSelectedSuggestionIndex(-1)
        break
    }
  }

  // Handle input focus
  const handleInputFocus = () => {
    if (searchSuggestions.length > 0 && !searchTerm) {
      setShowSuggestions(true)
    }
    setSelectedSuggestionIndex(-1)
  }

  // Handle input blur (with delay to allow suggestion clicks)
  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200)
  }

  // Filter suggestions based on search term
  const filteredSuggestions = searchTerm
    ? searchSuggestions.filter((suggestion) =>
      suggestion.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      suggestion.value.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : searchSuggestions.slice(0, 10) // Show top 10 when no search term

  // Calculate attendance statistics
  const attendanceStats = selectedSewadar
    ? {
      totalEvents: attendanceRecords.length,
      totalDays: attendanceRecords.reduce((sum, record) => {
        if (!record.eventId?.fromDate || !record.eventId?.toDate) return sum
        const fromDate = new Date(record.eventId.fromDate)
        const toDate = new Date(record.eventId.toDate)
        const diffTime = Math.abs(toDate.getTime() - fromDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        return sum + diffDays
      }, 0),
      departments: [...new Set(attendanceRecords.map((record) => record.eventId?.department).filter(Boolean))],
      places: [...new Set(attendanceRecords.map((record) => record.eventId?.place).filter(Boolean))],
    }
    : null

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6 px-2 md:px-0">
        <div className="px-2 md:px-0">
          <h1 className="text-xl md:text-2xl text-gray-900">Sewadar Lookup</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">Search and view sewadar attendance records</p>
        </div>

        {/* Search & Filter Sewadars */}
        <Card className="enhanced-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-base md:text-lg">
              <Search className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              Search & Filter Sewadars
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Input
                ref={searchInputRef}
                id="search"
                placeholder="Enter Badge Number, Name, Father/Husband Name, Department or Center"
                value={searchTerm}
                onChange={(e) => {
                  const value = e.target.value
                  setSearchTerm(value)
                  // Clear selected sewadar and attendance when search term changes
                  setSelectedSewadar(null)
                  setAttendanceRecords([])
                  setSelectedSuggestionIndex(-1)

                  // Clear results when search is empty
                  if (value.trim().length === 0) {
                    setSearchResults([])
                    setShowSuggestions(false)
                  } else {
                    setShowSuggestions(true)
                  }
                }}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="w-full pr-10"
                autoComplete="off"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={handleClearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

              {/* Search Suggestions */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
                  <div className="p-3">
                    <div className="text-xs font-medium text-gray-500 mb-3">
                      ✨ Search Suggestions
                    </div>
                    <div className="space-y-1">
                      {filteredSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          id={`suggestion-${index}`}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between group transition-colors ${index === selectedSuggestionIndex
                            ? "bg-blue-50 border border-blue-200"
                            : "hover:bg-gray-50"
                            }`}
                          onClick={() => handleSuggestionClick(suggestion)}
                          onMouseEnter={() => setSelectedSuggestionIndex(index)}
                        >
                          <div className="flex items-center">
                            <span className={`${index === selectedSuggestionIndex ? "text-blue-700" : "text-gray-600"
                              }`}>
                              {suggestion.label}
                            </span>
                          </div>
                          {suggestion.count > 0 && (
                            <span className={`text-xs ${index === selectedSuggestionIndex
                              ? "text-blue-500"
                              : "text-gray-400 group-hover:text-gray-600"
                              }`}>
                              {suggestion.count}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Recent searches section */}
                    {recentSearches.length > 0 && !searchTerm && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="text-xs font-medium text-gray-500 mb-2">
                          Or try one of your recent searches:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.slice(0, 3).map((search, index) => (
                            <button
                              key={index}
                              className="px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full transition-colors"
                              onClick={() => {
                                setSearchTerm(search)
                                setShowSuggestions(false)
                                setSelectedSuggestionIndex(-1)
                                handleSearch(search)
                              }}
                            >
                              {search}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Filter Toggle and Search Button */}
            <div className="block md:hidden">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
                  className="flex-1 flex items-center justify-between"
                >
                  <span className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                  </span>
                  {isFiltersCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>

                {/* Mobile Search Button - only show when filters are collapsed */}
                {isFiltersCollapsed && (
                  <Button
                    onClick={() => handleSearchAndFilter()}
                    disabled={isSearching || (!searchTerm.trim() && !attendanceFilterCount && !noAttendanceFilter)}
                    className="rssb-primary px-4"
                  >
                    {isSearching ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Row */}
            <div className={`grid grid-cols-1 gap-3 items-end ${user?.role === "admin" ? "md:grid-cols-6" : "md:grid-cols-5"} ${isFiltersCollapsed ? "hidden md:grid" : "grid"}`}>
              {/* Center - Only show for admin users */}
              {user?.role === "admin" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Center
                  </label>
                  <Select value={attendanceFilterCenter} onValueChange={setAttendanceFilterCenter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Centers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Centers</SelectItem>
                      {centers.map((center) => (
                        <SelectItem key={center._id} value={center.code}>
                          {center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition
                </label>
                <Select value={attendanceFilterOperator} onValueChange={setAttendanceFilterOperator}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="less_than">Less than</SelectItem>
                    <SelectItem value="less_than_equal">Less than or equal to</SelectItem>
                    <SelectItem value="equal">Equal to</SelectItem>
                    <SelectItem value="greater_than_equal">Greater than or equal to</SelectItem>
                    <SelectItem value="greater_than">Greater than</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Attendance Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attendance Count
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Enter count"
                  value={attendanceFilterCount}
                  onChange={(e) => setAttendanceFilterCount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSearchAndFilter()
                    }
                  }}
                />
              </div>

              {/* No Attendance Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No Attendance in Last
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Days"
                    value={noAttendanceDays}
                    onChange={(e) => {
                      setNoAttendanceDays(e.target.value)
                      setNoAttendanceFilter(!!e.target.value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleSearchAndFilter()
                      }
                    }}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Find Button */}
              <div>
                <Button
                  onClick={() => handleSearchAndFilter()}
                  disabled={isSearching || (!searchTerm.trim() && !attendanceFilterCount && !noAttendanceFilter)}
                  className="w-full rssb-primary"
                >
                  {isSearching ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Find
                </Button>
              </div>
            </div>

            {/* Show Usage Examples Button */}
            <div className={`mt-4 ${isFiltersCollapsed ? "hidden md:block" : "block"}`}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExamples(!showExamples)}
                className="text-xs text-gray-500 hover:text-gray-700 p-0 h-auto font-medium"
              >
                <span className="mr-1">Show Usage Examples</span>
                {showExamples ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </div>

            {/* Usage Examples - Expandable */}
            {showExamples && (
              <div className={`mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg ${isFiltersCollapsed ? "hidden md:block" : "block"}`}>
                <h4 className="font-medium text-blue-900 mb-3 text-sm">Search Examples:</h4>
                <ul className="text-xs text-blue-800 space-y-2 mb-4">
                  <li>• <strong>By Name:</strong> "Rajesh Kumar" or "Priya"</li>
                  <li>• <strong>By Badge Number:</strong> "HI5228GA0001" or "5228G"</li>
                  <li>• <strong>By Father/Husband Name:</strong> "Ram Singh"</li>
                  <li>• <strong>By Department:</strong> "LANGAR" or "SECURITY"</li>
                  <li>• <strong>By Center:</strong> "HISSAR-I" or "BARWALA"</li>
                </ul>

                <h4 className="font-medium text-blue-900 mb-3 text-sm">Filter Examples:</h4>
                <ul className="text-xs text-blue-800 space-y-2">
                  <li>• <strong>Low Attendance:</strong> Find sewadars with less than 10 attendance days</li>
                  <li>• <strong>No Attendance:</strong> Find sewadars with exactly 0 attendances</li>
                  <li>• <strong>High Attendance:</strong> Find sewadars with more than 20 attendance days</li>
                  <li>• <strong>Inactive Sewadars:</strong> Find sewadars with no attendance in last 30 days</li>
                  <li>• <strong>Gender Filter:</strong> Filter by Male or Female sewadars</li>
                  {user?.role === "admin" && (
                    <li>• <strong>Center Filter:</strong> Filter by specific center or all centers</li>
                  )}
                </ul>

                <div className="mt-4 p-3 bg-blue-100 rounded-md">
                  <p className="text-xs text-blue-900">
                    <strong>💡 Pro Tip:</strong> You can combine search terms with filters. For example, search for "Rajesh" and filter by attendance less than 5 to find all Rajesh sewadars with low attendance.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card className="enhanced-card" id="search-results">
            <CardHeader>
              {/* Mobile Layout */}
              <div className="block md:hidden">
                <CardTitle className="text-lg mb-3">
                  Search Results ({searchResults.length})
                </CardTitle>
                <div className="flex space-x-2 mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportSearchResults}
                    disabled={isExporting}
                    className="flex-1 rssb-primary"
                  >
                    {isExporting ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                    )}
                    {isExporting ? "..." : "Export"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClearSearch} className="flex-1">
                    <X className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>
                <CardDescription className="text-sm text-gray-600">
                  Click on a sewadar to view their attendance records.
                  {totalPages > 1 && (
                    <span className="block mt-1 font-medium">
                      Showing {startIndex + 1}-{Math.min(endIndex, searchResults.length)} of {searchResults.length} results
                    </span>
                  )}
                </CardDescription>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:block">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span>Search Results ({searchResults.length})</span>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportSearchResults}
                      disabled={isExporting}
                      className="rssb-primary"
                    >
                      {isExporting ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                      )}
                      {isExporting ? "Exporting..." : "Export Excel"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClearSearch}>
                      <X className="mr-2 h-4 w-4" />
                      Clear Results
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription className="text-sm mt-2">
                  Click on a sewadar to view their attendance records. Export results to Excel with attendance counts.
                  {totalPages > 1 && (
                    <span className="block mt-1">
                      Showing {startIndex + 1}-{Math.min(endIndex, searchResults.length)} of {searchResults.length} results
                    </span>
                  )}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile Card Layout - Badge Number, Name, Father/Husband Name, Center, Attendance */}
              <div className="block md:hidden space-y-3">
                {paginatedResults.map((sewadar, index) => (
                  <div
                    key={sewadar._id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedSewadar?._id === sewadar._id
                      ? "bg-blue-50 border-blue-200"
                      : index % 2 === 0
                        ? "bg-white hover:bg-gray-50"
                        : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    onClick={() => handleSelectSewadar(sewadar)}
                  >
                    <div className="space-y-3">
                      {/* Header row with name and badge number */}
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-gray-900 text-sm truncate flex-1">
                          {sewadar.name}
                        </h4>
                        <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded ml-3 flex-shrink-0">
                          {sewadar.badgeNumber}
                        </code>
                      </div>

                      {/* Father name and age */}
                      <div className="text-xs text-gray-600">
                        <p className="truncate">{sewadar.fatherHusbandName}</p>
                        {sewadar.age && (
                          <p className="text-gray-500 mt-1">Age: {sewadar.age}</p>
                        )}
                      </div>

                      {/* Center and attendance badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {user?.role === "admin" && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            {sewadar.center}
                          </span>
                        )}
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {getSewadarAttendanceCount(sewadar._id)} days
                        </span>
                      </div>
                    </div>
                    {selectedSewadar?._id === sewadar._id && (
                      <div className="mt-2 pt-2 border-t border-blue-200">
                        <span className="text-xs text-blue-600 font-medium">✓ Selected</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout - Full Information */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="w-full border-collapse">
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="w-[15%] py-3 px-4 font-semibold text-left bg-gray-50 border-b">Badge Number</TableHead>
                      <TableHead className="w-[20%] py-3 px-4 font-semibold text-left bg-gray-50 border-b">Name</TableHead>
                      <TableHead className="w-[15%] py-3 px-4 font-semibold text-left bg-gray-50 border-b">Father/Husband</TableHead>
                      <TableHead className="w-[10%] py-3 px-4 font-semibold text-left bg-gray-50 border-b">Gender</TableHead>
                      {user?.role === "admin" && (
                        <TableHead className="w-[15%] py-3 px-4 font-semibold text-left bg-gray-50 border-b">Center</TableHead>
                      )}
                      <TableHead className="w-[10%] py-3 px-4 font-semibold text-left bg-gray-50 border-b">Attendance</TableHead>
                      <TableHead className="w-[10%] py-3 px-4 font-semibold text-left bg-gray-50 border-b">Status</TableHead>
                      <TableHead className="w-[10%] py-3 px-4 font-semibold text-center bg-gray-50 border-b">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedResults.map((sewadar, index) => (
                      <TableRow
                        key={sewadar._id}
                        className={selectedSewadar?._id === sewadar._id ? "bg-blue-50" : index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <TableCell className="font-mono text-sm py-3 px-4 text-left border-b border-gray-100">{sewadar.badgeNumber}</TableCell>
                        <TableCell className="py-3 px-4 text-left border-b border-gray-100">{sewadar.name}</TableCell>
                        <TableCell className="py-3 px-4 text-left border-b border-gray-100">{sewadar.fatherHusbandName}</TableCell>
                        <TableCell className="text-left py-3 px-4 border-b border-gray-100">
                          <Badge variant={sewadar.gender === "MALE" ? "default" : "outline"} className="text-xs">
                            {sewadar.gender}
                          </Badge>
                        </TableCell>
                        {user?.role === "admin" && (
                          <TableCell className="py-3 px-4 text-left border-b border-gray-100">{sewadar.center}</TableCell>
                        )}
                        <TableCell className="text-left py-3 px-4 border-b border-gray-100">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getSewadarAttendanceCount(sewadar._id)} days
                          </span>
                        </TableCell>
                        <TableCell className="text-left py-3 px-4 border-b border-gray-100">
                          <Badge variant={sewadar.badgeStatus === "PERMANENT" ? "default" : "outline"} className="text-xs">
                            {sewadar.badgeStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center py-3 px-4 border-b border-gray-100">
                          <Button
                            variant={selectedSewadar?._id === sewadar._id ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSelectSewadar(sewadar)}
                            disabled={isLoadingAttendance}
                          >
                            <User className="mr-1 h-3 w-3" />
                            {selectedSewadar?._id === sewadar._id ? "Selected" : "View"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-3 md:px-6 py-4 border-t">
                <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between">
                  <div className="text-xs md:text-sm text-gray-600 text-center md:text-left">
                    Showing {startIndex + 1} to {Math.min(endIndex, searchResults.length)} of {searchResults.length} results
                  </div>
                  <div className="flex justify-center md:justify-end">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="text-xs px-2 py-1 h-8 min-w-[60px] md:min-w-[80px]"
                      >
                        <span className="hidden md:inline">Previous</span>
                        <span className="md:hidden">Prev</span>
                      </Button>

                      {/* Mobile: Show fewer page numbers */}
                      <div className="hidden md:flex space-x-1">
                        {/* Desktop pagination - show up to 5 pages */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={pageNum === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className="text-sm px-3 py-1 h-8 min-w-[40px]"
                            >
                              {pageNum}
                            </Button>
                          )
                        })}

                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <span className="flex items-center text-gray-400 px-1">...</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(totalPages)}
                              className="text-sm px-3 py-1 h-8 min-w-[40px]"
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Mobile pagination - show only 3 pages max */}
                      <div className="flex md:hidden space-x-1">
                        {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 3) {
                            pageNum = i + 1
                          } else if (currentPage <= 2) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 1) {
                            pageNum = totalPages - 2 + i
                          } else {
                            pageNum = currentPage - 1 + i
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={pageNum === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className="text-xs px-2 py-1 h-8 min-w-[32px]"
                            >
                              {pageNum}
                            </Button>
                          )
                        })}

                        {totalPages > 3 && currentPage < totalPages - 1 && (
                          <>
                            <span className="flex items-center text-gray-400 px-1 text-xs">...</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(totalPages)}
                              className="text-xs px-2 py-1 h-8 min-w-[32px]"
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="text-xs px-2 py-1 h-8 min-w-[60px] md:min-w-[80px]"
                      >
                        <span className="hidden md:inline">Next</span>
                        <span className="md:hidden">Next</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* No Results Found */}
        {hasSearched && searchResults.length === 0 && (
          <Card className="enhanced-card">
            <CardContent className="text-center py-12">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Sewadar Found</h3>
                  <p className="text-gray-600 text-sm max-w-md">
                    No sewadars match your search criteria. Try adjusting your search terms or filters.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <Button variant="outline" onClick={handleClearSearch}>
                    <X className="mr-2 h-4 w-4" />
                    Clear All Filters
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setAttendanceFilterCount("")
                      setGenderFilter("all")
                      setAttendanceFilterCenter(user?.role === "admin" ? "all" : (user?.centerId || "all"))
                      setAttendanceFilterOperator("less_than")
                    }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sewadar Attendance Modal */}
        <SewadarAttendanceModal
          isOpen={!!selectedSewadar}
          onClose={() => setSelectedSewadar(null)}
          sewadar={selectedSewadar}
        />
      </div>
    </Layout>
  )
}