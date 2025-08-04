"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import Layout from "@/components/Layout"
import EditCenterModal from "@/components/EditCenterModal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/date-utils"
import { Plus, Building2, Users, Calendar, Edit, Trash2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

interface Center {
  _id: string
  name: string
  code: string
  area: string
  areaCode: string
  createdAt: string
  stats?: {
    sewadarCount: number
    attendanceCount: number
    coordinatorCount: number
  }
}

export default function CentersPage() {
  const { user } = useAuth()
  const { centers, createCenter, deleteCenter, fetchCenters, loading } = useData()
  const { toast } = useToast()
  const router = useRouter()

  const [newCenter, setNewCenter] = useState({
    name: "",
    code: "",
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingCenter, setEditingCenter] = useState<Center | null>(null)

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/attendance")
    }
  }, [user, router])

  useEffect(() => {
    if (user?.role === "admin") {
      fetchCenters({ includeStats: true })
    }
  }, [user, fetchCenters])

  if (!user || user.role !== "admin") {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newCenter.name || !newCenter.code) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    // Validate center code format
    if (!/^\d{4}$/.test(newCenter.code)) {
      toast({
        title: "Error",
        description: "Center code must be a 4-digit number",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const success = await createCenter(newCenter)
      if (success) {
        setNewCenter({ name: "", code: "" })
        setShowAddForm(false)
      }
    } catch (error) {
      console.error("Error creating center:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete center "${name}"? This action cannot be undone.`)) {
      await deleteCenter(id)
    }
  }

  const handleEditCenter = (center: Center) => {
    setEditingCenter(center)
  }

  const handleUpdateCenter = () => {
    // Update the center in the local state
    fetchCenters({ includeStats: true })
  }

  const refreshData = () => {
    fetchCenters({ includeStats: true })
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between px-2 md:px-0">
          <div>
            <h1 className="text-xl md:text-2xl text-gray-900">Manage Centers</h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">Create and manage centers in {user.area} Area</p>
          </div>
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
            <Button
              onClick={refreshData}
              variant="outline"
              disabled={loading.centers}
              className="w-full md:w-auto text-sm"
            >
              <RefreshCw className={`mr-2 h-3 w-3 md:h-4 md:w-4 ${loading.centers ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">Refresh</span>
              <span className="md:hidden">Refresh Data</span>
            </Button>
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full md:w-auto rssb-primary text-sm hover:bg-blue-700 active:bg-blue-800"
            >
              <Plus className="mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden md:inline">Add Center</span>
              <span className="md:hidden">Add New</span>
            </Button>
          </div>
        </div>

        {/* Add Center Form */}
        {showAddForm && (
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle>Create New Center</CardTitle>
              <CardDescription>Add a new center to {user.area} Area</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Center Name *</Label>
                    <Input
                      id="name"
                      value={newCenter.name}
                      onChange={(e) => setNewCenter((prev) => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder="e.g., HISSAR-I"
                      className="mt-1"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Center Code *</Label>
                    <Input
                      id="code"
                      value={newCenter.code}
                      onChange={(e) => setNewCenter((prev) => ({ ...prev, code: e.target.value }))}
                      required
                      placeholder="e.g., 5228"
                      pattern="\d{4}"
                      maxLength={4}
                      className="mt-1"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-gray-500 mt-1">4-digit unique code for the center</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" className="rssb-primary" disabled={isSubmitting}>
                    <Building2 className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Creating..." : "Create Center"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Centers Overview Cards */}
        {loading.centers ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading centers...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {centers.map((center) => (
              <Card key={center._id} className="enhanced-card hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{center.name}</CardTitle>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditCenter(center)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(center._id, center.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>Code: {center.code}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-gray-600">Sewadars</span>
                      </div>
                      <span className="text-gray-900">{center.stats?.sewadarCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-600">Events</span>
                      </div>
                      <span className="text-gray-900">{center.stats?.attendanceCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-purple-600" />
                        <span className="text-sm text-gray-600">Coordinators</span>
                      </div>
                      <span className="text-blue-600">{center.stats?.coordinatorCount || 0}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t">
                    <p className="text-xs text-gray-500">Created: {formatDate(center.createdAt)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Centers Table */}
        {/* <Card className="enhanced-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              All Centers ({centers.length})
            </CardTitle>
            <CardDescription>Complete list of centers in {user.area} Area</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="enhanced-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Center Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Sewadars</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Coordinators</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {centers.map((center) => (
                    <TableRow key={center._id}>
                      <TableCell className="font-medium">{center.name}</TableCell>
                      <TableCell className="font-mono text-sm">{center.code}</TableCell>
                      <TableCell>{center.stats?.sewadarCount || 0}</TableCell>
                      <TableCell>{center.stats?.attendanceCount || 0}</TableCell>
                      <TableCell className="font-semibold text-blue-600">
                        {center.stats?.coordinatorCount || 0}
                      </TableCell>
                      <TableCell>{formatDate(center.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditCenter(center)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(center._id, center.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card> */}

        {/* Instructions */}
        <Card className="enhanced-card bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900  text-base md:text-lg">Center Management Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-800">
            <p>• Each center must have a unique 4-digit code (e.g., 5228, 5229, 5230)</p>
            <p>• Center codes are used to identify center specific sewadars. (e.g., HI5228GA0001)</p>
            <p>• Only Area Coordinators can create and manage centers</p>
            <p>• Centers can be assigned to coordinators after creation</p>
            <p>• Deleting a center will affect all associated sewadars and attendance records</p>
          </CardContent>
        </Card>

        {/* Edit Center Modal */}
        {editingCenter && (
          <EditCenterModal
            center={editingCenter}
            isOpen={!!editingCenter}
            onClose={() => setEditingCenter(null)}
            onUpdate={handleUpdateCenter}
          />
        )}
      </div>
    </Layout>
  )
}
