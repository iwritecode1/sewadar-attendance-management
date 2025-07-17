"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import {
  User,
  Phone,
  Calendar,
  MapPin,
  Building,
  Users,
  Download,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react"
import * as XLSX from "xlsx"

interface Sewadar {
  _id: string
  badgeNumber: string
  name: string
  fatherHusbandName: string
  dob: string
  gender: string
  badgeStatus: string
  zone: string
  area: string
  center: string
  department: string
  contactNo: string
  emergencyContact: string
  createdAt: string
  updatedAt: string
}

interface AttendanceRecord {
  _id: string
  eventName: string
  eventDate: string
  status: "present" | "absent"
  markedBy: string
  markedAt: string
}

interface SewadarDetailModalProps {
  sewadarId: string | null
  isOpen: boolean
  onClose: () => void
}

export default function SewadarDetailModal({ sewadarId, isOpen, onClose }: SewadarDetailModalProps) {
  const [sewadar, setSewadar] = useState<Sewadar | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (sewadarId && isOpen) {
      fetchSewadarDetails()
      fetchAttendanceHistory()
    }
  }, [sewadarId, isOpen])

  const fetchSewadarDetails = async () => {
    if (!sewadarId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/sewadars/${sewadarId}`)
      if (response.ok) {
        const data = await response.json()
        setSewadar(data)
      } else {
        throw new Error("Failed to fetch sewadar details")
      }
    } catch (error) {
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
      const response = await fetch(`/api/attendance?sewadarId=${sewadarId}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setAttendanceRecords(data.records || [])
      } else {
        throw new Error("Failed to fetch attendance history")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch attendance history",
        variant: "destructive",
      })
    } finally {
      setAttendanceLoading(false)
    }
  }

  const exportAttendanceReport = () => {
    if (!sewadar || attendanceRecords.length === 0) return

    const exportData = attendanceRecords.map((record) => ({
      Event_Name: record.eventName,
      Event_Date: new Date(record.eventDate).toLocaleDateString(),
      Status: record.status.toUpperCase(),
      Marked_By: record.markedBy,
      Marked_At: new Date(record.markedAt).toLocaleString(),
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Attendance")
    XLSX.writeFile(wb, `${sewadar.name}_attendance_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  const attendanceStats = {
    total: attendanceRecords.length,
    present: attendanceRecords.filter((r) => r.status === "present").length,
    absent: attendanceRecords.filter((r) => r.status === "absent").length,
    percentage:
      attendanceRecords.length > 0
        ? Math.round((attendanceRecords.filter((r) => r.status === "present").length / attendanceRecords.length) * 100)
        : 0,
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Sewadar Details</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading sewadar details...</span>
          </div>
        ) : sewadar ? (
          <div className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Badge Number:</span>
                      <span className="font-mono">{sewadar.badgeNumber}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Name:</span>
                      <span>{sewadar.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Father/Husband:</span>
                      <span>{sewadar.fatherHusbandName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Date of Birth:</span>
                      <span>{sewadar.dob}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Gender:</span>
                      <Badge variant={sewadar.gender === "MALE" ? "default" : "secondary"}>{sewadar.gender}</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Badge Status:</span>
                      <Badge variant={sewadar.badgeStatus === "PERMANENT" ? "default" : "outline"}>
                        {sewadar.badgeStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Contact:</span>
                      <span>{sewadar.contactNo}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Emergency:</span>
                      <span>{sewadar.emergencyContact}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Zone:</span>
                      <span>{sewadar.zone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Area:</span>
                      <span>{sewadar.area}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Center:</span>
                      <span>{sewadar.center}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Department:</span>
                      <span>{sewadar.department}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Statistics */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Attendance Statistics</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportAttendanceReport}
                    disabled={attendanceRecords.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{attendanceStats.total}</div>
                    <div className="text-sm text-gray-600">Total Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{attendanceStats.present}</div>
                    <div className="text-sm text-gray-600">Present</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{attendanceStats.absent}</div>
                    <div className="text-sm text-gray-600">Absent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{attendanceStats.percentage}%</div>
                    <div className="text-sm text-gray-600">Attendance Rate</div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Recent Attendance Records */}
                <div className="space-y-2">
                  <h4 className="font-medium">Recent Attendance Records</h4>
                  {attendanceLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">Loading attendance...</span>
                    </div>
                  ) : attendanceRecords.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {attendanceRecords.slice(0, 10).map((record) => (
                        <div key={record._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {record.status === "present" ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            <div>
                              <div className="font-medium">{record.eventName}</div>
                              <div className="text-sm text-gray-600">
                                {new Date(record.eventDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={record.status === "present" ? "default" : "destructive"}>
                              {record.status.toUpperCase()}
                            </Badge>
                            <div className="text-xs text-gray-500 mt-1">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {new Date(record.markedAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No attendance records found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">Sewadar not found</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
