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
import { Edit, Calendar, Users, Search, UserMinus } from "lucide-react"
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
  const { events, updateEvent, attendance, sewadars, fetchAttendance, fetchSewadars, refreshEvents } = useData()
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

      // Ensure sewadars are fetched if we have attendance records but no sewadars
      if (eventAttendanceRecords.length > 0 && sewadars.length === 0) {
        fetchSewadars()
      }
    }
  }, [eventId, isOpen, attendance, sewadars.length, fetchSewadars])

  // Get all sewadars who attended this event
  const getEventSewadars = () => {
    const allSewadars: any[] = []

    eventAttendance.forEach(record => {
      // Add regular sewadars - these could be IDs or full objects
      if (record.sewadars && Array.isArray(record.sewadars)) {
        record.sewadars.forEach((sewadarItem: any) => {
          // Handle both cases: sewadarItem could be a string ID or a full sewadar object
          let sewadarId: string
          let fullSewadar: any = null

          if (typeof sewadarItem === 'string') {
            // It's an ID, look up the full sewadar details
            sewadarId = sewadarItem
            fullSewadar = sewadars.find(s => s._id === sewadarId)
          } else if (sewadarItem && typeof sewadarItem === 'object' && sewadarItem._id) {
            // It's already a full sewadar object
            sewadarId = sewadarItem._id
            fullSewadar = sewadarItem
          } else {
            console.warn('Invalid sewadar item in attendance record:', sewadarItem)
            return
          }

          if (fullSewadar) {
            allSewadars.push({
              ...fullSewadar,
              centerName: record.centerName,
              attendanceRecordId: record._id,
              isTemp: false
            })
          } else {
            // If sewadar details not found, create a placeholder with available info
            console.warn(`Sewadar with ID ${sewadarId} not found in sewadars array`)
            const shortId = sewadarId && typeof sewadarId === 'string' ? sewadarId.slice(-6) : 'Unknown'
            allSewadars.push({
              _id: sewadarId,
              name: `Unknown Sewadar (${shortId})`,
              fatherHusbandName: 'Unknown',
              badgeNumber: 'Unknown',
              centerName: record.centerName,
              attendanceRecordId: record._id,
              isTemp: false,
              gender: 'MALE',
              badgeStatus: 'UNKNOWN'
            })
          }
        })
      }

      // Handle temporary sewadars if they exist in the record
      if (record.tempSewadars && Array.isArray(record.tempSewadars)) {
        record.tempSewadars.forEach((tempSewadar: any) => {
          allSewadars.push({
            ...tempSewadar,
            _id: tempSewadar._id || `temp-${Date.now()}-${Math.random()}`,
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

  const handleRemoveSewadar = async (attendanceRecordId: string, sewadarId: string) => {
    if (!confirm("Are you sure you want to remove this sewadar from the event?")) {
      return
    }

    try {
      // Find the attendance record
      const attendanceRecord = eventAttendance.find(record => record._id === attendanceRecordId)
      if (!attendanceRecord) return

      // Remove from sewadars - handle both string IDs and full objects
      const updatedSewadarIds = attendanceRecord.sewadars.filter((item: any) => {
        // Handle both cases: item could be a string ID or a full sewadar object
        const itemId = typeof item === 'string' ? item : (item && item._id ? item._id : null)
        return itemId !== sewadarId
      }).map((item: any) => {
        // Ensure we return string IDs for the API call
        return typeof item === 'string' ? item : (item && item._id ? item._id : item)
      })

      // Check if this would leave the attendance record empty
      const wouldBeEmpty = updatedSewadarIds.length === 0

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

        // Add sewadar IDs - ensure they are strings
        updatedSewadarIds.forEach(id => {
          const stringId = typeof id === 'string' ? id : String(id)
          if (stringId && stringId !== 'null' && stringId !== 'undefined') {
            formData.append('sewadarIds[]', stringId)
          }
        })

        // Add empty temp sewadars (no longer used)
        formData.append('tempSewadars', JSON.stringify([]))

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
      // Refresh events data to update participant counts on the events page
      // This will update the events list without closing the modal
      await refreshEvents({ includeStats: true })

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
                placeholder="Search participants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>

            {/* Participants List */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm md:text-base">
                  <span>Event Participants</span>
                  <Badge variant="secondary" className="text-xs">{filteredEventSewadars.length} of {eventSewadars.length}</Badge>
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Manage sewadars participating in this event
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {filteredEventSewadars.length > 0 ? (
                  <div className="space-y-3">
                    {filteredEventSewadars.map((sewadar) => (
                      <div
                        key={`${sewadar.attendanceRecordId}-${sewadar._id}`}
                        className="relative p-4 border rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all duration-200"
                      >
                        {/* Header row with name and remove button */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg text-gray-900 leading-tight">
                              {sewadar.name || 'Unknown Name'}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                              {sewadar.fatherHusbandName || sewadar.fatherName || 'Unknown Father/Husband'}
                            </p>
                          </div>

                          {/* Remove button in place of gender */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 w-8 h-8 p-0 ml-2"
                            onClick={() => handleRemoveSewadar(sewadar.attendanceRecordId, sewadar._id)}
                            title="Remove from event"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Badge number and center - responsive layout */}
                        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                          {/* Badge number */}
                          <div className="bg-gray-100 rounded-lg p-2 md:p-2 mb-3 md:mb-0 md:flex-1">
                            <div className="text-center font-medium text-gray-900 text-sm md:text-sm">
                              {sewadar.badgeNumber || sewadar.tempBadge || 'No Badge'}
                            </div>
                          </div>

                          {/* Center */}
                          <div className="bg-blue-100 rounded-lg p-2 md:p-2 md:flex-1">
                            <div className="text-center font-medium text-blue-900 text-sm md:text-sm">
                              {sewadar.centerName || 'Unknown Center'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 md:py-8 text-gray-500 text-sm">
                    {searchTerm ? "No participants found matching your search" : "No participants in this event"}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance Records Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm md:text-base">Attendance Records</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {eventAttendance.map((record) => (
                    <div key={record._id} className="relative p-3 bg-gray-50 rounded-lg">
                      {/* Date in top right */}
                      <Badge variant="outline" className="absolute top-2 right-2 text-xs">
                        {formatDate(record.submittedAt)}
                      </Badge>

                      {/* Main content */}
                      <div className="pr-20">
                        <div className="font-medium text-base">{record.centerName}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {record.sewadars.length} participant{record.sewadars.length !== 1 ? 's' : ''}
                        </div>
                      </div>
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