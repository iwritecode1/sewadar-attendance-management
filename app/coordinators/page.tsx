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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import EditCoordinatorModal from "@/components/EditCoordinatorModal"
import {
  UserPlus,
  Search,
  Users,
  Building2,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  RefreshCw,
  Filter,
  X,
} from "lucide-react"

export default function CoordinatorsPage() {
  const { user } = useAuth()
  const {
    coordinators,
    centers,
    createCoordinator,
    updateCoordinatorStatus,
    deleteCoordinator,
    fetchCoordinators,
    loading,
  } = useData()
  const { toast } = useToast()

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCoordinator, setEditingCoordinator] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCenter, setSelectedCenter] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [newCoordinator, setNewCoordinator] = useState({
    name: "",
    username: "",
    password: "",
    centerId: "",
  })

  // Filter coordinators based on search and filters
  const filteredCoordinators = coordinators.filter((coordinator) => {
    const matchesSearch =
      coordinator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coordinator.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coordinator.centerName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCenter = selectedCenter === "all" || coordinator.centerId === selectedCenter
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "active" && coordinator.isActive) ||
      (selectedStatus === "inactive" && !coordinator.isActive)

    return matchesSearch && matchesCenter && matchesStatus
  })

  const handleAddCoordinator = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!newCoordinator.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      })
      return
    }

    if (!newCoordinator.username.trim()) {
      toast({
        title: "Error",
        description: "Username is required",
        variant: "destructive",
      })
      return
    }

    if (!newCoordinator.password.trim()) {
      toast({
        title: "Error",
        description: "Password is required",
        variant: "destructive",
      })
      return
    }

    if (!newCoordinator.centerId) {
      toast({
        title: "Error",
        description: "Center is required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    const success = await createCoordinator(newCoordinator)
    setIsSubmitting(false)

    if (success) {
      setNewCoordinator({
        name: "",
        username: "",
        password: "",
        centerId: "",
      })
      setShowAddForm(false)
    }
  }

  const handleStatusToggle = async (coordinatorId: string, currentStatus: boolean) => {
    const success = await updateCoordinatorStatus(coordinatorId, !currentStatus)
    if (success) {
      toast({
        title: "Success",
        description: `Coordinator ${!currentStatus ? "activated" : "deactivated"} successfully`,
      })
    }
  }

  const handleDeleteCoordinator = async (coordinatorId: string, coordinatorName: string) => {
    if (window.confirm(`Are you sure you want to delete coordinator "${coordinatorName}"?`)) {
      const success = await deleteCoordinator(coordinatorId)
      if (success) {
        toast({
          title: "Success",
          description: "Coordinator deleted successfully",
        })
      }
    }
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCenter("all")
    setSelectedStatus("all")
  }

  const refreshData = () => {
    fetchCoordinators()
  }

  // Only show for admin users
  if (user?.role !== "admin") {
    return (
      <Layout>
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600">Only area coordinators can manage coordinators.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Coordinators</h1>
            <p className="text-gray-600 mt-1">Manage center coordinators in {user.area} Area</p>
          </div>
          <div className="flex space-x-2 mt-4 sm:mt-0">
            <Button onClick={refreshData} variant="outline" disabled={loading.coordinators}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading.coordinators ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant={showAddForm ? "secondary" : "default"}
              className="rssb-primary"
            >
              {showAddForm ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Coordinator
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Add Coordinator Form */}
        {showAddForm && (
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle>Add New Coordinator</CardTitle>
              <CardDescription>Create a new coordinator account for a center</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCoordinator} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={newCoordinator.name}
                      onChange={(e) => setNewCoordinator({ ...newCoordinator, name: e.target.value })}
                      placeholder="Enter coordinator name"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={newCoordinator.username}
                      onChange={(e) => setNewCoordinator({ ...newCoordinator, username: e.target.value })}
                      placeholder="Enter username"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newCoordinator.password}
                      onChange={(e) => setNewCoordinator({ ...newCoordinator, password: e.target.value })}
                      placeholder="Enter password"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="center">Center *</Label>
                    <Select
                      value={newCoordinator.centerId}
                      onValueChange={(value) => setNewCoordinator({ ...newCoordinator, centerId: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a center" />
                      </SelectTrigger>
                      <SelectContent>
                        {centers.map((center) => (
                          <SelectItem key={center._id} value={center.code}>
                            {center.name} ({center.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="rssb-primary">
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create Coordinator
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="enhanced-card">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search coordinators..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Centers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Centers</SelectItem>
                  {centers.map((center) => (
                    <SelectItem key={center._id} value={center.code}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters} className="w-full bg-transparent">
                <Filter className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Coordinators</p>
                  <p className="text-2xl font-bold text-gray-900">{coordinators.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{coordinators.filter((c) => c.isActive).length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Inactive</p>
                  <p className="text-2xl font-bold text-red-600">{coordinators.filter((c) => !c.isActive).length}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Centers Covered</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {new Set(coordinators.filter((c) => c.isActive).map((c) => c.centerId)).size}
                  </p>
                </div>
                <Building2 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coordinators Table */}
        <Card className="enhanced-card">
          <CardHeader>
            <CardTitle>Coordinators ({filteredCoordinators.length})</CardTitle>
            <CardDescription>Manage center coordinators and their access</CardDescription>
          </CardHeader>
          <CardContent>
            {loading.coordinators ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading coordinators...</span>
              </div>
            ) : filteredCoordinators.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Center</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCoordinators.map((coordinator) => (
                      <TableRow key={coordinator._id}>
                        <TableCell className="font-medium">{coordinator.name}</TableCell>
                        <TableCell className="font-mono text-sm">{coordinator.username}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{coordinator.centerName}</p>
                            <p className="text-sm text-gray-500">({coordinator.centerId})</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={coordinator.isActive}
                              onCheckedChange={() => handleStatusToggle(coordinator._id, coordinator.isActive)}
                              size="sm"
                            />
                            <Badge variant={coordinator.isActive ? "default" : "secondary"}>
                              {coordinator.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(coordinator.createdAt).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingCoordinator(coordinator._id)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCoordinator(coordinator._id, coordinator.name)}
                              className="text-red-600 hover:text-red-800"
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
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No coordinators found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedCenter !== "all" || selectedStatus !== "all"
                    ? "No coordinators match your current filters."
                    : "Get started by adding your first coordinator."}
                </p>
                {(searchTerm || selectedCenter !== "all" || selectedStatus !== "all") && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Coordinator Modal */}
      <EditCoordinatorModal
        coordinatorId={editingCoordinator}
        isOpen={!!editingCoordinator}
        onClose={() => setEditingCoordinator(null)}
        onSuccess={() => fetchCoordinators()}
      />
    </Layout>
  )
}
