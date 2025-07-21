"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
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
import { Upload, Search, Download, FileSpreadsheet, Users, Filter, Eye, X, RefreshCw, Edit, Trash2, MoreHorizontal } from "lucide-react"
import * as XLSX from "xlsx"
import SewadarDetailModal from "@/components/SewadarDetailModal"
import EditSewadarModal from "@/components/EditSewadarModal"
import { DEPARTMENTS } from "@/lib/constants"

export default function SewadarsPage() {
  const { user } = useAuth()
  const { sewadars, centers, importSewadars, fetchSewadars, loading, pagination } = useData()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCenter, setSelectedCenter] = useState("all")
  const [selectedDepartment, setSelectedDepartment] = useState("all")
  const [selectedGender, setSelectedGender] = useState("all")
  const [selectedBadgeStatus, setSelectedBadgeStatus] = useState("all")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showImportForm, setShowImportForm] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewingSewadar, setViewingSewadar] = useState<string | null>(null)
  const [editingSewadar, setEditingSewadar] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

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

    fetchSewadars(params)
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

    setIsImporting(true)
    const success = await importSewadars(file)
    setIsImporting(false)

    if (success) {
      setShowImportForm(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const downloadSampleExcel = () => {
    const sampleData = [
      {
        Badge_Number: "HI5228GA0001",
        Sewadar_Name: "SAMPLE SEWADAR",
        Father_Husband_Name: "FATHER NAME",
        DOB: "01-01-1990",
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

    try {
      const response = await fetch(`/api/sewadars/${sewadarId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Sewadar deleted successfully",
        })
        refreshData()
      } else {
        throw new Error("Failed to delete sewadar")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete sewadar",
        variant: "destructive",
      })
    }
  }

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6 px-2 md:px-0">
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage Sewadars</h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              {user?.role === "admin" ? `All Sewadars in ${user.area} Area` : `Sewadars from ${user?.centerName}`}
            </p>
          </div>
          {/* Mobile - More Actions Dropdown */}
          <div className="block md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full">
                  <MoreHorizontal className="mr-2 h-4 w-4" />
                  More Actions
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
          </div>
        </div>

        {/* Import Button and Form - Area Level Only */}
        {user?.role === "admin" && (
          <Card className="enhanced-card">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div>
                  <CardTitle className="flex items-center text-base md:text-lg">
                    <Upload className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                    Import Sewadars
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Import Sewadars from Excel file (.xlsx or .xls)
                  </CardDescription>
                </div>
                <div className="w-full md:w-auto">
                  <Button
                    onClick={() => setShowImportForm(!showImportForm)}
                    variant={showImportForm ? "secondary" : "default"}
                    className="w-full md:w-auto rssb-primary text-sm hover:bg-blue-700 active:bg-blue-800"
                    disabled={isImporting}
                    size="sm"
                  >
                    {showImportForm ? (
                      <>
                        <X className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                        <span className="hidden md:inline">Close Import</span>
                        <span className="md:hidden">Close</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                        <span className="hidden md:inline">Import Sewadars</span>
                        <span className="md:hidden">Import</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {showImportForm && (
              <CardContent className="space-y-4 pt-0 border-t">
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
                    disabled={isImporting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isImporting ? "Importing..." : "Choose Excel File"}
                  </Button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Import Guidelines:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use Badge_Number as unique identifier</li>
                    <li>• Existing records will be updated if Badge_Number matches</li>
                    <li>• Required columns: Badge_Number, Sewadar_Name, Centre</li>
                    <li>• Download sample file for correct format</li>
                  </ul>
                </div>
              </CardContent>
            )}
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
                            {center.name}
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
                          {dept}
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
                        {center.name}
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
                      {dept}
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
                  <p className="text-2xl font-bold text-gray-900">{pagination.sewadars?.total || sewadars.length}</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-xs">M</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">Male</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
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
                  <p className="text-2xl font-bold text-gray-900">
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
                  <p className="text-2xl font-bold text-gray-900">
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
                  <p className="text-2xl font-bold text-gray-900">{pagination.sewadars?.total || sewadars.length}</p>
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
                  <p className="text-2xl font-bold text-gray-900">
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
                  <p className="text-2xl font-bold text-gray-900">
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
                  <p className="text-2xl font-bold text-gray-900">
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
            <CardTitle className="flex items-center justify-between">
              <span>Sewadars ({pagination.sewadars?.total || sewadars.length})</span>
              <Badge variant="secondary" className="ml-2">
                {user?.area} Area
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
                      className={`p-4 border rounded-lg ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                    >
                      <div className="flex items-start justify-between mb-3">
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
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant={sewadar.gender === "MALE" ? "default" : "secondary"} className="text-xs">
                            {sewadar.gender}
                          </Badge>
                          <Badge variant={sewadar.badgeStatus === "PERMANENT" ? "default" : "outline"} className="text-xs">
                            {sewadar.badgeStatus}
                          </Badge>
                        </div>
                        
                        <div className="flex space-x-1">
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
                        <TableHead>Badge Number</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Father/Husband</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Center</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sewadars.map((sewadar, index) => (
                        <TableRow
                          key={sewadar._id}
                          className={index % 2 === 0 ? "bg-white" : "bg-gray-100"}
                        >
                          <TableCell className="font-mono text-sm font-medium">{sewadar.badgeNumber}</TableCell>
                          <TableCell className="font-medium">{sewadar.name}</TableCell>
                          <TableCell>{sewadar.fatherHusbandName}</TableCell>
                          <TableCell>
                            <Badge variant={sewadar.gender === "MALE" ? "default" : "secondary"}>
                              {sewadar.gender}
                            </Badge>
                          </TableCell>
                          <TableCell>{sewadar.center}</TableCell>
                          <TableCell>{sewadar.department}</TableCell>
                          <TableCell>{sewadar.contactNo}</TableCell>
                          <TableCell>
                            <Badge variant={sewadar.badgeStatus === "PERMANENT" ? "default" : "outline"}>
                              {sewadar.badgeStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
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
    </Layout>
  )
}
