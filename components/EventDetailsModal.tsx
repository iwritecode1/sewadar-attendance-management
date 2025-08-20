"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  Building,
  Calendar,
  Filter,
  User,
  UserCheck,
  RefreshCw,
  FileImage,
  ZoomIn
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"

interface Sewadar {
  _id: string
  name: string
  fatherHusbandName: string
  dob: string
  age?: number
  gender: "MALE" | "FEMALE"
  badgeNumber: string
  badgeStatus: "PERMANENT" | "TEMPORARY" | "OPEN"
  centerId: string
  center: string
  centerName: string
  department: string
  contactNo: string
  submittedAt: string
}

interface Center {
  id: string
  name: string
}

interface EventStats {
  totalSewadars: number
  totalCenters: number
  maleCount: number
  femaleCount: number
  permanentCount: number
  temporaryCount: number
  openCount: number
}

interface EventDetailsData {
  event: {
    _id: string
    place: string
    department: string
    fromDate: string
    toDate: string
  }
  sewadars: Sewadar[]
  centers: Center[]
  stats: EventStats
}

interface EventDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string | null
  eventName?: string
}

export default function EventDetailsModal({
  isOpen,
  onClose,
  eventId,
  eventName
}: EventDetailsModalProps) {
  const [data, setData] = useState<EventDetailsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCenter, setSelectedCenter] = useState<string>("all")
  const [showNominalRolls, setShowNominalRolls] = useState(false)
  const [nominalRollImages, setNominalRollImages] = useState<string[]>([])
  const [imageDetails, setImageDetails] = useState<Array<{
    url: string
    centerName: string
    centerId: string
    submittedAt: string
    submittedBy: string
  }>>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  const fetchEventDetails = async () => {
    if (!eventId) return

    setLoading(true)
    try {
      // Always fetch all sewadars (no centerId filter in API call)
      const response = await fetch(`/api/events/${eventId}/sewadars`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to fetch event details",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to fetch event details:", error)
      toast({
        title: "Error",
        description: "Failed to fetch event details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchNominalRollImages = async () => {
    if (!eventId) return

    setLoadingImages(true)
    try {
      const response = await fetch(`/api/events/${eventId}/nominal-rolls`)
      const result = await response.json()

      if (result.success) {
        setNominalRollImages(result.data.images || [])
        setImageDetails(result.data.imageDetails || [])
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to fetch nominal roll images",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to fetch nominal roll images:", error)
      toast({
        title: "Error",
        description: "Failed to fetch nominal roll images",
        variant: "destructive",
      })
    } finally {
      setLoadingImages(false)
    }
  }

  useEffect(() => {
    if (isOpen && eventId) {
      fetchEventDetails()
    }
  }, [isOpen, eventId]) // Removed selectedCenter from dependency array

  useEffect(() => {
    if (showNominalRolls && eventId) {
      fetchNominalRollImages()
    }
  }, [showNominalRolls, eventId])

  const handleCenterFilterChange = (centerId: string) => {
    setSelectedCenter(centerId)
  }



  // Get filtered sewadars based on selected center
  const getFilteredSewadars = () => {
    if (!data) return []
    return selectedCenter === "all"
      ? data.sewadars
      : data.sewadars.filter(s => s.centerId === selectedCenter)
  }

  // Get filtered statistics based on selected center
  const getFilteredStats = () => {
    if (!data || !data.stats) return {
      totalSewadars: 0,
      totalCenters: 0,
      maleCount: 0,
      femaleCount: 0,
      permanentCount: 0,
      temporaryCount: 0,
      openCount: 0
    }

    const filteredSewadars = getFilteredSewadars()

    return {
      totalSewadars: filteredSewadars.length,
      totalCenters: selectedCenter === "all" ? data.stats.totalCenters : 1,
      maleCount: filteredSewadars.filter(s => s.gender === "MALE").length,
      femaleCount: filteredSewadars.filter(s => s.gender === "FEMALE").length,
      permanentCount: filteredSewadars.filter(s => s.badgeStatus === "PERMANENT").length,
      temporaryCount: filteredSewadars.filter(s => s.badgeStatus === "TEMPORARY").length,
      openCount: filteredSewadars.filter(s => s.badgeStatus === "OPEN").length
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-6xl">
        <DialogHeader>
          {/* Mobile Layout - Stacked */}
          <div className="block md:hidden space-y-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center text-base">
                <Calendar className="mr-2 h-4 w-4" />
                <span className="truncate">{eventName || "Event Details"}</span>
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm">
              {data?.event && (
                <div className="space-y-1">
                  <div>{data.event.place} - {data.event.department}</div>
                  <div className="text-xs text-gray-500">({data.event.fromDate} to {data.event.toDate})</div>
                </div>
              )}
            </DialogDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNominalRolls(true)}
              className="w-full"
            >
              <FileImage className="mr-2 h-4 w-4" />
              Images
            </Button>
          </div>

          {/* Desktop Layout - Side by Side */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center text-base">
                <Calendar className="mr-2 h-5 w-5" />
                <span className="truncate">{eventName || "Event Details"}</span>
              </DialogTitle>
              <DialogDescription className="text-sm">
                {data?.event && (
                  <>
                    <span className="inline">{data.event.place} - {data.event.department}</span>
                    <span className="inline ml-2">({data.event.fromDate} to {data.event.toDate})</span>
                  </>
                )}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNominalRolls(true)}
              className="ml-4 mr-12 flex-shrink-0"
            >
              <FileImage className="mr-2 h-4 w-4" />
              View Nominal Rolls
            </Button>
          </div>
        </DialogHeader>
        <DialogBody>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading event details...</span>
            </div>
          ) : data ? (
            <div className="space-y-3 md:space-y-6 p-1">
              {/* Statistics Cards */}
              <div className={`grid gap-1.5 md:gap-4 ${user?.role === "coordinator" ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4"}`}>
                <Card>
                  <CardContent className="p-2 md:p-4">
                    <div className="flex items-center space-x-1.5 md:space-x-2">
                      <Users className="h-3.5 w-3.5 md:h-5 md:w-5 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-base md:text-lg font-semibold truncate">{getFilteredStats()?.totalSewadars}</p>
                        <p className="text-xs md:text-sm text-gray-600 leading-tight">Sewadars</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Hide Centers card for coordinators */}
                {user?.role === "admin" && (
                  <Card>
                    <CardContent className="p-2 md:p-4">
                      <div className="flex items-center space-x-1.5 md:space-x-2">
                        <Building className="h-3.5 w-3.5 md:h-5 md:w-5 text-green-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-base md:text-lg font-semibold truncate">{getFilteredStats()?.totalCenters}</p>
                          <p className="text-xs md:text-sm text-gray-600 leading-tight">Centers</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="p-2 md:p-4">
                    <div className="flex items-center space-x-1.5 md:space-x-2">
                      <User className="h-3.5 w-3.5 md:h-5 md:w-5 text-purple-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-base md:text-lg font-semibold truncate">
                          {getFilteredStats()?.maleCount} / {getFilteredStats()?.femaleCount}
                        </p>
                        <p className="text-xs md:text-sm text-gray-600 leading-tight">M / F</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-2 md:p-4">
                    <div className="flex items-center space-x-1.5 md:space-x-2">
                      <UserCheck className="h-3.5 w-3.5 md:h-5 md:w-5 text-orange-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-base md:text-lg font-semibold truncate">{getFilteredStats()?.permanentCount}</p>
                        <p className="text-xs md:text-sm text-gray-600 leading-tight">Permanent</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Center Filter - Only show for admins */}
              {user?.role === "admin" && data.centers.length > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-3.5 w-3.5 md:h-5 md:w-5 text-gray-600" />
                    <span className="text-xs md:text-sm font-medium text-gray-700">Filter by Center:</span>
                  </div>
                  <Select value={selectedCenter} onValueChange={handleCenterFilterChange}>
                    <SelectTrigger className="w-full sm:w-64 h-8 md:h-10 text-xs md:text-sm">
                      <SelectValue placeholder="Filter by center" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Centers ({data.stats.totalSewadars})</SelectItem>
                      {data.centers.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.name} ({data.sewadars.filter(s => s.centerId === center.id).length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sewadars List */}
              <Card className="flex-1">
                <CardHeader className="pb-2 md:pb-3">
                  <CardTitle className="text-sm md:text-base">Participating Sewadars</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    {user?.role === "coordinator" 
                      ? `Showing ${getFilteredSewadars().length} sewadars from your center`
                      : selectedCenter === "all"
                        ? `Showing all ${getFilteredSewadars().length} sewadars`
                        : `Showing ${getFilteredSewadars().length} sewadars from ${data.centers.find(c => c.id === selectedCenter)?.name}`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Responsive Card Layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:hidden">
                    {getFilteredSewadars().map((sewadar) => (
                      <div key={sewadar._id} className="p-2 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                        {/* Header with badges */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-gray-900 text-sm font-medium leading-tight mb-1 truncate">
                              {sewadar.name}
                            </h4>
                            <p className="text-xs text-gray-600 leading-tight mb-1 truncate">
                              {sewadar.fatherHusbandName}
                            </p>
                            <p className="text-xs text-gray-500 leading-tight">
                              Age: {sewadar.age || "N/A"}
                            </p>
                          </div>
                          <div className="flex flex-col space-y-1 flex-shrink-0 ml-2">
                            <Badge 
                              variant={sewadar.gender === "MALE" ? "default" : "secondary"} 
                              className="text-xs px-1.5 py-0.5 font-medium h-5 w-8 justify-center"
                            >
                              {sewadar.gender === "MALE" ? "M" : "F"}
                            </Badge>
                            <Badge 
                              variant={sewadar.badgeStatus === "PERMANENT" ? "default" : "outline"} 
                              className="text-xs px-1.5 py-0.5 font-medium h-5 w-8 justify-center"
                            >
                              {sewadar.badgeStatus === "PERMANENT" ? "P" : sewadar.badgeStatus === "TEMPORARY" ? "T" : "O"}
                            </Badge>
                          </div>
                        </div>

                        {/* Badge Number */}
                        <div className="mb-2">
                          <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded block text-center w-full">
                            {sewadar.badgeNumber}
                          </code>
                        </div>

                        {/* Center name for admins */}
                        {user?.role === "admin" && (
                          <div className="bg-blue-50 rounded px-2 py-1">
                            <div className="text-xs text-blue-900 font-medium text-center truncate">
                              {sewadar.centerName}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table Layout */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium text-gray-700">Badge Number</th>
                          <th className="text-left p-3 font-medium text-gray-700">Name</th>
                          <th className="text-left p-3 font-medium text-gray-700">Father Name</th>
                          <th className="text-left p-3 font-medium text-gray-700">Gender</th>
                          <th className="text-left p-3 font-medium text-gray-700">Age</th>
                          <th className="text-left p-3 font-medium text-gray-700">Badge Status</th>
                          {/* Hide Center column for coordinators */}
                          {user?.role === "admin" && (
                            <th className="text-left p-3 font-medium text-gray-700">Center</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredSewadars()
                          .map((sewadar, index) => (
                            <tr key={sewadar._id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                              <td className="p-3">
                                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                  {sewadar.badgeNumber}
                                </code>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center space-x-2">
                                  {/* <span>{getGenderIcon(sewadar.gender)}</span> */}
                                  <span className="font-small">{sewadar.name}</span>
                                </div>
                              </td>
                              <td className="p-3 text-gray-600">{sewadar.fatherHusbandName}</td>
                              <td className="p-3">
                                <Badge variant="outline">
                                  {sewadar.gender}
                                </Badge>
                              </td>
                              <td className="p-3 text-gray-600 text-center">
                                {sewadar.age || "-"}
                              </td>
                              <td className="p-3">
                                <Badge variant={sewadar.badgeStatus === "PERMANENT" ? "default" : "outline"}>
                                  {sewadar.badgeStatus}
                                </Badge>
                              </td>
                              {/* Hide Center cell for coordinators */}
                              {user?.role === "admin" && (
                                <td className="p-3 text-gray-600">{sewadar.centerName}</td>
                              )}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Empty State */}
                  {getFilteredSewadars().length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No sewadars found for the selected filter</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-gray-600">Failed to load event details</p>
                <Button onClick={fetchEventDetails} className="mt-4">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>

      {/* Nominal Rolls Modal */}
      <Dialog open={showNominalRolls} onOpenChange={setShowNominalRolls}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileImage className="mr-2 h-5 w-5" />
              Nominal Roll Images
            </DialogTitle>
            <DialogDescription>
              {user?.role === "coordinator" 
                ? "Nominal roll images from your center for this event"
                : "All nominal roll images for this event across all centers"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingImages ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading images...</span>
              </div>
            ) : nominalRollImages.length > 0 ? (
              <>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Found <strong>{nominalRollImages.length}</strong> nominal roll images from{' '}
                    <strong>{[...new Set(imageDetails.map(img => img.centerName))].length}</strong> centers
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {imageDetails.map((imageDetail, index) => (
                    <div
                      key={index}
                      className="relative group cursor-pointer border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white"
                      onClick={() => setSelectedImage(imageDetail.url)}
                    >
                      <img
                        src={imageDetail.url}
                        alt={`Nominal roll from ${imageDetail.centerName}`}
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      <div className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {imageDetail.centerName}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            #{index + 1}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          By: {imageDetail.submittedBy}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(imageDetail.submittedAt).toLocaleDateString()} at{' '}
                          {new Date(imageDetail.submittedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <FileImage className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No nominal roll images found for this event</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNominalRolls(false)
                  setNominalRollImages([])
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-5xl max-h-[95vh] p-2">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle>Nominal Roll Image</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedImage(null)}
              >
                {/* <X className="h-4 w-4" /> */}
              </Button>
            </div>
          </DialogHeader>

          {selectedImage && (
            <div className="flex items-center justify-center">
              <img
                src={selectedImage}
                alt="Nominal roll"
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}