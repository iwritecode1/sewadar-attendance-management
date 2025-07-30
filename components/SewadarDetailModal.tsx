"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/date-utils"
import {
  User,
  Phone,
  Calendar,
  MapPin,
  Building2,
  Briefcase,
  Users,
  Clock,
  RefreshCw,
  Download,
  FileText,
} from "lucide-react"
import type { Sewadar, AttendanceRecord } from "@/contexts/DataContext"

interface SewadarDetailModalProps {
  sewadarId: string | null
  isOpen: boolean
  onClose: () => void
}

export default function SewadarDetailModal({ sewadarId, isOpen, onClose }: SewadarDetailModalProps) {
  const { toast } = useToast()
  const [sewadar, setSewadar] = useState<Sewadar | null>(null)
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [attendanceLoading, setAttendanceLoading] = useState(false)

  useEffect(() => {
    if (sewadarId && isOpen) {
      fetchSewadarDetails()
      fetchAttendanceHistory()
    } else {
      // Reset state when modal closes
      setSewadar(null)
      setAttendanceHistory([])
    }
  }, [sewadarId, isOpen])

  const fetchSewadarDetails = async () => {
    if (!sewadarId) return

    setLoading(true)
    try {
      const response = await apiClient.getSewadar(sewadarId)
      if (response.success) {
        setSewadar(response.data as Sewadar)
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to fetch sewadar details",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to fetch sewadar details:", error)
      toast({
        title: "Error",
        description: "Failed to fetch sewadar details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceHistory = async () => {
    if (!sewadarId) return

    setAttendanceLoading(true)
    try {
      const response = await apiClient.getAttendanceReport({
        sewadarId,
        format: "json",
      })
      if (response.success) {
        const records = response.data?.records || []
        // Sort by event fromDate (most recent first)
        const sortedRecords = records.sort((a, b) => {
          const dateA = new Date(a.eventId?.fromDate || 0)
          const dateB = new Date(b.eventId?.fromDate || 0)
          return dateB.getTime() - dateA.getTime()
        })
        setAttendanceHistory(sortedRecords)
      }
    } catch (error) {
      console.error("Failed to fetch attendance history:", error)
      // Don't show error toast for attendance history as it's not critical
    } finally {
      setAttendanceLoading(false)
    }
  }

  const generateAttendanceReport = async () => {
    if (!sewadarId || !sewadar) return

    try {
      const response = await apiClient.getAttendanceReport({
        sewadarId,
        format: "csv",
      })

      if (response.success && response.data) {
        // For CSV format, the API returns the CSV string directly
        const csvContent = typeof response.data === 'string' ? response.data : convertToCSV(attendanceHistory)
        downloadCSV(csvContent, `${sewadar.badgeNumber}_attendance_report.csv`)

        toast({
          title: "Success",
          description: "Attendance report downloaded successfully",
        })
      } else {
        throw new Error(response.error || "Failed to generate report")
      }
    } catch (error) {
      console.error("Failed to generate attendance report:", error)
      toast({
        title: "Error",
        description: "Failed to generate attendance report",
        variant: "destructive",
      })
    }
  }

  const convertToCSV = (data: any[]) => {
    if (!data.length) return ""

    const headers = ["Event", "Department", "Date", "Center", "Submitted By", "Submitted At"]
    const rows = data.map((record) => [
      record.eventId?.place || "N/A",
      record.eventId?.department || "N/A",
      record.eventId?.fromDate ? formatDate(record.eventId.fromDate) : "N/A",
      record.centerName || "N/A",
      record.submittedBy?.name || "N/A",
      formatDate(record.submittedAt),
    ])

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
  }

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }



  const handleClose = () => {
    setSewadar(null)
    setAttendanceHistory([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-full p-4 md:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center text-lg md:text-xl">
            <User className="mr-2 h-4 w-4 md:h-5 md:w-5" />
            <span className="hidden md:inline">Sewadar Details</span>
            <span className="md:hidden">Details</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading sewadar details...</span>
          </div>
        ) : sewadar ? (
          <div className="space-y-6">
            {/* Basic Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Basic Information</span>
                  <div className="flex space-x-2">
                    <Badge variant={sewadar.gender === "MALE" ? "default" : "secondary"}>{sewadar.gender}</Badge>
                    <Badge variant={sewadar.badgeStatus === "PERMANENT" ? "default" : "outline"}>
                      {sewadar.badgeStatus}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Full Name</p>
                        <p className="font-medium">{sewadar.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Father/Husband Name</p>
                        <p className="font-medium">{sewadar.fatherHusbandName}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Date of Birth</p>
                        <p className="font-medium">{sewadar.dob}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Age</p>
                        <p className="font-medium">{sewadar.age || "Not specified"}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Contact Number</p>
                        <p className="font-medium">{sewadar.contactNo}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Badge Number</p>
                        <p className="font-mono font-medium">{sewadar.badgeNumber}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Building2 className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Center</p>
                        <p className="font-medium">{sewadar.center}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Briefcase className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Department</p>
                        <p className="font-medium">{sewadar.department}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Area</p>
                        <p className="font-medium">{sewadar.area}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {sewadar.emergencyContact && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-sm text-gray-600">Emergency Contact</p>
                        <p className="font-medium">{sewadar.emergencyContact}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance History */}
            <Card>
              <CardHeader>
                {/* Mobile Layout - Stacked */}
                <div className="block md:hidden space-y-3">
                  <div>
                    <CardTitle className="flex items-center text-base">
                      <Clock className="mr-2 h-4 w-4" />
                      Attendance History
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">Complete attendance record</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={fetchAttendanceHistory} disabled={attendanceLoading} className="flex-1">
                      <RefreshCw className={`mr-1 h-3 w-3 ${attendanceLoading ? "animate-spin" : ""}`} />
                      <span className="text-xs">Refresh</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={generateAttendanceReport} className="flex-1">
                      <Download className="mr-1 h-3 w-3" />
                      <span className="text-xs">Export</span>
                    </Button>
                  </div>
                </div>

                {/* Desktop Layout - Side by Side */}
                <div className="hidden md:flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Clock className="mr-2 h-5 w-5" />
                      Attendance History
                    </CardTitle>
                    <CardDescription>Complete attendance record for this sewadar</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={fetchAttendanceHistory} disabled={attendanceLoading}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${attendanceLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={generateAttendanceReport}>
                      <Download className="mr-2 h-4 w-4" />
                      Export Report
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {attendanceLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading attendance history...</span>
                  </div>
                ) : attendanceHistory.length > 0 ? (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-600">Total Events</p>
                            <p className="text-2xl font-bold text-blue-900">{attendanceHistory.length}</p>
                          </div>
                          <Users className="h-8 w-8 text-blue-600" />
                        </div>
                      </div>

                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-green-600">Total Attendance</p>
                            <p className="text-2xl font-bold text-green-900">
                              {attendanceHistory.reduce((totalDays, record) => {
                                if (!record.eventId?.fromDate || !record.eventId?.toDate) return totalDays
                                const fromDate = new Date(record.eventId.fromDate)
                                const toDate = new Date(record.eventId.toDate)
                                const diffTime = Math.abs(toDate.getTime() - fromDate.getTime())
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
                                return totalDays + diffDays
                              }, 0)}
                            </p>
                          </div>
                          <Users className="h-8 w-8 text-green-600" />
                        </div>
                      </div>

                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-purple-600">Last Event</p>
                            <p className="text-lg font-bold text-purple-900">
                              {attendanceHistory[0]?.eventId?.fromDate
                                ? new Date(attendanceHistory[0].eventId.fromDate).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit'
                                })
                                : "N/A"
                              }
                            </p>
                          </div>
                          <Calendar className="h-8 w-8 text-purple-600" />
                        </div>
                      </div>
                    </div>

                    {/* Mobile Card Layout for Attendance */}
                    <div className="block md:hidden space-y-3">
                      {attendanceHistory.map((record, index) => (
                        <div
                          key={record._id}
                          className={`p-4 border rounded-lg ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-medium text-gray-900 text-sm">
                                {record.eventId.place}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {record.eventId.department}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <p><span className="font-medium">From:</span> {formatDate(record.eventId.fromDate)}</p>
                              <p><span className="font-medium">To:</span> {formatDate(record.eventId.toDate)}</p>
                              <p><span className="font-medium">Submitted by:</span> {record.submittedBy.name}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table Layout for Attendance */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Place</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>From</TableHead>
                            <TableHead>To</TableHead>
                            <TableHead>Submitted By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceHistory.map((record, index) => (
                            <TableRow key={record._id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <TableCell className="font-medium">{record.eventId.place}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{record.eventId.department}</Badge>
                              </TableCell>
                              <TableCell>{formatDate(record.eventId.fromDate)}</TableCell>
                              <TableCell>{formatDate(record.eventId.toDate)}</TableCell>
                              <TableCell>{record.submittedBy.name}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No attendance records found for this sewadar</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <User className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p>Sewadar not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
