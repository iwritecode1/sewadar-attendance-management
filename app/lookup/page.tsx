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
import { Search, User, Calendar, Download, RefreshCw, FileText, X, Filter, BarChart3, FileSpreadsheet } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import SewadarAttendanceModal from "@/components/SewadarAttendanceModal"
import * as XLSX from "xlsx"
import { apiClient } from "@/lib/api-client"
import { DEPARTMENTS } from "@/lib/constants"
import { formatDate } from "@/lib/date-utils"

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
  const { centers, sewadars, attendance } = useData()
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

  // Request cancellation
  const [currentSearchController, setCurrentSearchController] = useState<AbortController | null>(null)
  const [currentFilterController, setCurrentFilterController] = useState<AbortController | null>(null)

  // Attendance filter states
  const [showAttendanceFilters, setShowAttendanceFilters] = useState(false)
  const [attendanceFilterCenter, setAttendanceFilterCenter] = useState(user?.role === "admin" ? "all" : (user?.centerId || "all"))
  const [attendanceFilterOperator, setAttendanceFilterOperator] = useState("less_than")
  const [attendanceFilterCount, setAttendanceFilterCount] = useState("")

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

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout
      return (searchValue: string) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          if (searchValue.trim().length >= 2) {
            handleSearch(searchValue)
          } else if (searchValue.trim().length === 0) {
            // Clear results when search is empty
            setSearchResults([])
            setSelectedSewadar(null)
            setAttendanceRecords([])
          }
        }, 500) // 500ms delay
      }
    })(),
    [centers] // Dependencies for the search function
  )

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
  }, [centers, sewadars])

  // Generate search suggestions based on centers and departments
  const generateSearchSuggestions = () => {
    const suggestions: SearchSuggestion[] = []

    // Add center suggestions with counts
    centers.forEach((center) => {
      const centerSewadarCount = sewadars.filter(s => s.centerId === center._id).length
      if (centerSewadarCount > 0) {
        suggestions.push({
          type: "center",
          value: center.name,
          label: `Center: ${center.name}`,
          count: centerSewadarCount,
        })
      }
    })

    // Add department suggestions with counts
    const departmentCounts: Record<string, number> = {}
    sewadars.forEach((sewadar) => {
      if (sewadar.department) {
        departmentCounts[sewadar.department] = (departmentCounts[sewadar.department] || 0) + 1
      }
    })

    Object.entries(departmentCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([dept, count]) => {
        suggestions.push({
          type: "department",
          value: dept,
          label: `Department: ${dept}`,
          count,
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

  // Search sewadars
  const handleSearch = async (searchValue?: string) => {
    const term = searchValue || searchTerm
    if (!term.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search term",
        variant: "destructive",
      })
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
      // Determine search parameters based on the search term
      let searchParams: any = {}

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

      const response = await apiClient.getSewadars({
        ...searchParams,
        limit: 10000,
        signal: controller.signal, // Pass abort signal to API call
      })

      // Check if request was aborted
      if (controller.signal.aborted) {
        return
      }

      if (response.success) {
        setSearchResults(response.data || [])
        saveToRecentSearches(term)

        if (response.data?.length === 0) {
          toast({
            title: "No Results",
            description: "No sewadars found matching your search",
          })
        } else {
          toast({
            title: "Search Complete",
            description: `Found ${response.data?.length} sewadar(s)`,
          })
        }
      } else {
        throw new Error(response.error || "Search failed")
      }
    } catch (error: any) {
      // Don't show error if request was aborted
      if (error.name === 'AbortError' || controller.signal.aborted) {
        return
      }

      console.error("Search error:", error)
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search sewadars",
        variant: "destructive",
      })
      setSearchResults([])
    } finally {
      // Only update loading state if request wasn't aborted
      if (!controller.signal.aborted) {
        setIsSearching(false)
        setCurrentSearchController(null)
      }
    }
  }

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("")
    setSearchResults([])
    setSelectedSewadar(null)
    setAttendanceRecords([])
    setShowSuggestions(false)
    searchInputRef.current?.focus()
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchTerm(suggestion.value)
    setShowSuggestions(false)
    handleSearch(suggestion.value)
  }

  // Calculate attendance count for a sewadar in a specific center or all centers
  // This should return the total number of DAYS attended, not just number of events
  const getSewadarAttendanceCount = (sewadarId: string, centerId?: string) => {
    const matchingRecords = attendance.filter(record => {
      // Check if this attendance record includes the sewadar
      let hasSewadar = false

      // Check regular sewadars (array of sewadar IDs)
      if (record.sewadars && Array.isArray(record.sewadars)) {
        hasSewadar = record.sewadars.includes(sewadarId)
      }

      // Check temporary sewadars
      if (!hasSewadar && record.tempSewadars && Array.isArray(record.tempSewadars)) {
        hasSewadar = record.tempSewadars.some((ts: any) =>
          ts.id === sewadarId || ts._id === sewadarId
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
      toast({
        title: "Error",
        description: "Please enter an attendance count",
        variant: "destructive",
      })
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
      const response = await apiClient.getSewadars({
        centerId: targetCenterId,
        limit: 10000, // Use a very high limit to get all sewadars
        signal: controller.signal,
      });
      
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

      if (filteredSewadars.length === 0) {
        toast({
          title: "No Results",
          description: "No sewadars found matching your attendance criteria",
        })
      } else {
        const centerName = attendanceFilterCenter === "all"
          ? "all centers"
          : centers.find(c => c.code === attendanceFilterCenter)?.name || "selected center"

        const operatorText = {
          less_than: "less than",
          less_than_equal: "less than or equal to",
          equal: "equal to",
          greater_than_equal: "greater than or equal to",
          greater_than: "greater than"
        }[attendanceFilterOperator]

        toast({
          title: "Filter Applied",
          description: `Found ${filteredSewadars.length} sewadar(s) with ${operatorText} ${attendanceFilterCount} attendance(s) in ${centerName}`,
        })
      }
    } catch (error: any) {
      // Don't show error if request was aborted
      if (error.name === 'AbortError' || controller.signal.aborted) {
        return
      }

      console.error("Filter error:", error)
      toast({
        title: "Filter Failed",
        description: error.message || "Failed to filter sewadars by attendance",
        variant: "destructive",
      })
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

  // Handle Enter key in search
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
    }
  }

  // Handle input focus
  const handleInputFocus = () => {
    if (searchSuggestions.length > 0 && !searchTerm) {
      setShowSuggestions(true)
    }
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
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Sewadar Lookup</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">Search and view sewadar attendance records</p>
        </div>

        {/* Search Section */}
        <Card className="enhanced-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-base md:text-lg">
              <Search className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              Search Sewadars
            </CardTitle>
            <CardDescription className="text-sm">Search by Badge Number, Name, Father/Husband Name, Department or Center.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="flex space-x-2">
                <div className="flex-1 relative">
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

                      // Trigger debounced search
                      debouncedSearch(value)

                      if (value.length > 0) {
                        setShowSuggestions(true)
                      } else {
                        setShowSuggestions(false)
                      }
                    }}
                    onKeyPress={handleKeyPress}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="w-full pr-10"
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
                </div>
                <Button
                  onClick={() => handleSearch()}
                  disabled={isSearching}
                  className="hidden md:flex rssb-primary"
                >
                  {isSearching ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>

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
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-md flex items-center justify-between group"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <div className="flex items-center">
                            <span className="text-gray-600">{suggestion.label}</span>
                          </div>
                          <span className="text-xs text-gray-400 group-hover:text-gray-600">
                            {suggestion.count}
                          </span>
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
          </CardContent>
        </Card>

        {/* Attendance Filters */}
        <Card className="enhanced-card">
          <CardHeader className="pb-4">
            <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center text-base md:text-lg">
                  <BarChart3 className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  Attendance Filters
                </CardTitle>
                <CardDescription className="text-sm">
                  {user?.role === "admin"
                    ? "Find sewadars based on their attendance count for specific centers"
                    : "Find sewadars based on their attendance count in your center"
                  }
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAttendanceFilters(!showAttendanceFilters)}
                className="w-full md:w-auto"
              >
                <Filter className="mr-2 h-4 w-4" />
                {showAttendanceFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>
          </CardHeader>
          {showAttendanceFilters && (
            <CardContent className="space-y-4">
              <div className={`grid grid-cols-1 gap-3 md:gap-4 ${user?.role === "admin" ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
                {/* Center selection - only for admin users */}
                {user?.role === "admin" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Center
                    </label>
                    <Select value={attendanceFilterCenter} onValueChange={setAttendanceFilterCenter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select center" />
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
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleAttendanceFilter}
                    disabled={!attendanceFilterCount || isSearching}
                    className="w-full rssb-primary text-sm"
                  >
                    {isSearching ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <BarChart3 className="mr-2 h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{isSearching ? "Filtering..." : "Apply Filter"}</span>
                    <span className="sm:hidden">{isSearching ? "..." : "Apply"}</span>
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
                <h4 className="font-medium text-blue-900 mb-2 text-sm md:text-base">Filter Examples:</h4>
                <ul className="text-xs md:text-sm text-blue-800 space-y-1">
                  {user?.role === "admin" ? (
                    <>
                      <li>• Find sewadars with less than 5 attendances in HISAR-I center</li>
                      <li>• Find sewadars with exactly 0 attendances across all centers</li>
                      <li>• Find sewadars with more than 10 attendances in a specific center</li>
                    </>
                  ) : (
                    <>
                      <li>• Find sewadars with less than 5 attendance days in your center</li>
                      <li>• Find sewadars with exactly 0 attendances in your center</li>
                      <li>• Find sewadars with more than 10 attendance days in your center</li>
                    </>
                  )}
                </ul>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card className="enhanced-card mx-4 md:mx-0" id="search-results">
            <CardHeader>
              {/* Mobile Layout */}
              <div className="block md:hidden">
                <CardTitle className="text-lg font-semibold mb-3">
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
              {/* Mobile Card Layout - Only Badge Number, Name, Father/Husband Name */}
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
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm truncate">
                          {sewadar.name}
                        </h4>
                        <p className="text-xs text-gray-600 truncate mt-1">
                          {sewadar.fatherHusbandName}
                        </p>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                          {sewadar.badgeNumber}
                        </code>
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
                <Table className="enhanced-table w-full">
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="w-[15%] py-3 font-semibold">Badge Number</TableHead>
                      <TableHead className="w-[15%] py-3 font-semibold">Name</TableHead>
                      <TableHead className="w-[15%] py-3 font-semibold">Father/Husband</TableHead>
                      <TableHead className="w-[10%] py-3 font-semibold text-center">Gender</TableHead>
                      <TableHead className="w-[15%] py-3 font-semibold">Center</TableHead>
                      <TableHead className="w-[15%] py-3 font-semibold">Department</TableHead>
                      <TableHead className="w-[10%] py-3 font-semibold text-center">Status</TableHead>
                      <TableHead className="w-[10%] py-3 font-semibold text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedResults.map((sewadar, index) => (
                      <TableRow
                        key={sewadar._id}
                        className={selectedSewadar?._id === sewadar._id ? "bg-blue-50" : index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <TableCell className="font-mono text-sm py-3">{sewadar.badgeNumber}</TableCell>
                        <TableCell className="font-medium py-3">{sewadar.name}</TableCell>
                        <TableCell className="py-3">{sewadar.fatherHusbandName}</TableCell>
                        <TableCell className="text-center py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${sewadar.gender === "MALE" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"
                              }`}
                          >
                            {sewadar.gender}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">{sewadar.center}</TableCell>
                        <TableCell className="py-3">{sewadar.department}</TableCell>
                        <TableCell className="text-center py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${sewadar.badgeStatus === "PERMANENT"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                              }`}
                          >
                            {sewadar.badgeStatus}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-3">
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