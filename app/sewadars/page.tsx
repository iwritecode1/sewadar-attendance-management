"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useData } from "@/contexts/DataContext"
import { useAuth } from "@/contexts/AuthContext"
import Layout from "@/components/Layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { Upload, Search, Download, FileSpreadsheet, Users, Filter, Eye, X, RefreshCw, Edit, Trash2, MoreHorizontal, Plus } from "lucide-react"
import * as XLSX from "xlsx"
import SewadarDetailModal from "@/components/SewadarDetailModal"
import EditSewadarModal from "@/components/EditSewadarModal"
import StatusOverlay from "@/components/StatusOverlay"
import LoadingOverlay from "@/components/LoadingOverlay"
import ImportProgressModal from "@/components/ImportProgressModal"
import { DEPARTMENTS } from "@/lib/constants"
import { generateBadgePattern, getNextBadgeNumber } from "@/lib/badgeUtils"
import { toTitleCase } from "@/lib/text-utils"

export default function SewadarsPage() {
  const { user } = useAuth()
  const { sewadars, centers, importSewadars, fetchSewadars, deleteSewadar, loading, pagination } = useData()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCenter, setSelectedCenter] = useState("all")
  const [selectedDepartment, setSelectedDepartment] = useState("all")
  const [selectedGender, setSelectedGender] = useState("all")
  const [selectedBadgeStatus, setSelectedBadgeStatus] = useState("all")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showImportForm, setShowImportForm] = useState(false)
  const [importProgress, setImportProgress] = useState<{
    isOpen: boolean
    jobId: string | null
    totalRecords: number
  }>({
    isOpen: false,
    jobId: null,
    totalRecords: 0
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [viewingSewadar, setViewingSewadar] = useState<string | null>(null)
  const [editingSewadar, setEditingSewadar] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showTempSewadarForm, setShowTempSewadarForm] = useState(false)
  const [tempSewadars, setTempSewadars] = useState([
    {
      name: "",
      fatherName: "",
      age: "",
      gender: "MALE" as "MALE" | "FEMALE",
      phone: "",
    },
  ])

  // Get unique departments from sewadars
  const departments = [...new Set(sewadars.map((s) => s.department))].sort()

  // Fetch sewadars when filters change
  useEffect(() => {
    const params: any = {
      page: currentPage,
      limit: 50,
      includeStats: true,
    }

    if (searchTerm) params.search = searchTerm
    if (selectedCenter !== "all") params.centerId = selectedCenter
    if (selectedDepartment !== "all") params.department = selectedDepartment
    if (selectedGender !== "all") params.gender = selectedGender
    if (selectedBadgeStatus !== "all") params.badgeStatus = selectedBadgeStatus

    // Small delay to debounce rapid filter changes
    const timeoutId = setTimeout(() => {
      fetchSewadars(params)
    }, 50)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedCenter, selectedDepartment, selectedGender, selectedBadgeStatus, currentPage, fetchSewadars])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast({
        title: "Error",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      })
      return
    }

    const result = await importSewadars(file)

    if (result && typeof result === 'object' && 'jobId' in result) {
      // New optimized import with progress tracking
      setShowImportForm(false)
      setImportProgress({
        isOpen: true,
        jobId: result.jobId,
        totalRecords: result.total
      })

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } else if (result === true) {
      // Old import format - success
      setShowImportForm(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
    // If result is false, error handling is done in DataContext
  }

  const handleImportProgressClose = () => {
    setImportProgress({
      isOpen: false,
      jobId: null,
      totalRecords: 0
    })
    // Refresh data after import completion
    refreshData()
  }

  const downloadSampleExcel = () => {
    const sampleData = [
      {
        Badge_Number: "HI5228GA0001",
        Sewadar_Name: "SAMPLE SEWADAR",
        Father_Husband_Name: "FATHER NAME",
        DOB: "01-01-1990",
        Age: "34",
        Gender: "MALE",
        Badge_Status: "PERMANENT",
        Zone: "Zone 3",
        Area: user?.area || "HISAR",
        Centre: "HISSAR-I",
        Department: "LANGAR",
        Contact_No: "9876543210",
        Emergency_Contact: "9876543211",
      },
    ]

    const ws = XLSX.utils.json_to_sheet(sampleData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sewadars")
    XLSX.writeFile(wb, "sample_sewadars.xlsx")
  }

  const exportSewadars = () => {
    const exportData = sewadars.map((sewadar) => ({
      Badge_Number: sewadar.badgeNumber,
      Sewadar_Name: sewadar.name,
      Father_Husband_Name: sewadar.fatherHusbandName,
      DOB: sewadar.dob,
      Age: sewadar.age || "",
      Gender: sewadar.gender,
      Badge_Status: sewadar.badgeStatus,
      Zone: sewadar.zone,
      Area: sewadar.area,
      Centre: sewadar.center,
      Department: sewadar.department,
      Contact_No: sewadar.contactNo,
      Emergency_Contact: sewadar.emergencyContact,
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sewadars")
    XLSX.writeFile(wb, `sewadars_${user?.area}_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCenter("all")
    setSelectedDepartment("all")
    setSelectedGender("all")
    setSelectedBadgeStatus("all")
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const refreshData = () => {
    fetchSewadars({
      page: currentPage,
      limit: 50,
      includeStats: true,
      search: searchTerm || undefined,
      centerId: selectedCenter !== "all" ? selectedCenter : undefined,
      department: selectedDepartment !== "all" ? selectedDepartment : undefined,
      gender: selectedGender !== "all" ? selectedGender : undefined,
      badgeStatus: selectedBadgeStatus !== "all" ? selectedBadgeStatus : undefined,
    })
  }

  const handleDeleteSewadar = async (sewadarId: string) => {
    if (!confirm("Are you sure you want to delete this sewadar?")) {
      return
    }

    const success = await deleteSewadar(sewadarId)
    if (success) {
      refreshData()
    }
  }

  const addTempSewadar = () => {
    setTempSewadars([
      ...tempSewadars,
      { name: "", fatherName: "", age: "", gender: "MALE", phone: "" },
    ])
  }

  const removeTempSewadar = (index: number) => {
    if (tempSewadars.length > 1) {
      setTempSewadars(tempSewadars.filter((_, i) => i !== index))
    }
  }

  const updateTempSewadar = (index: number, field: string, value: string) => {
    const updated = [...tempSewadars]
    updated[index] = { ...updated[index], [field]: value }
    setTempSewadars(updated)
  }

  // State to store all temp sewadars for accurate badge calculation
  const [allTempSewadars, setAllTempSewadars] = useState<any[]>([])

  // Fetch all temporary sewadars for accurate badge number calculation
  const fetchAllTempSewadars = async (centerId: string) => {
    try {
      const response = await fetch(`/api/sewadars?centerId=${centerId}&badgeStatus=TEMPORARY&limit=1000`)
      if (response.ok) {
        const result = await response.json()
        setAllTempSewadars(result.data || [])
      }
    } catch (error) {
      console.error("Error fetching temp sewadars:", error)
    }
  }

  // Generate badge number for temp sewadars - use all temp sewadars data
  const getNextTempBadgeNumber = (gender: "MALE" | "FEMALE", currentIndex: number = 0) => {
    const centerId = user?.role === "admin" ? selectedCenter : user?.centerId || ""
    if (!centerId || centerId === "all") return "Select center first"

    const badgePattern = generateBadgePattern(centerId, gender, true)

    // Get existing badges with this pattern from ALL temp sewadars (not just paginated results)
    const existingBadges = allTempSewadars
      .filter(sewadar => sewadar.badgeNumber && sewadar.badgeNumber.startsWith(badgePattern))
      .map(sewadar => sewadar.badgeNumber)

    // Count how many temp sewadars of the same gender are being added before AND INCLUDING this one
    let sameGenderCountBefore = 0
    for (let i = 0; i <= currentIndex; i++) {
      const ts = tempSewadars[i]
      if (ts && ts.gender === gender && (ts.name.trim() || i === currentIndex)) {
        if (i < currentIndex) {
          sameGenderCountBefore++
        }
      }
    }

    // Generate base next badge number from existing badges
    const baseNextBadge = getNextBadgeNumber(existingBadges, badgePattern)
    const baseNumber = parseInt(baseNextBadge.slice(-4))

    // Calculate the final badge number for this specific sewadar
    const finalNumber = baseNumber + sameGenderCountBefore
    return `${badgePattern}${String(finalNumber).padStart(4, "0")}`
  }

  const handleCreateTempSewadars = async () => {
    // Validate that we have at least one valid temp sewadar
    const validTempSewadars = tempSewadars.filter(ts => ts.name.trim() && ts.fatherName.trim())

    if (validTempSewadars.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one temporary sewadar with name and father/husband name",
        variant: "destructive",
      })
      return
    }

    // Check for duplicates within the form itself
    const duplicatesInForm = []
    const seenCombinations = new Set()

    for (const [index, ts] of validTempSewadars.entries()) {
      const combination = `${ts.name.toLowerCase().trim()}|${ts.fatherName.toLowerCase().trim()}`

      if (seenCombinations.has(combination)) {
        duplicatesInForm.push(`${ts.name} / ${ts.fatherName}`)
      } else {
        seenCombinations.add(combination)
      }
    }

    if (duplicatesInForm.length > 0) {
      toast({
        title: "Duplicate Sewadars in Form",
        description: `Please remove duplicate entries: ${duplicatesInForm.join(', ')}`,
        variant: "destructive",
      })
      return
    }

    // For admin, ensure center is selected
    if (user?.role === "admin" && selectedCenter === "all") {
      toast({
        title: "Error",
        description: "Please select a center first",
        variant: "destructive",
      })
      return
    }

    try {
      const centerId = user?.role === "admin" ? selectedCenter : user?.centerId
      const centerData = centers.find(c => c.code === centerId || c._id === centerId)

      if (!centerData) {
        throw new Error("Center not found")
      }

      // Process each temp sewadar (same logic as attendance page)
      const createdBadges = []
      const existingMessages = []
      const errorMessages = []

      for (const [index, ts] of validTempSewadars.entries()) {
        try {
          // Create/check sewadar - server will handle duplicate detection
          const sewadarData = {
            name: ts.name.trim().toUpperCase(),
            fatherHusbandName: ts.fatherName.trim().toUpperCase(),
            dob: "",
            age: parseInt(ts.age) || 0,
            gender: ts.gender,
            badgeStatus: "TEMPORARY",
            zone: centerData.area,
            area: centerData.area,
            areaCode: centerData.areaCode,
            center: centerData.name,
            centerId: centerData.code,
            department: "General",
            contactNo: ts.phone || "",
            emergencyContact: "",
          }

          const response = await fetch('/api/sewadars', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(sewadarData),
          })

          if (response.ok) {
            const result = await response.json()

            if (result.isExisting) {
              // Server found existing sewadar
              existingMessages.push(`${ts.name} / ${ts.fatherName} - Existing (${result.data.badgeNumber})`)
            } else {
              // Server created new sewadar
              createdBadges.push(result.data?.badgeNumber)
            }
          } else {
            const errorData = await response.json()
            throw new Error(errorData.error || `Failed to create sewadar: ${ts.name}`)
          }
        } catch (error: any) {
          errorMessages.push(`Failed to process ${ts.name}: ${error.message}`)
        }
      }

      // Show results - same approach as attendance page
      if (createdBadges.length > 0 || existingMessages.length > 0) {
        let message = "Processing completed successfully."
        if (createdBadges.length > 0) {
          message = `Created ${createdBadges.length} new temporary sewadar(s)`
        }
        if (existingMessages.length > 0) {
          message += existingMessages.length > 0 ? ` Found ${existingMessages.length} existing sewadar(s)` : ""
        }

        toast({
          title: "Success",
          description: message,
        })

        // Show detailed information in a separate toast if there are existing sewadars
        if (existingMessages.length > 0) {
          setTimeout(() => {
            toast({
              title: "Existing Sewadars Found",
              description: existingMessages.join("; "),
              variant: "default",
              duration: 10000,
            })
          }, 1500)
        }

        // Show errors if any
        if (errorMessages.length > 0) {
          setTimeout(() => {
            toast({
              title: "Processing Errors",
              description: errorMessages.join("; "),
              variant: "destructive",
              duration: 8000,
            })
          }, 3000)
        }
      } else if (errorMessages.length > 0) {
        toast({
          title: "Error",
          description: "No sewadars could be processed. " + errorMessages.join("; "),
          variant: "destructive",
        })
      }

      // Reset form
      setTempSewadars([{ name: "", fatherName: "", age: "", gender: "MALE", phone: "" }])
      setShowTempSewadarForm(false)
      refreshData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create temporary sewadars",
        variant: "destructive",
      })
    }
  }

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6 px-2 md:px-0">
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl text-gray-900">Manage Sewadars</h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              {user?.role === "admin" ? `All Sewadars in ${user.area} Area` : `Sewadars from ${user?.centerName}`}
            </p>
          </div>
          {/* Mobile - More Actions Dropdown */}
          <div className="block md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full">
                  {/* <MoreHorizontal className="mr-2 h-4 w-4" /> */}
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={refreshData} disabled={loading.sewadars}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading.sewadars ? "animate-spin" : ""}`} />
                  Refresh Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadSampleExcel}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Sample
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportSewadars} disabled={sewadars.length === 0}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export Data
                </DropdownMenuItem>
                {user?.role === "admin" && (
                  <DropdownMenuItem onClick={() => setShowImportForm(!showImportForm)} disabled={loading.importSewadars}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Sewadars
                  </DropdownMenuItem>
                )}
                {(user?.role === "admin" || user?.role === "coordinator") && (
                  <DropdownMenuItem onClick={() => {
                    if (!showTempSewadarForm) {
                      // Fetch all temp sewadars for accurate badge number calculation
                      const centerId = user?.role === "admin" ? selectedCenter : user?.centerId
                      if (centerId && centerId !== "all") {
                        fetchAllTempSewadars(centerId)
                      }
                    }
                    setShowTempSewadarForm(!showTempSewadarForm)
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Temp Sewadar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop - Individual Buttons */}
          <div className="hidden md:flex space-x-2">
            <Button onClick={refreshData} variant="outline" disabled={loading.sewadars} className="text-sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading.sewadars ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={downloadSampleExcel} variant="outline" className="text-sm">
              <Download className="mr-2 h-4 w-4" />
              Sample Excel
            </Button>
            <Button onClick={exportSewadars} variant="outline" disabled={sewadars.length === 0} className="text-sm">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export
            </Button>
            {user?.role === "admin" && (
              <Button
                onClick={() => setShowImportForm(!showImportForm)}
                variant={showImportForm ? "default" : "outline"}
                disabled={loading.importSewadars}
                className="text-sm"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            )}
            {(user?.role === "admin" || user?.role === "coordinator") && (
              <Button
                onClick={() => {
                  if (!showTempSewadarForm) {
                    // Fetch all temp sewadars for accurate badge number calculation
                    const centerId = user?.role === "admin" ? selectedCenter : user?.centerId
                    if (centerId && centerId !== "all") {
                      fetchAllTempSewadars(centerId)
                    }
                  }
                  setShowTempSewadarForm(!showTempSewadarForm)
                }}
                variant={showTempSewadarForm ? "default" : "outline"}
                className="text-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Temp Sewadar
              </Button>
            )}
          </div>
        </div>

        {/* Import Form - Show when Import button is clicked */}
        {user?.role === "admin" && showImportForm && (
          <Card className="enhanced-card">
            <CardContent className="space-y-4 pt-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">Upload Excel File</p>
                <p className="text-sm text-gray-500 mb-4">Drag and drop your Excel file here, or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={loading.importSewadars}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading.importSewadars}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {loading.importSewadars ? "Importing..." : "Choose Excel File"}
                </Button>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Import Guidelines:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Use Badge_Number as unique identifier</li>
                  <li>• Existing records will be updated if Badge_Number matches</li>
                  <li>• Required columns: Badge_Number, Sewadar_Name, Centre</li>
                  <li>• Optional columns: Age, DOB, Gender, Department, etc.</li>
                  <li>• Badge Status: PERMANENT/OPEN remain as-is, all others become TEMPORARY</li>
                  <li>• Download sample file for correct format</li>
                  <li>• Large imports (2500+ records) are processed in background</li>
                  <li>• Progress tracking available for large imports</li>
                  <li>• Maximum file size: 50MB</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Temporary Sewadar Form - Show when Add Temp button is clicked */}
        {(user?.role === "admin" || user?.role === "coordinator") && showTempSewadarForm && (
          <Card className="enhanced-card">
            <CardContent className="space-y-4 pt-6">
              {/* Center Selection for Admin - Show first */}
              {user?.role === "admin" && selectedCenter === "all" && (
                <div className="text-center space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Select Center First</h3>
                    <p className="text-sm text-blue-800 mb-4">
                      Please select a center to create temporary sewadars for
                    </p>

                    <div className="w-full max-w-md mx-auto">
                      <Label className="block text-sm font-medium text-gray-700 mb-2">
                        Center *
                      </Label>
                      <Select
                        value={selectedCenter === "all" ? "" : selectedCenter}
                        onValueChange={(value) => {
                          setSelectedCenter(value)
                          // Fetch temp sewadars for the newly selected center
                          if (value && value !== "all") {
                            fetchAllTempSewadars(value)
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select center" />
                        </SelectTrigger>
                        <SelectContent>
                          {centers.map((center) => (
                            <SelectItem key={center._id} value={center.code}>
                              {toTitleCase(center.name)} ({center.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Temp Sewadar Form - Show after center selection */}
              {(user?.role === "coordinator" || (user?.role === "admin" && selectedCenter !== "all")) && (
                <>
                  {/* Show selected center for admin */}
                  {user?.role === "admin" && selectedCenter !== "all" && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
                        <div>
                          <p className="text-sm font-medium text-green-900">
                            Creating temporary sewadars for:
                          </p>
                          <p className="text-sm text-green-800">
                            {toTitleCase(centers.find(c => c.code === selectedCenter)?.name || "")} ({selectedCenter})
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCenter("all")}
                          className="text-green-700 hover:text-green-900 w-full md:w-auto"
                        >
                          Change Center
                        </Button>
                      </div>
                    </div>
                  )}

                  {tempSewadars.map((tempSewadar, index) => (
                    <div key={index} className="form-section">
                      <div className="flex flex-col space-y-2 mb-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                        <h4 className="font-medium text-gray-900">
                          Temporary Sewadar #{index + 1}
                        </h4>
                        {tempSewadars.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeTempSewadar(index)}
                            className="text-red-600 hover:text-red-700 w-full md:w-auto"
                          >
                            <X className="mr-1 h-4 w-4" />
                            Remove
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label>Name *</Label>
                          <Input
                            value={tempSewadar.name}
                            onChange={(e) =>
                              updateTempSewadar(index, "name", e.target.value?.toUpperCase())
                            }
                            placeholder="Full name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Father / Husband Name *</Label>
                          <Input
                            value={tempSewadar.fatherName}
                            onChange={(e) =>
                              updateTempSewadar(
                                index,
                                "fatherName",
                                e.target.value?.toUpperCase()
                              )
                            }
                            placeholder="Father / Husband Name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Age</Label>
                          <Input
                            type="number"
                            value={tempSewadar.age}
                            onChange={(e) =>
                              updateTempSewadar(index, "age", e.target.value)
                            }
                            placeholder="Age"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Gender *</Label>
                          <Select
                            value={tempSewadar.gender}
                            onValueChange={(value: "MALE" | "FEMALE") =>
                              updateTempSewadar(index, "gender", value)
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MALE">Male</SelectItem>
                              <SelectItem value="FEMALE">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input
                            value={tempSewadar.phone}
                            onChange={(e) =>
                              updateTempSewadar(
                                index,
                                "phone",
                                e.target.value
                              )
                            }
                            placeholder="Phone number (optional)"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      {tempSewadar.name && tempSewadar.gender && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">
                            Auto-generated badge:
                            <span className="font-mono font-medium ml-2 text-blue-600">
                              {getNextTempBadgeNumber(tempSewadar.gender, index)}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addTempSewadar}
                      className="bg-transparent w-full md:w-auto"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Another Temporary Sewadar
                    </Button>

                    <Button
                      type="button"
                      onClick={handleCreateTempSewadars}
                      className="rssb-primary w-full md:w-auto"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Create Temporary Sewadars
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowTempSewadarForm(false)
                        setTempSewadars([{ name: "", fatherName: "", age: "", gender: "MALE", phone: "" }])
                      }}
                      className="w-full md:w-auto"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
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
                    placeholder="Search by Name, Father's Name or Badge Number"
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
                  {user?.role === "admin" && (
                    <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Centers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Centers</SelectItem>
                        {centers.map((center) => (
                          <SelectItem key={center._id} value={center.code}>
                            {toTitleCase(center.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {toTitleCase(dept)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedGender} onValueChange={setSelectedGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Genders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genders</SelectItem>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedBadgeStatus} onValueChange={setSelectedBadgeStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="PERMANENT">Permanent</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="TEMPORARY">Temporary</SelectItem>
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
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by Name, Father's Name or Badge Number"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {user?.role === "admin" && (
                <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Centers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Centers</SelectItem>
                    {centers.map((center) => (
                      <SelectItem key={center._id} value={center.code}>
                        {toTitleCase(center.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {toTitleCase(dept)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger>
                  <SelectValue placeholder="All Genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedBadgeStatus} onValueChange={setSelectedBadgeStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PERMANENT">Permanent</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="TEMPORARY">Temporary</SelectItem>
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
        {/* Mobile - Single Combined Card */}
        <div className="block md:hidden">
          <Card className="stat-card">
            <CardContent className="py-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Total</span>
                  </div>
                  <p className="text-2xl text-gray-900">{pagination.sewadars?.total || sewadars.length}</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-xs">M</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">Male</span>
                  </div>
                  <p className="text-2xl text-gray-900">
                    {pagination.sewadars?.maleCount || sewadars.filter((s) => s.gender === "MALE").length}
                  </p>
                </div>
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 bg-pink-100 rounded-full flex items-center justify-center">
                      <span className="text-pink-600 font-bold text-xs">F</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">Female</span>
                  </div>
                  <p className="text-2xl text-gray-900">
                    {pagination.sewadars?.femaleCount || sewadars.filter((s) => s.gender === "FEMALE").length}
                  </p>
                </div>
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-bold text-xs">P</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">Permanent</span>
                  </div>
                  <p className="text-2xl text-gray-900">
                    {pagination.sewadars?.permanentCount || sewadars.filter((s) => s.badgeStatus === "PERMANENT").length}
                  </p>
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
                  <p className="text-sm font-medium text-gray-600">Total Sewadars</p>
                  <p className="text-2xl text-gray-900">{pagination.sewadars?.total || sewadars.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Male</p>
                  <p className="text-2xl text-gray-900">
                    {pagination.sewadars?.maleCount || sewadars.filter((s) => s.gender === "MALE").length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">M</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Female</p>
                  <p className="text-2xl text-gray-900">
                    {pagination.sewadars?.femaleCount || sewadars.filter((s) => s.gender === "FEMALE").length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                  <span className="text-pink-600 font-bold text-sm">F</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Permanent</p>
                  <p className="text-2xl text-gray-900">
                    {pagination.sewadars?.permanentCount || sewadars.filter((s) => s.badgeStatus === "PERMANENT").length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold text-sm">P</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sewadars Table */}
        <Card className="enhanced-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base md:text-lg">
              <span>Sewadars ({pagination.sewadars?.total || sewadars.length})</span>
              <Badge variant="secondary" className="ml-2">
                {user?.area}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading.sewadars ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading sewadars...</span>
              </div>
            ) : (
              <>
                {/* Mobile Card Layout - Essential Info Only */}
                <div className="block md:hidden space-y-3">
                  {sewadars.map((sewadar, index) => (
                    <div
                      key={sewadar._id}
                      className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${index % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}`}
                      onClick={() => setViewingSewadar(sewadar._id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm truncate">
                            {sewadar.name}
                          </h4>
                          <p className="text-xs text-gray-600 truncate mt-1">
                            {sewadar.fatherHusbandName}
                          </p>
                          <p className="text-xs text-gray-600 truncate mt-1">
                            {sewadar.age}
                          </p>
                        </div>
                        <div className="ml-3 flex-shrink-0">
                          <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                            {sewadar.badgeNumber}
                          </code>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant={sewadar.gender === "MALE" ? "default" : "secondary"} className="text-xs">
                            {sewadar.gender}
                          </Badge>
                          <Badge variant={sewadar.badgeStatus === "PERMANENT" ? "default" : "outline"} className="text-xs">
                            {sewadar.badgeStatus}
                          </Badge>
                        </div>

                        <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800"
                            onClick={() => setViewingSewadar(sewadar._id)}
                            title="View Details"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {(user?.role === "admin" || user?.role === "coordinator") && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-green-600 hover:text-green-800"
                                onClick={() => setEditingSewadar(sewadar._id)}
                                title="Edit"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              {user?.role === "admin" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-800"
                                  onClick={() => handleDeleteSewadar(sewadar._id)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table Layout - Full Information */}
                <div className="hidden md:block overflow-x-auto">
                  <Table className="enhanced-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Badge Number</TableHead>
                        <TableHead className="w-40">Name</TableHead>
                        <TableHead className="w-40">Father/Husband</TableHead>
                        <TableHead className="w-16">Age</TableHead>
                        {user?.role === "admin" && <TableHead className="w-24">Center</TableHead>}
                        <TableHead className="w-32">Department</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sewadars.map((sewadar, index) => (
                        <TableRow
                          key={sewadar._id}
                          className={`cursor-pointer hover:bg-blue-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-100"}`}
                          onClick={() => setViewingSewadar(sewadar._id)}
                        >
                          <TableCell className="font-mono text-sm font-medium w-32">{sewadar.badgeNumber}</TableCell>
                          <TableCell className="font-medium w-40">{sewadar.name}</TableCell>
                          <TableCell className="w-40">{sewadar.fatherHusbandName}</TableCell>
                          <TableCell className="w-16 text-center">{sewadar.age || "-"}</TableCell>
                          {user?.role === "admin" && <TableCell className="w-24 whitespace-nowrap text-sm">{sewadar.center}</TableCell>}
                          <TableCell className="w-32 text-sm">{sewadar.department}</TableCell>
                          <TableCell className="w-24">
                            <Badge variant={sewadar.badgeStatus === "PERMANENT" ? "default" : "outline"}>
                              {sewadar.badgeStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="w-20">
                            <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                                onClick={() => setViewingSewadar(sewadar._id)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(user?.role === "admin" || user?.role === "coordinator") && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-800"
                                    onClick={() => setEditingSewadar(sewadar._id)}
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {user?.role === "admin" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                      onClick={() => handleDeleteSewadar(sewadar._id)}
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
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
                {pagination.sewadars && pagination.sewadars.pages > 1 && (
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-6 space-y-4 md:space-y-0">
                    <div className="text-xs md:text-sm text-gray-600 text-center md:text-left">
                      Showing {(pagination.sewadars.page - 1) * pagination.sewadars.limit + 1} to{" "}
                      {Math.min(pagination.sewadars.page * pagination.sewadars.limit, pagination.sewadars.total)} of{" "}
                      {pagination.sewadars.total} results
                    </div>
                    <div className="flex justify-center md:justify-end">
                      <div className="flex space-x-1 md:space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.sewadars.page - 1)}
                          disabled={pagination.sewadars.page <= 1}
                          className="text-xs md:text-sm px-2 md:px-3"
                        >
                          <span className="hidden md:inline">Previous</span>
                          <span className="md:hidden">Prev</span>
                        </Button>
                        {Array.from({ length: Math.min(3, pagination.sewadars.pages) }, (_, i) => {
                          const page = i + 1
                          return (
                            <Button
                              key={page}
                              variant={page === pagination.sewadars.page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page)}
                              className="text-xs md:text-sm px-2 md:px-3 min-w-[32px] md:min-w-[40px]"
                            >
                              {page}
                            </Button>
                          )
                        })}
                        {pagination.sewadars.pages > 3 && (
                          <>
                            <span className="flex items-center text-gray-400 px-1">...</span>
                            <Button
                              variant={pagination.sewadars.pages === pagination.sewadars.page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pagination.sewadars.pages)}
                              className="text-xs md:text-sm px-2 md:px-3 min-w-[32px] md:min-w-[40px]"
                            >
                              {pagination.sewadars.pages}
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.sewadars.page + 1)}
                          disabled={pagination.sewadars.page >= pagination.sewadars.pages}
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

        {/* Modals */}
        <SewadarDetailModal
          sewadarId={viewingSewadar}
          isOpen={!!viewingSewadar}
          onClose={() => setViewingSewadar(null)}
        />

        <EditSewadarModal
          sewadarId={editingSewadar}
          isOpen={!!editingSewadar}
          onClose={() => setEditingSewadar(null)}
          onSuccess={() => {
            setEditingSewadar(null)
            refreshData()
          }}
        />
      </div>

      {/* Import Progress Modal */}
      <ImportProgressModal
        isOpen={importProgress.isOpen}
        onClose={handleImportProgressClose}
        jobId={importProgress.jobId}
      />
    </Layout>
  )
}
