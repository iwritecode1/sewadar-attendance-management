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
import { Search, User, Calendar, Download, RefreshCw, FileText, X } from "lucide-react"
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
  const { centers, sewadars } = useData()
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
      })

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
      console.error("Search error:", error)
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search sewadars",
        variant: "destructive",
      })
      setSearchResults([])
    } finally {
      setIsSearching(false)
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

  // Select sewadar and fetch attendance
  const handleSelectSewadar = async (sewadar: Sewadar) => {
    setSelectedSewadar(sewadar)
    setIsLoadingAttendance(true)

    try {
      const response = await apiClient.getAttendanceReport({
        sewadarId: sewadar._id,
        format: "json",
      })

      if (response.success) {
        setAttendanceRecords(response.data?.records || [])
        toast({
          title: "Attendance Loaded",
          description: `Found ${response.data?.records?.length || 0} attendance record(s)`,
        })
      } else {
        throw new Error(response.error || "Failed to fetch attendance")
      }
    } catch (error: any) {
      console.error("Attendance fetch error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch attendance records",
        variant: "destructive",
      })
      setAttendanceRecords([])
    } finally {
      setIsLoadingAttendance(false)
    }
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sewadar Lookup</h1>
          <p className="text-gray-600 mt-1">Search and view sewadar attendance records</p>
        </div>

        {/* Search Section */}
        <Card className="enhanced-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="mr-2 h-5 w-5" />
              Search Sewadars
            </CardTitle>
            <CardDescription>Search by Badge Number, Name, Father/Husband Name, Department or Center.</CardDescription>
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

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Search Results ({searchResults.length})</span>
                <Button variant="outline" size="sm" onClick={handleClearSearch}>
                  <X className="mr-2 h-4 w-4" />
                  Clear Results
                </Button>
              </CardTitle>
              <CardDescription>Click on a sewadar to view their attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mobile Card Layout - Only Badge Number, Name, Father/Husband Name */}
              <div className="block md:hidden space-y-3">
                {searchResults.map((sewadar, index) => (
                  <div 
                    key={sewadar._id} 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedSewadar?._id === sewadar._id 
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
                <Table className="enhanced-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Badge Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Father/Husband</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Center</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((sewadar, index) => (
                      <TableRow 
                        key={sewadar._id} 
                        className={selectedSewadar?._id === sewadar._id ? "bg-blue-50" : index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <TableCell className="font-mono text-sm">{sewadar.badgeNumber}</TableCell>
                        <TableCell className="font-medium">{sewadar.name}</TableCell>
                        <TableCell>{sewadar.fatherHusbandName}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              sewadar.gender === "MALE" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"
                            }`}
                          >
                            {sewadar.gender}
                          </span>
                        </TableCell>
                        <TableCell>{sewadar.center}</TableCell>
                        <TableCell>{sewadar.department}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              sewadar.badgeStatus === "PERMANENT"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {sewadar.badgeStatus}
                          </span>
                        </TableCell>
                        <TableCell>
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
          </Card>
        )}

        {/* Selected Sewadar Details and Attendance */}
        {selectedSewadar && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sewadar Information */}
            <Card className="enhanced-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Sewadar Details
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSewadar(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Badge Number</div>
                    <div className="font-mono text-sm mt-1">{selectedSewadar.badgeNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Badge Status</div>
                    <div className="mt-1">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${selectedSewadar.badgeStatus === "PERMANENT"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                          }`}
                      >
                        {selectedSewadar.badgeStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Name</div>
                  <div className="font-medium mt-1">{selectedSewadar.name}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Father/Husband Name</div>
                  <div className="mt-1">{selectedSewadar.fatherHusbandName}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Gender</div>
                    <div className="mt-1">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${selectedSewadar.gender === "MALE" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"
                          }`}
                      >
                        {selectedSewadar.gender}
                      </span>
                    </div>
                  </div>
                  {selectedSewadar.contactNo && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Contact</div>
                      <div className="font-mono text-sm mt-1">{selectedSewadar.contactNo}</div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Center</div>
                  <div className="mt-1">{selectedSewadar.center}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Department</div>
                  <div className="mt-1">{selectedSewadar.department}</div>
                </div>

                {attendanceStats && (
                  <div className="pt-4 border-t">
                    <div className="text-sm font-medium text-gray-500 mb-3">Attendance Summary</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{attendanceStats.totalEvents}</div>
                        <div className="text-sm text-blue-800">Events</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{attendanceStats.totalDays}</div>
                        <div className="text-sm text-green-800">Days</div>
                      </div>
                    </div>
                    <Button
                      onClick={handleExportAttendance}
                      disabled={isExporting}
                      className="w-full mt-4 rssb-primary"
                    >
                      {isExporting ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      {isExporting ? "Exporting..." : "Export CSV"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance Records */}
            <Card className="enhanced-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Attendance Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAttendance ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading attendance...</span>
                  </div>
                ) : attendanceRecords.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {attendanceRecords.map((record) => (
                      <div key={record._id} className="p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm">{record.eventId?.place || 'N/A'}</h4>
                          <span className="text-xs text-gray-500">
                            {record.eventId?.fromDate ? formatDate(record.eventId.fromDate) : 'Invalid Date'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mb-1">{record.eventId?.department || 'N/A'}</div>
                        <div className="text-xs text-gray-500">
                          {record.eventId?.fromDate ? formatDate(record.eventId.fromDate) : 'Invalid Date'} -{" "}
                          {record.eventId?.toDate ? formatDate(record.eventId.toDate) : 'Invalid Date'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Recorded by {record.submittedBy?.name || 'Unknown'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No attendance records found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  )
}