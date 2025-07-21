"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Download,
  User,
  UserCheck,
  UserX,
  RefreshCw
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

interface Sewadar {
  _id: string
  name: string
  fatherHusbandName: string
  dob: string
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
  const { toast } = useToast()

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

  useEffect(() => {
    if (isOpen && eventId) {
      fetchEventDetails()
    }
  }, [isOpen, eventId]) // Removed selectedCenter from dependency array

  const handleCenterFilterChange = (centerId: string) => {
    setSelectedCenter(centerId)
  }

  const getBadgeStatusColor = (status: string) => {
    switch (status) {
      case "PERMANENT":
        return "bg-green-100 text-green-800"
      case "TEMPORARY":
        return "bg-yellow-100 text-yellow-800"
      case "OPEN":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getGenderIcon = (gender: string) => {
    return gender === "MALE" ? "👨" : "👩"
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
    if (!data) return data?.stats

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
      <DialogContent className="w-[95vw] max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center text-sm md:text-base">
            <Calendar className="mr-2 h-4 w-4 md:h-5 md:w-5" />
            <span className="truncate">{eventName || "Event Details"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            {data?.event && (
              <>
                <span className="block md:inline">{data.event.place} - {data.event.department}</span>
                <span className="block md:inline md:ml-2">({data.event.fromDate} to {data.event.toDate})</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading event details...</span>
            </div>
          ) : data ? (
            <div className="space-y-6 p-1">
              {/* Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                <Card>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-lg md:text-2xl font-bold truncate">{getFilteredStats()?.totalSewadars}</p>
                        <p className="text-xs md:text-sm text-gray-600">Sewadars</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 md:h-5 md:w-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-lg md:text-2xl font-bold truncate">{getFilteredStats()?.totalCenters}</p>
                        <p className="text-xs md:text-sm text-gray-600">Centers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 md:h-5 md:w-5 text-purple-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm md:text-lg font-bold truncate">
                          {getFilteredStats()?.maleCount} / {getFilteredStats()?.femaleCount}
                        </p>
                        <p className="text-xs md:text-sm text-gray-600">M / F</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="h-4 w-4 md:h-5 md:w-5 text-orange-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-lg md:text-lg font-bold truncate">{getFilteredStats()?.permanentCount}</p>
                        <p className="text-xs md:text-sm text-gray-600">Permanent</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Center Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Filter by Center:</span>
                </div>
                <Select value={selectedCenter} onValueChange={handleCenterFilterChange}>
                  <SelectTrigger className="w-full sm:w-64">
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

              {/* Sewadars List */}
              <Card className="flex-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm md:text-base">Participating Sewadars</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    {selectedCenter === "all"
                      ? `Showing all ${getFilteredSewadars().length} sewadars`
                      : `Showing ${getFilteredSewadars().length} sewadars from ${data.centers.find(c => c.id === selectedCenter)?.name}`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Mobile Card Layout */}
                  <div className="block md:hidden space-y-3">
                    {getFilteredSewadars().map((sewadar) => (
                      <div key={sewadar._id} className="p-3 border border-gray-200 rounded-lg bg-white">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            {/* <span className="text-lg">{getGenderIcon(sewadar.gender)}</span> */}
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-gray-900 text-sm truncate">{sewadar.name}</h4>
                              <p className="text-xs text-gray-600 truncate">{sewadar.fatherHusbandName}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                              {sewadar.gender}
                            </Badge>
                            <Badge className={`text-xs px-1.5 py-0.5 ${getBadgeStatusColor(sewadar.badgeStatus)}`}>
                              {sewadar.badgeStatus === "PERMANENT" ? "P" : sewadar.badgeStatus === "TEMPORARY" ? "T" : "O"}
                            </Badge>
                          </div>
                        </div>

                        {/* Badge Number - no label */}
                        <div className="mb-2">
                          <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                            {sewadar.badgeNumber}
                          </code>
                        </div>

                        {/* Center and Department - no labels, side by side */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-blue-50 rounded text-center">
                            <div className="text-xs text-blue-900 font-medium truncate">
                              {sewadar.centerName}
                            </div>
                          </div>

                          <div className="p-2 bg-green-50 rounded text-center">
                            <div className="text-xs text-green-900 font-medium truncate">
                              {sewadar.department}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table Layout */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium text-gray-700">Name</th>
                          <th className="text-left p-3 font-medium text-gray-700">Father Name</th>
                          <th className="text-left p-3 font-medium text-gray-700">Badge Number</th>
                          <th className="text-left p-3 font-medium text-gray-700">Gender</th>
                          <th className="text-left p-3 font-medium text-gray-700">Badge Status</th>
                          <th className="text-left p-3 font-medium text-gray-700">Center</th>
                          <th className="text-left p-3 font-medium text-gray-700">Department</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredSewadars()
                          .map((sewadar, index) => (
                            <tr key={sewadar._id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                              <td className="p-3">
                                <div className="flex items-center space-x-2">
                                  {/* <span>{getGenderIcon(sewadar.gender)}</span> */}
                                  <span className="font-medium">{sewadar.name}</span>
                                </div>
                              </td>
                              <td className="p-3 text-gray-600">{sewadar.fatherHusbandName}</td>
                              <td className="p-3">
                                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                  {sewadar.badgeNumber}
                                </code>
                              </td>
                              <td className="p-3">
                                <Badge variant="outline">
                                  {sewadar.gender}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <Badge className={getBadgeStatusColor(sewadar.badgeStatus)}>
                                  {sewadar.badgeStatus}
                                </Badge>
                              </td>
                              <td className="p-3 text-gray-600">{sewadar.centerName}</td>
                              <td className="p-3 text-gray-600">{sewadar.department}</td>
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
        </div>
      </DialogContent>
    </Dialog>
  )
}