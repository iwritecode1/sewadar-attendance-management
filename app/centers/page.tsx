"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import Layout from "@/components/Layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Plus, Building2, Users, Calendar, Edit, Trash2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CentersPage() {
  const { user } = useAuth()
  const { centers, createCenter, updateCenter, deleteCenter, fetchCenters, loading } = useData()
  const { toast } = useToast()
  const router = useRouter()

  const [newCenter, setNewCenter] = useState({
    name: "",
    code: "",
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

    setIsSubmitting(true)
    const success = await createCenter(newCenter)
    setIsSubmitting(false)

    if (success) {
      setNewCenter({ name: "", code: "" })
      setShowAddForm(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete center "${name}"? This action cannot be undone.`)) {
      await deleteCenter(id)
    }
  }

  const refreshData = () => {
    fetchCenters({ includeStats: true })
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Centers</h1>
            <p className="text-gray-600 mt-1">Create and manage centers in {user.area} Area</p>
          </div>
          <div className="flex space-x-2 mt-4 sm:mt-0">
            <Button onClick={refreshData} variant="outline" disabled={loading.centers}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading.centers ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowAddForm(true)} className="rssb-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Center
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
                      placeholder="e.g., HISSAR-III"
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
                      placeholder="e.g., 5231"
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
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                      <span className="font-semibold text-gray-900">{center.stats?.sewadarCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-600">Events</span>
                      </div>
                      <span className="font-semibold text-gray-900">{center.stats?.attendanceCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-purple-600" />
                        <span className="text-sm text-gray-600">Coordinators</span>
                      </div>
                      <span className="font-semibold text-blue-600">{center.stats?.coordinatorCount || 0}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t">
                    <p className="text-xs text-gray-500">Created: {new Date(center.createdAt).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Centers Table */}
        <Card className="enhanced-card">
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
                      <TableCell>{new Date(center.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
        </Card>

        {/* Instructions */}
        <Card className="enhanced-card bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Center Management Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-800">
            <p>• Each center must have a unique 4-digit code (e.g., 5228, 5229, 5230)</p>
            <p>• Center codes are used in badge number generation (e.g., HI5228GA0001)</p>
            <p>• Center names should follow the format: AREA-NUMBER (e.g., HISSAR-I, HISSAR-II)</p>
            <p>• Only Area Coordinators can create and manage centers</p>
            <p>• Centers can be assigned to coordinators after creation</p>
            <p>• Deleting a center will affect all associated sewadars and attendance records</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
