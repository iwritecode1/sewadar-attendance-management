"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useData } from "@/contexts/DataContext"
import { useAuth } from "@/contexts/AuthContext"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Edit, Calendar, Users, Search, X, Plus, Trash2, Building, UserMinus, UserPlus } from "lucide-react"
import SearchablePlaceSelect from "@/components/SearchablePlaceSelect"
import SearchableDepartmentSelect from "@/components/SearchableDepartmentSelect"
import { formatDate } from "@/lib/date-utils"

interface EditEventModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string | null
  onSuccess: () => void
}

export default function EditEventModal({ isOpen, onClose, eventId, onSuccess }: EditEventModalProps) {
  const { user } = useAuth()
  const { events, updateEvent, attendance, sewadars, centers, fetchAttendance, fetchSewadars } = useData()
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const [eventAttendance, setEventAttendance] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // Find the event to edit
  const eventToEdit = events.find(e => e._id === eventId)

  const [formData, setFormData] = useState({
    place: "",
    department: "",
    fromDate: "",
    toDate: "",
  })

  // Initialize form data when event changes
  useEffect(() => {
    if (eventToEdit) {
      setFormData({
        place: eventToEdit.place || "",
        department: eventToEdit.department || "",
        fromDate: eventToEdit.fromDate ? eventToEdit.fromDate.split('T')[0] : "",
        toDate: eventToEdit.toDate ? eventToEdit.toDate.split('T')[0] : "",
      })
    }
  }, [eventToEdit])

  // Fetch attendance records for this event
  useEffect(() => {
    if (eventId && isOpen) {
      const eventAttendanceRecords = attendance.filter(record => record.eventId._id === eventId)
      setEventAttendance(eventAttendanceRecords)
    }
  }, [eventId, isOpen, attendance])

  // Get all sewadars who attended this event
  const getEventSewadars = () => {
    const allSewadars: any[] = []

    eventAttendance.forEach(record => {
      // Add regular sewadars - these are IDs, so we need to look up the full sewadar details
      if (record.sewadars && Array.isArray(record.sewadars)) {
        record.sewadars.forEach((sewadarId: string) => {
          // Look up the full sewadar details from the sewadars array
          const fullSewadar = sewadars.find(s => s._id === sewadarId)
          if (fullSewadar) {
            allSewadars.push({
              ...fullSewadar,
              centerName: record.centerName,
              attendanceRecordId: record._id,
              isTemp: false
            })
          }
        })
      }

      // Add temporary sewadars - these should have full details
      if (record.tempSewadars && Array.isArray(record.tempSewadars)) {
        record.tempSewadars.forEach((tempSewadar: any) => {
          allSewadars.push({
            _id: tempSewadar.id || tempSewadar._id,
            name: tempSewadar.name,
            fatherHusbandName: tempSewadar.fatherName || tempSewadar.fatherHusbandName,
            badgeNumber: tempSewadar.tempBadge || tempSewadar.badgeNumber,
            department: tempSewadar.department || 'N/A',
            gender: tempSewadar.gender,
            age: tempSewadar.age,
            phone: tempSewadar.phone,
            centerName: record.centerName,
            attendanceRecordId: record._id,
            isTemp: true
          })
        })
      }
    })

    return allSewadars
  }

  const eventSewadars = getEventSewadars()

  // Filter sewadars based on search
  const filteredEventSewadars = eventSewadars.filter(sewadar => {
    const name = sewadar.name || sewadar.centerName || ''
    const badgeNumber = sewadar.badgeNumber || ''
    const centerName = sewadar.centerName || ''

    return name.toLowerCase().includes(searchTerm?.toLowerCase() || '') ||
      badgeNumber.toLowerCase().includes(searchTerm?.toLowerCase() || '') ||
      centerName.toLowerCase().includes(searchTerm?.toLowerCase() || '')
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.place || !formData.department || !formData.fromDate || !formData.toDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (new Date(formData.fromDate) > new Date(formData.toDate)) {
      toast({
        title: "Error",
        description: "From date cannot be after to date",
        variant: "destructive",
      })
      return
    }

    if (!eventId) return

    setIsSubmitting(true)
    try {
      const success = await updateEvent(eventId, formData)
      if (success) {
        onSuccess()
        onClose()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveSewadar = async (attendanceRecordId: string, sewadarId: string, isTemp: boolean) => {
    if (!confirm("Are you sure you want to remove this sewadar from the event?")) {
      return
    }

    try {
      // Find the attendance record
      const attendanceRecord = eventAttendance.find(record => record._id === attendanceRecordId)
      if (!attendanceRecord) return

      let updatedSewadarIds: string[] = []
      let updatedTempSewadars: any[] = []

      if (isTemp) {
        // Remove from temp sewadars - attendanceRecord.sewadars contains IDs
        updatedSewadarIds = [...attendanceRecord.sewadars]
        updatedTempSewadars = (attendanceRecord.tempSewadars || []).filter((ts: any) => 
          (ts.id || ts._id) !== sewadarId
        )
      } else {
        // Remove from regular sewadars - attendanceRecord.sewadars contains IDs
        updatedSewadarIds = attendanceRecord.sewadars.filter((id: string) => id !== sewadarId)
        updatedTempSewadars = [...(attendanceRecord.tempSewadars || [])]
      }

      // Check if this would leave the attendance record empty
      const wouldBeEmpty = updatedSewadarIds.length === 0 && updatedTempSewadars.length === 0

      if (wouldBeEmpty) {
        // If removing this sewadar would leave the attendance record empty, delete the entire record
        if (!confirm("This will remove the last participant from this center's attendance record, which will delete the entire attendance record. Continue?")) {
          return
        }

        const response = await fetch(`/api/attendance/${attendanceRecordId}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          toast({
            title: "Success",
            description: "Attendance record deleted successfully (no participants remaining)",
          })
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to delete attendance record")
        }
      } else {
        // Update the attendance record with remaining participants
        const formData = new FormData()
        
        // Add sewadar IDs
        updatedSewadarIds.forEach(id => {
          formData.append('sewadarIds[]', id)
        })
        
        // Add temp sewadars as JSON string
        formData.append('tempSewadars', JSON.stringify(updatedTempSewadars))

        const response = await fetch(`/api/attendance/${attendanceRecordId}`, {
          method: 'PUT',
          body: formData,
        })

        if (response.ok) {
          toast({
            title: "Success",
            description: "Sewadar removed from event successfully",
          })
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to update attendance record")
        }
      }

      // Refresh attendance data
      await fetchAttendance()
      onSuccess()

    } catch (error: any) {
      console.error("Remove sewadar error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove sewadar from event",
        variant: "destructive",
      })
    }
  }

  if (!eventToEdit) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="mr-2 h-5 w-5" />
            Edit Sewa Event
          </DialogTitle>
          <DialogDescription>
            Update event details and manage participants for "{eventToEdit.place} - {eventToEdit.department}"
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details" className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              Event Details
            </TabsTrigger>
            <TabsTrigger value="participants" className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              Participants ({eventSewadars.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Place <span className="text-red-500">*</span>
                  </label>
                  <SearchablePlaceSelect
                    value={formData.place}
                    onValueChange={(value) => setFormData({ ...formData, place: value })}
                    placeholder="Search or add place"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <SearchableDepartmentSelect
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                    placeholder="Search or add department"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.fromDate}
                    onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.toDate}
                    onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Show event stats if available */}
              {eventToEdit.stats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Event Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{eventSewadars.length}</div>
                        <div className="text-blue-700">Total Sewadars</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{eventToEdit.stats.centersParticipated || 0}</div>
                        <div className="text-green-700">Centers</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rssb-primary">
                  {isSubmitting ? "Updating..." : "Update Event"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="participants" className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search participants by name, badge number, or center"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Participants List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Event Participants</span>
                  <Badge variant="secondary">{filteredEventSewadars.length} of {eventSewadars.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Manage sewadars participating in this event
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredEventSewadars.length > 0 ? (
                  <div className="space-y-3">
                    {filteredEventSewadars.map((sewadar) => (
                      <div
                        key={`${sewadar.attendanceRecordId}-${sewadar._id}`}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {sewadar.name || 'Unknown Name'}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {sewadar.fatherHusbandName || sewadar.fatherName || 'Unknown Father/Husband'}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {sewadar.badgeNumber || sewadar.tempBadge || 'No Badge'}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                <Building className="h-3 w-3 mr-1" />
                                {sewadar.centerName || 'Unknown Center'}
                              </Badge>
                              {sewadar.isTemp && (
                                <Badge variant="destructive" className="text-xs">
                                  Temporary
                                </Badge>
                              )}
                            </div>

                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          onClick={() => handleRemoveSewadar(sewadar.attendanceRecordId, sewadar._id, sewadar.isTemp)}
                          title="Remove from event"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? "No participants found matching your search" : "No participants in this event"}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance Records Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attendance Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {eventAttendance.map((record) => (
                    <div key={record._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{record.centerName}</span>
                        <span className="text-sm text-gray-600 ml-2">
                          ({record.sewadars.length + (record.tempSewadars?.length || 0)} participants)
                        </span>
                      </div>
                      <Badge variant="outline">
                        {formatDate(record.submittedAt)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}