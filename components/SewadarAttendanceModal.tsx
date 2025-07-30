"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Download, RefreshCw, FileText, User, X } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { formatDate } from "@/lib/date-utils"

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

interface SewadarAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  sewadar: Sewadar | null
}

export default function SewadarAttendanceModal({ isOpen, onClose, sewadar }: SewadarAttendanceModalProps) {
  const { toast } = useToast()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Fetch attendance when modal opens
  useEffect(() => {
    if (isOpen && sewadar) {
      fetchAttendance()
    }
  }, [isOpen, sewadar])

  const fetchAttendance = async () => {
    if (!sewadar) return

    setIsLoadingAttendance(true)
    try {
      const response = await apiClient.getAttendanceReport({
        sewadarId: sewadar._id,
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
        setAttendanceRecords(sortedRecords)
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
    if (!sewadar) return

    setIsExporting(true)
    try {
      const response = await apiClient.getAttendanceReport({
        sewadarId: sewadar._id,
        format: "csv",
      })

      if (response.success && response.data) {
        const blob = new Blob([response.data], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${sewadar.badgeNumber}_attendance_report.csv`
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

  // Calculate attendance statistics
  const attendanceStats = sewadar && attendanceRecords.length > 0
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

  if (!sewadar) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto mx-2 md:mx-auto">
        <DialogHeader className="pb-4">
          {/* Mobile Header */}
          <div className="block md:hidden">
            <div className="flex items-center justify-between mb-2">
              <DialogTitle className="text-lg font-semibold truncate pr-2">
                {sewadar.name}
              </DialogTitle>
              {/* <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
                <X className="h-4 w-4" />
              </Button> */}
            </div>
            <div className="text-sm font-mono text-gray-600 mb-1">
              {sewadar.badgeNumber}
            </div>
            <DialogDescription className="text-sm">
              {sewadar.center}
            </DialogDescription>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                <div>
                  <span>{sewadar.name}</span>
                  <span className="ml-2 text-sm font-mono text-gray-600">({sewadar.badgeNumber})</span>
                </div>
              </div>
              {/* <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button> */}
            </DialogTitle>
            <DialogDescription>
              Attendance records for {sewadar.name} from {sewadar.center}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Stats */}
          {attendanceStats && (
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div className="text-center p-3 md:p-4 bg-blue-50 rounded-lg">
                <div className="text-xl md:text-2xl font-bold text-blue-600">{attendanceStats.totalEvents}</div>
                <div className="text-xs md:text-sm text-blue-800">Events</div>
              </div>
              <div className="text-center p-3 md:p-4 bg-green-50 rounded-lg">
                <div className="text-xl md:text-2xl font-bold text-green-600">{attendanceStats.totalDays}</div>
                <div className="text-xs md:text-sm text-green-800">Days</div>
              </div>
              <div className="text-center p-3 md:p-4 bg-purple-50 rounded-lg">
                <div className="text-lg md:text-xl font-bold text-purple-600">
                  {attendanceRecords[0]?.eventId?.fromDate
                    ? new Date(attendanceRecords[0].eventId.fromDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit'
                    })
                    : "N/A"
                  }
                </div>
                <div className="text-xs md:text-sm text-purple-800">Last Event</div>
              </div>
            </div>
          )}

          {/* Export Button */}
          <Button
            onClick={handleExportAttendance}
            disabled={isExporting || attendanceRecords.length === 0}
            className="w-full rssb-primary text-sm"
          >
            {isExporting ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            <span className="hidden sm:inline">{isExporting ? "Exporting..." : "Export CSV"}</span>
            <span className="sm:hidden">{isExporting ? "..." : "Export"}</span>
          </Button>

          {/* Attendance Records */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Calendar className="mr-2 h-4 w-4" />
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
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {attendanceRecords.map((record) => (
                    <div key={record._id} className="p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm">{record.eventId?.place || 'N/A'}</h4>
                        <Badge variant="outline" className="text-xs">
                          {record.eventId?.fromDate ? formatDate(record.eventId.fromDate) : 'Invalid Date'}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        <span className="font-medium">{record.eventId?.department || 'N/A'}</span>
                      </div>
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
      </DialogContent>
    </Dialog>
  )
}