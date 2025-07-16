"use client"

import { useState } from "react"
import { useData } from "@/contexts/DataContext"
import Layout from "@/components/Layout"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, User, Calendar, MapPin, Clock, Phone } from "lucide-react"

export default function LookupPage() {
  const { sewadars, events, attendance } = useData()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSewadar, setSelectedSewadar] = useState<string | null>(null)

  const filteredSewadars = sewadars.filter(
    (sewadar) =>
      sewadar.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sewadar.badgeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sewadar.fatherHusbandName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getSewadarAttendance = (sewadarId: string) => {
    return attendance.filter((record) => record.sewadars.includes(sewadarId))
  }

  const getEventDetails = (eventId: string) => {
    return events.find((event) => event.id === eventId)
  }

  const calculateDays = (fromDate: string, toDate: string) => {
    const from = new Date(fromDate)
    const to = new Date(toDate)
    const diffTime = Math.abs(to.getTime() - from.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  const selectedSewadarData = selectedSewadar ? sewadars.find((s) => s.id === selectedSewadar) : null
  const sewadarAttendance = selectedSewadar ? getSewadarAttendance(selectedSewadar) : []

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sewadar Lookup</h1>
          <p className="text-gray-600 mt-1">Search and view sewadar attendance history</p>
        </div>

        {/* Search */}
        <Card className="enhanced-card">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search by name, badge number, or father's name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchTerm && (
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle>Search Results ({filteredSewadars.length})</CardTitle>
              <CardDescription>Click on a sewadar to view detailed information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredSewadars.map((sewadar) => (
                  <div
                    key={sewadar.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedSewadar === sewadar.id ? "bg-blue-50 border-blue-300 shadow-md" : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedSewadar(sewadar.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{sewadar.name}</h3>
                        <p className="text-sm text-gray-600 font-mono">{sewadar.badgeNumber}</p>
                        <p className="text-sm text-gray-500">{sewadar.fatherHusbandName}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={sewadar.gender === "MALE" ? "default" : "secondary"}>{sewadar.gender}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-gray-600">{sewadar.center}</span>
                      <span className="text-blue-600 font-medium">{sewadar.department}</span>
                    </div>
                  </div>
                ))}
              </div>
              {filteredSewadars.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>No sewadars found matching your search</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Selected Sewadar Details */}
        {selectedSewadarData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sewadar Info */}
            <Card className="enhanced-card lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Sewadar Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center pb-4 border-b">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold text-2xl">
                      {selectedSewadarData.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedSewadarData.name}</h3>
                  <p className="text-gray-600 font-mono text-sm">{selectedSewadarData.badgeNumber}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Father/Husband Name</p>
                    <p className="font-medium">{selectedSewadarData.fatherHusbandName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Gender</p>
                      <Badge variant={selectedSewadarData.gender === "MALE" ? "default" : "secondary"}>
                        {selectedSewadarData.gender}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">DOB</p>
                      <p className="font-medium">{selectedSewadarData.dob}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Center</p>
                    <p className="font-medium">{selectedSewadarData.center}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <Badge variant="outline">{selectedSewadarData.department}</Badge>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 flex items-center">
                      <Phone className="mr-1 h-4 w-4" />
                      Contact
                    </p>
                    <p className="font-medium">{selectedSewadarData.contactNo}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Emergency Contact</p>
                    <p className="font-medium">{selectedSewadarData.emergencyContact}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Badge Status</p>
                    <Badge variant={selectedSewadarData.badgeStatus === "PERMANENT" ? "default" : "outline"}>
                      {selectedSewadarData.badgeStatus}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Summary and History */}
            <div className="lg:col-span-2 space-y-6">
              {/* Attendance Summary */}
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Attendance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">{sewadarAttendance.length}</div>
                      <p className="text-gray-600 mt-1">Total Events</p>
                    </div>
                    <div className="text-center p-6 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">
                        {sewadarAttendance.reduce((total, record) => {
                          const event = getEventDetails(record.eventId)
                          return total + (event ? calculateDays(event.fromDate, event.toDate) : 0)
                        }, 0)}
                      </div>
                      <p className="text-gray-600 mt-1">Total Days</p>
                    </div>
                    <div className="text-center p-6 bg-purple-50 rounded-lg">
                      <div className="text-3xl font-bold text-purple-600">
                        {
                          new Set(
                            sewadarAttendance.map((record) => {
                              const event = getEventDetails(record.eventId)
                              return event?.department
                            }),
                          ).size
                        }
                      </div>
                      <p className="text-gray-600 mt-1">Departments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance History */}
              {sewadarAttendance.length > 0 ? (
                <Card className="enhanced-card">
                  <CardHeader>
                    <CardTitle>Attendance History</CardTitle>
                    <CardDescription>Events attended by {selectedSewadarData.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table className="enhanced-table">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Event Place</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>From Date</TableHead>
                            <TableHead>To Date</TableHead>
                            <TableHead>Days</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sewadarAttendance.map((record) => {
                            const event = getEventDetails(record.eventId)
                            if (!event) return null

                            const days = calculateDays(event.fromDate, event.toDate)

                            return (
                              <TableRow key={record.id}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center">
                                    <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                                    {event.place}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{event.department}</Badge>
                                </TableCell>
                                <TableCell>{event.fromDate}</TableCell>
                                <TableCell>{event.toDate}</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <Clock className="mr-1 h-4 w-4 text-gray-400" />
                                    {days}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-green-100 text-green-800">Attended</Badge>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="enhanced-card">
                  <CardContent className="text-center py-12">
                    <Calendar className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Records</h3>
                    <p className="text-gray-600">{selectedSewadarData.name} has not attended any events yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {!searchTerm && !selectedSewadar && (
          <Card className="enhanced-card">
            <CardContent className="text-center py-12">
              <Search className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Search for Sewadars</h3>
              <p className="text-gray-600">
                Use the search box above to find sewadars by name, badge number, or father's name.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}
