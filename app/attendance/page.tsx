"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import Layout from "@/components/Layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Plus, Upload, Users, Clock, Camera, Search, X, UserPlus, FileImage, Building2 } from "lucide-react"

const validateImageFile = (file: File): boolean => {
  const validTypes = ["image/jpeg", "image/jpg", "image/png"]
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (!validTypes.includes(file.type)) {
    return false
  }

  if (file.size > maxSize) {
    return false
  }

  return true
}

const handleImageUpload = (files: FileList | null, setImages: (images: File[]) => void, toast: any) => {
  if (!files) return

  const validFiles: File[] = []
  const invalidFiles: string[] = []

  Array.from(files).forEach((file) => {
    if (validateImageFile(file)) {
      validFiles.push(file)
    } else {
      invalidFiles.push(file.name)
    }
  })

  if (invalidFiles.length > 0) {
    toast({
      title: "Invalid Files",
      description: `Some files were rejected: ${invalidFiles.join(", ")}. Please ensure files are images under 5MB.`,
      variant: "destructive",
    })
  }

  if (validFiles.length > 0) {
    setImages(validFiles)
    toast({
      title: "Success",
      description: `${validFiles.length} image(s) uploaded successfully`,
    })
  }
}

export default function AttendancePage() {
  const { user } = useAuth()
  const {
    events,
    centers,
    places,
    departments,
    getSewadarsForCenter,
    createEvent,
    createAttendance,
    addPlace,
    addDepartment,
    loading,
  } = useData()
  const { toast } = useToast()

  const [selectedEvent, setSelectedEvent] = useState("")
  const [selectedCenter, setSelectedCenter] = useState(user?.role === "coordinator" ? user.centerId || "" : "")
  const [newEvent, setNewEvent] = useState({
    place: "",
    department: "",
    fromDate: "",
    toDate: "",
  })
  const [newPlace, setNewPlace] = useState("")
  const [newDepartment, setNewDepartment] = useState("")
  const [selectedSewadars, setSelectedSewadars] = useState<string[]>([])
  const [tempSewadars, setTempSewadars] = useState([
    {
      name: "",
      fatherName: "",
      age: "",
      gender: "MALE" as "MALE" | "FEMALE",
      phone: "",
    },
  ])
  const [showNewEventForm, setShowNewEventForm] = useState(false)
  const [showNewPlaceForm, setShowNewPlaceForm] = useState(false)
  const [showNewDepartmentForm, setShowNewDepartmentForm] = useState(false)

  // Searchable dropdown states
  const [sewadarSearch, setSewadarSearch] = useState("")
  const [showSewadarDropdown, setShowSewadarDropdown] = useState(false)

  const [showTempSewadarForm, setShowTempSewadarForm] = useState(false)
  const [nominalRollImages, setNominalRollImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get sewadars based on user role and selected center
  const getAvailableSewadars = () => {
    if (user?.role === "admin") {
      return selectedCenter ? getSewadarsForCenter(selectedCenter) : []
    } else {
      return user?.centerId ? getSewadarsForCenter(user.centerId) : []
    }
  }

  const availableSewadars = getAvailableSewadars()

  // Filter sewadars based on search
  const filteredSewadars = availableSewadars.filter(
    (sewadar) =>
      sewadar.name.toLowerCase().includes(sewadarSearch.toLowerCase()) ||
      sewadar.badgeNumber.toLowerCase().includes(sewadarSearch.toLowerCase()) ||
      sewadar.department.toLowerCase().includes(sewadarSearch.toLowerCase()),
  )

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const success = await createEvent(newEvent)
    if (success) {
      // Find the newly created event and select it
      const newEventId = events.find(
        (e) =>
          e.place === newEvent.place &&
          e.department === newEvent.department &&
          e.fromDate === newEvent.fromDate &&
          e.toDate === newEvent.toDate,
      )?._id

      if (newEventId) {
        setSelectedEvent(newEventId)
      }

      setShowNewEventForm(false)
      setNewEvent({
        place: "",
        department: "",
        fromDate: "",
        toDate: "",
      })
    }
  }

  const handlePlaceSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPlace.trim()) {
      addPlace(newPlace.trim())
      setNewEvent((prev) => ({ ...prev, place: newPlace.trim() }))
      setNewPlace("")
      setShowNewPlaceForm(false)
      toast({
        title: "Success",
        description: "New place added successfully",
      })
    }
  }

  const handleDepartmentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newDepartment.trim()) {
      addDepartment(newDepartment.trim())
      setNewEvent((prev) => ({ ...prev, department: newDepartment.trim() }))
      setNewDepartment("")
      setShowNewDepartmentForm(false)
      toast({
        title: "Success",
        description: "New department added successfully",
      })
    }
  }

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validation for mandatory fields
    if (!selectedEvent) {
      toast({
        title: "Error",
        description: "Please select or create a sewa event",
        variant: "destructive",
      })
      return
    }

    if (selectedSewadars.length === 0 && tempSewadars.every((ts) => !ts.name)) {
      toast({
        title: "Error",
        description: "Please select at least one sewadar or add temporary sewadars",
        variant: "destructive",
      })
      return
    }

    if (nominalRollImages.length === 0) {
      toast({
        title: "Error",
        description: "Nominal roll images are required for attendance submission",
        variant: "destructive",
      })
      return
    }

    // For admin users, ensure a center is selected
    if (user.role === "admin" && !selectedCenter) {
      toast({
        title: "Error",
        description: "Please select a center for attendance submission",
        variant: "destructive",
      })
      return
    }

    const processedTempSewadars = tempSewadars
      .filter((ts) => ts.name && ts.fatherName)
      .map((ts, index) => ({
        id: `temp-${Date.now()}-${index}`,
        name: ts.name,
        fatherName: ts.fatherName,
        age: Number.parseInt(ts.age) || 0,
        gender: ts.gender,
        phone: ts.phone,
        tempBadge: `T${selectedCenter || user.centerId}${ts.gender === "MALE" ? "GA" : "LA"}${String(index + 1).padStart(4, "0")}`,
      }))

    const selectedCenterData = centers.find((c) => c._id === selectedCenter)

    const attendanceData = {
      eventId: selectedEvent,
      centerId: selectedCenter || user.centerId || "",
      centerName: selectedCenterData?.name || user.centerName || "",
      sewadarIds: selectedSewadars,
      tempSewadars: processedTempSewadars,
      nominalRollImages,
    }

    setIsSubmitting(true)
    const success = await createAttendance(attendanceData)
    setIsSubmitting(false)

    if (success) {
      // Reset form
      setSelectedEvent("")
      setSelectedSewadars([])
      setTempSewadars([{ name: "", fatherName: "", age: "", gender: "MALE", phone: "" }])
      setSewadarSearch("")
      setNominalRollImages([])
      setShowTempSewadarForm(false)
    }
  }

  const addTempSewadar = () => {
    setTempSewadars([...tempSewadars, { name: "", fatherName: "", age: "", gender: "MALE", phone: "" }])
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

  const toggleSewadarSelection = (sewadarId: string) => {
    if (selectedSewadars.includes(sewadarId)) {
      setSelectedSewadars(selectedSewadars.filter((id) => id !== sewadarId))
    } else {
      setSelectedSewadars([...selectedSewadars, sewadarId])
    }
  }

  const removeSelectedSewadar = (sewadarId: string) => {
    setSelectedSewadars(selectedSewadars.filter((id) => id !== sewadarId))
  }

  const getSelectedSewadarDetails = () => {
    return availableSewadars.filter((sewadar) => selectedSewadars.includes(sewadar._id))
  }

  const handleCenterChange = (centerId: string) => {
    setSelectedCenter(centerId)
    // Clear selected sewadars when center changes
    setSelectedSewadars([])
    setSewadarSearch("")
    setShowSewadarDropdown(false)
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add Attendance</h1>
          <p className="text-gray-600 mt-1">Submit attendance for sewa events</p>
        </div>

        {/* Center Selection for Area Coordinators */}
        {user?.role === "admin" && (
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="mr-2 h-5 w-5" />
                Select Center *
              </CardTitle>
              <CardDescription>Choose the center for which you want to add attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="center">Center *</Label>
                  <Select value={selectedCenter} onValueChange={handleCenterChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a center" />
                    </SelectTrigger>
                    <SelectContent>
                      {centers.map((center) => (
                        <SelectItem key={center._id} value={center._id}>
                          {center.name} ({center.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCenter && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">
                          Selected Center: {centers.find((c) => c._id === selectedCenter)?.name}
                        </p>
                        <p className="text-sm text-blue-700">Available Sewadars: {availableSewadars.length}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Event Selection/Creation - Only show if center is selected for admin or always for coordinator */}
        {(user?.role === "coordinator" || (user?.role === "admin" && selectedCenter)) && (
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Select or Create Event *
              </CardTitle>
              <CardDescription>Choose an existing event or create a new one</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="event">Select Event *</Label>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event._id} value={event._id}>
                        {event.place} - {event.department} ({event.fromDate} to {event.toDate})
                      </SelectItem>
                    ))}
                    <SelectItem value="new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Event
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedEvent === "new" && (
                <div className="form-section bg-blue-50 border border-blue-200">
                  <h3 className="text-lg font-medium text-blue-900 mb-4">Create New Event</h3>
                  <form onSubmit={handleEventSubmit} className="space-y-4">
                    <div className="form-grid">
                      <div>
                        <Label htmlFor="place">Place *</Label>
                        <div className="flex space-x-2 mt-1">
                          <Select
                            value={newEvent.place}
                            onValueChange={(value) => {
                              if (value === "add-new") {
                                setShowNewPlaceForm(true)
                              } else {
                                setNewEvent((prev) => ({ ...prev, place: value }))
                              }
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select or add place" />
                            </SelectTrigger>
                            <SelectContent>
                              {places.map((place) => (
                                <SelectItem key={place} value={place}>
                                  {place}
                                </SelectItem>
                              ))}
                              <SelectItem value="add-new">
                                <Plus className="mr-2 h-4 w-4" />
                                Add New Place
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {showNewPlaceForm && (
                          <div className="mt-2 p-3 bg-white border rounded-lg">
                            <form onSubmit={handlePlaceSubmit} className="flex space-x-2">
                              <Input
                                value={newPlace}
                                onChange={(e) => setNewPlace(e.target.value)}
                                placeholder="Enter new place"
                                className="flex-1"
                              />
                              <Button type="submit" size="sm" className="rssb-primary">
                                Add
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setShowNewPlaceForm(false)}
                              >
                                Cancel
                              </Button>
                            </form>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="department">Department *</Label>
                        <div className="flex space-x-2 mt-1">
                          <Select
                            value={newEvent.department}
                            onValueChange={(value) => {
                              if (value === "add-new") {
                                setShowNewDepartmentForm(true)
                              } else {
                                setNewEvent((prev) => ({ ...prev, department: value }))
                              }
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select or add department" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map((dept) => (
                                <SelectItem key={dept} value={dept}>
                                  {dept}
                                </SelectItem>
                              ))}
                              <SelectItem value="add-new">
                                <Plus className="mr-2 h-4 w-4" />
                                Add New Department
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {showNewDepartmentForm && (
                          <div className="mt-2 p-3 bg-white border rounded-lg">
                            <form onSubmit={handleDepartmentSubmit} className="flex space-x-2">
                              <Input
                                value={newDepartment}
                                onChange={(e) => setNewDepartment(e.target.value)}
                                placeholder="Enter new department"
                                className="flex-1"
                              />
                              <Button type="submit" size="sm" className="rssb-primary">
                                Add
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setShowNewDepartmentForm(false)}
                              >
                                Cancel
                              </Button>
                            </form>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="fromDate">From Date *</Label>
                        <Input
                          id="fromDate"
                          type="date"
                          value={newEvent.fromDate}
                          onChange={(e) => setNewEvent((prev) => ({ ...prev, fromDate: e.target.value }))}
                          required
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="toDate">To Date *</Label>
                        <Input
                          id="toDate"
                          type="date"
                          value={newEvent.toDate}
                          onChange={(e) => setNewEvent((prev) => ({ ...prev, toDate: e.target.value }))}
                          required
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <Button type="submit" className="rssb-primary" disabled={loading.events}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {loading.events ? "Creating..." : "Create Event"}
                    </Button>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedEvent &&
          selectedEvent !== "new" &&
          (user?.role === "coordinator" || (user?.role === "admin" && selectedCenter)) && (
            <form onSubmit={handleAttendanceSubmit} className="space-y-6">
              {/* Searchable Sewadar Selection */}
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Select Sewadars *
                  </CardTitle>
                  <CardDescription>
                    Search and select sewadars from{" "}
                    {user?.role === "admin" ? centers.find((c) => c._id === selectedCenter)?.name : user?.centerName} (
                    {availableSewadars.length} available)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search sewadars by name, badge number, or department..."
                      value={sewadarSearch}
                      onChange={(e) => {
                        setSewadarSearch(e.target.value)
                        setShowSewadarDropdown(true)
                      }}
                      onFocus={() => setShowSewadarDropdown(true)}
                      className="pl-10"
                    />
                  </div>

                  {/* Searchable Dropdown */}
                  {showSewadarDropdown && sewadarSearch && (
                    <div className="relative">
                      <div className="absolute top-0 left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredSewadars.length > 0 ? (
                          filteredSewadars.map((sewadar) => (
                            <div
                              key={sewadar._id}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              onClick={() => {
                                if (!selectedSewadars.includes(sewadar._id)) {
                                  toggleSewadarSelection(sewadar._id)
                                }
                                setSewadarSearch("")
                                setShowSewadarDropdown(false)
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{sewadar.name}</p>
                                  <p className="text-sm text-gray-600 font-mono">{sewadar.badgeNumber}</p>
                                  <p className="text-sm text-gray-500">{sewadar.department}</p>
                                </div>
                                {selectedSewadars.includes(sewadar._id) && <Badge variant="secondary">Selected</Badge>}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500">No sewadars found matching your search</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Selected Sewadars */}
                  {selectedSewadars.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Selected Sewadars ({selectedSewadars.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {getSelectedSewadarDetails().map((sewadar) => (
                          <div
                            key={sewadar._id}
                            className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{sewadar.name}</p>
                              <p className="text-sm text-gray-600 font-mono">{sewadar.badgeNumber}</p>
                              <p className="text-sm text-gray-500">{sewadar.department}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSelectedSewadar(sewadar._id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableSewadars.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p>No sewadars found for the selected center</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Temporary Sewadars Button and Form */}
              <Card className="enhanced-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <UserPlus className="mr-2 h-5 w-5" />
                        Temporary Sewadars
                      </CardTitle>
                      <CardDescription>Add sewadars not found in the system</CardDescription>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setShowTempSewadarForm(!showTempSewadarForm)}
                      variant={showTempSewadarForm ? "secondary" : "default"}
                      className="rssb-primary"
                    >
                      {showTempSewadarForm ? (
                        <>
                          <X className="mr-2 h-4 w-4" />
                          Close Form
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Temporary Sewadars
                        </>
                      )}
                      {tempSewadars.filter((ts) => ts.name).length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {tempSewadars.filter((ts) => ts.name).length}
                        </Badge>
                      )}
                    </Button>
                  </div>
                </CardHeader>

                {showTempSewadarForm && (
                  <CardContent className="space-y-4 pt-0 border-t">
                    {tempSewadars.map((tempSewadar, index) => (
                      <div key={index} className="form-section">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-gray-900">Temporary Sewadar #{index + 1}</h4>
                          {tempSewadars.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeTempSewadar(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="mr-1 h-4 w-4" />
                              Remove
                            </Button>
                          )}
                        </div>
                        <div className="form-grid">
                          <div>
                            <Label>Name *</Label>
                            <Input
                              value={tempSewadar.name}
                              onChange={(e) => updateTempSewadar(index, "name", e.target.value)}
                              placeholder="Full name"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Father Name *</Label>
                            <Input
                              value={tempSewadar.fatherName}
                              onChange={(e) => updateTempSewadar(index, "fatherName", e.target.value)}
                              placeholder="Father's name"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Age *</Label>
                            <Input
                              type="number"
                              value={tempSewadar.age}
                              onChange={(e) => updateTempSewadar(index, "age", e.target.value)}
                              placeholder="Age"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Gender *</Label>
                            <Select
                              value={tempSewadar.gender}
                              onValueChange={(value: "MALE" | "FEMALE") => updateTempSewadar(index, "gender", value)}
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
                            <Label>Phone *</Label>
                            <Input
                              value={tempSewadar.phone}
                              onChange={(e) => updateTempSewadar(index, "phone", e.target.value)}
                              placeholder="Phone number"
                              className="mt-1"
                            />
                          </div>
                        </div>
                        {tempSewadar.name && tempSewadar.gender && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                              Auto-generated badge:
                              <span className="font-mono font-medium ml-2 text-blue-600">
                                T{selectedCenter || user?.centerId}
                                {tempSewadar.gender === "MALE" ? "GA" : "LA"}
                                {String(index + 1).padStart(4, "0")}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addTempSewadar} className="w-full bg-transparent">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Another Temporary Sewadar
                    </Button>
                  </CardContent>
                )}
              </Card>

              {/* Nominal Roll Images - Mandatory but with original colors */}
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileImage className="mr-2 h-5 w-5" />
                    Nominal Roll Images *
                  </CardTitle>
                  <CardDescription>Upload attendance images (required for all submissions)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                      <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-700 mb-2">Upload Images</p>
                      <p className="text-sm text-gray-500 mb-4">Click to upload or drag and drop multiple images</p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          handleImageUpload(e.target.files, setNominalRollImages, toast)
                        }}
                        className="hidden"
                        id="nominal-roll-upload"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("nominal-roll-upload")?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Images
                      </Button>
                    </div>

                    {nominalRollImages.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-900 mb-3">Selected Images ({nominalRollImages.length})</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {nominalRollImages.map((file, index) => (
                            <div key={index} className="relative p-3 bg-white rounded-lg border">
                              <div className="flex items-center space-x-2">
                                <FileImage className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600 truncate">{file.name}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newImages = nominalRollImages.filter((_, i) => i !== index)
                                  setNominalRollImages(newImages)
                                }}
                                className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-red-100 hover:bg-red-200 text-red-600 rounded-full"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Image Upload Guidelines:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Upload clear, readable images of attendance sheets</li>
                        <li>• Supported formats: JPG, PNG, JPEG</li>
                        <li>• Maximum file size: 5MB per image</li>
                        <li>• At least one image is required for submission</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedEvent("")
                    setSelectedSewadars([])
                    setTempSewadars([{ name: "", fatherName: "", age: "", gender: "MALE", phone: "" }])
                    setSewadarSearch("")
                    setNominalRollImages([])
                    setShowTempSewadarForm(false)
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="rssb-primary" size="lg" disabled={isSubmitting}>
                  <Clock className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Submitting..." : "Submit Attendance"}
                </Button>
              </div>
            </form>
          )}

        {/* Instructions for Area Coordinators */}
        {user?.role === "admin" && !selectedCenter && (
          <Card className="enhanced-card bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-blue-800">
              <p>• As an Area Coordinator, you can manage attendance for all centers in your area</p>
              <p>• First, select a center from the dropdown above to view available sewadars</p>
              <p>• You can then create or select events and add attendance for that specific center</p>
              <p>• All mandatory fields must be completed before submitting attendance</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}
