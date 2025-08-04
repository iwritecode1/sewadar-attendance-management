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
import { formatDate } from "@/lib/date-utils"
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
    try {
      const success = await createCoordinator(newCoordinator)
      if (success) {
        setNewCoordinator({
          name: "",
          username: "",
          password: "",
          centerId: "",
        })
        setShowAddForm(false)
      }
    } catch (error) {
      console.error("Error creating coordinator:", error)
    } finally {
      setIsSubmitting(false)
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
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between px-2 md:px-0">
          <div>
            <h1 className="text-xl md:text-2xl text-gray-900">Manage Coordinators</h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">Manage center coordinators in {user.area} Area</p>
          </div>
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
            <Button 
              onClick={refreshData} 
              variant="outline" 
              disabled={loading.coordinators}
              className="w-full md:w-auto text-sm"
            >
              <RefreshCw className={`mr-2 h-3 w-3 md:h-4 md:w-4 ${loading.coordinators ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">Refresh</span>
              <span className="md:hidden">Refresh Data</span>
            </Button>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant={showAddForm ? "secondary" : "default"}
              className="w-full md:w-auto rssb-primary text-sm hover:bg-blue-700 active:bg-blue-800"
            >
              {showAddForm ? (
                <>
                  <X className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline">Cancel</span>
                  <span className="md:hidden">Close Form</span>
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline">Add Coordinator</span>
                  <span className="md:hidden">Add New</span>
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

        {/* Statistics */}
        {/* Mobile - Single Combined Card */}
        <div className="block md:hidden">
          <Card className="stat-card">
            <CardContent className="py-4 px-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Total</span>
                  </div>
                  <p className="text-2xl text-gray-900">{coordinators.length}</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Active</span>
                  </div>
                  <p className="text-2xl text-green-600">{coordinators.filter((c) => c.isActive).length}</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium text-gray-600">Inactive</span>
                  </div>
                  <p className="text-2xl text-red-600">{coordinators.filter((c) => !c.isActive).length}</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Building2 className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Centers</span>
                  </div>
                  <p className="text-2xl text-purple-600">
                    {new Set(coordinators.filter((c) => c.isActive).map((c) => c.centerId)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop - Individual Cards */}
        <div className="hidden md:grid grid-cols-4 gap-4">
          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Coordinators</p>
                  <p className="text-2xl text-gray-900">{coordinators.length}</p>
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
                  <p className="text-2xl text-green-600">{coordinators.filter((c) => c.isActive).length}</p>
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
                  <p className="text-2xl text-red-600">{coordinators.filter((c) => !c.isActive).length}</p>
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
                  <p className="text-2xl text-purple-600">
                    {new Set(coordinators.filter((c) => c.isActive).map((c) => c.centerId)).size}
                  </p>
                </div>
                <Building2 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

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

        {/* Coordinators Table */}
        <Card className="enhanced-card">
          <CardHeader>
            <CardTitle className=" text-base md:text-lg">Coordinators ({filteredCoordinators.length})</CardTitle>
            <CardDescription>Manage center coordinators and their access</CardDescription>
          </CardHeader>
          <CardContent>
            {loading.coordinators ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading coordinators...</span>
              </div>
            ) : filteredCoordinators.length > 0 ? (
              <>
              {/* Mobile Card Layout */}
              <div className="block md:hidden space-y-4">
                {filteredCoordinators.map((coordinator, index) => (
                  <div 
                    key={coordinator._id} 
                    className={`p-4 border rounded-lg ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-gray-900 text-base truncate">
                          {coordinator.name}
                        </h3>
                        <p className="text-sm text-gray-600 font-mono">
                          {coordinator.username}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-3">
                        <Switch
                          checked={coordinator.isActive}
                          onCheckedChange={() => handleStatusToggle(coordinator._id, coordinator.isActive)}
                          size="sm"
                        />
                        <Badge 
                          variant={coordinator.isActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {coordinator.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mb-3 p-2 bg-blue-50 rounded">
                      <div className="text-xs text-blue-600 font-medium mb-1">Center</div>
                      <div className="text-sm text-blue-900 font-medium">
                        {coordinator.centerName}
                      </div>
                      <div className="text-xs text-blue-700">
                        ({coordinator.centerId})
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Created: {formatDate(coordinator.createdAt)}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCoordinator(coordinator._id)}
                          className="text-blue-600 hover:text-blue-800 h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCoordinator(coordinator._id, coordinator.name)}
                          className="text-red-600 hover:text-red-800 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
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
                    {filteredCoordinators.map((coordinator, index) => (
                      <TableRow 
                        key={coordinator._id}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
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
                          {formatDate(coordinator.createdAt)}
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
              </>
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
