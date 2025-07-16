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
import { useToast } from "@/hooks/use-toast"
import { Plus, Users, Shield, Eye, EyeOff, Edit, Trash2, UserCheck, UserX } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface Coordinator {
  id: string
  name: string
  username: string
  password: string
  centerId: string
  centerName: string
  createdAt: string
  isActive: boolean
}

export default function CoordinatorsPage() {
  const { user } = useAuth()
  const { centers } = useData()
  const { toast } = useToast()
  const router = useRouter()

  const [coordinators, setCoordinators] = useState<Coordinator[]>([
    {
      id: "2",
      name: "Center Coordinator 1",
      username: "coord1",
      password: "coord123",
      centerId: "5228",
      centerName: "HISSAR-I",
      createdAt: "2024-01-01",
      isActive: true,
    },
    {
      id: "3",
      name: "Center Coordinator 2",
      username: "coord2",
      password: "coord123",
      centerId: "5229",
      centerName: "HISSAR-II",
      createdAt: "2024-01-01",
      isActive: true,
    },
  ])

  const [newCoordinator, setNewCoordinator] = useState({
    name: "",
    username: "",
    password: "",
    centerId: "",
    centerName: "",
  })

  const [showAddForm, setShowAddForm] = useState(false)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/attendance")
    }
  }, [user, router])

  if (!user || user.role !== "admin") {
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!newCoordinator.name || !newCoordinator.username || !newCoordinator.password || !newCoordinator.centerId) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    // Check if username already exists
    if (coordinators.some((coord) => coord.username === newCoordinator.username)) {
      toast({
        title: "Error",
        description: "Username already exists",
        variant: "destructive",
      })
      return
    }

    // Check if center already has a coordinator
    if (coordinators.some((coord) => coord.centerId === newCoordinator.centerId && coord.isActive)) {
      toast({
        title: "Error",
        description: "This center already has an active coordinator",
        variant: "destructive",
      })
      return
    }

    const coordinator: Coordinator = {
      id: Date.now().toString(),
      name: newCoordinator.name,
      username: newCoordinator.username,
      password: newCoordinator.password,
      centerId: newCoordinator.centerId,
      centerName: newCoordinator.centerName,
      createdAt: new Date().toISOString().split("T")[0],
      isActive: true,
    }

    setCoordinators([...coordinators, coordinator])
    setNewCoordinator({ name: "", username: "", password: "", centerId: "", centerName: "" })
    setShowAddForm(false)

    toast({
      title: "Success",
      description: "Coordinator created successfully",
    })
  }

  const handleCenterChange = (centerId: string) => {
    const center = centers.find((c) => c.id === centerId)
    setNewCoordinator((prev) => ({
      ...prev,
      centerId,
      centerName: center?.name || "",
    }))
  }

  const toggleCoordinatorStatus = (id: string) => {
    setCoordinators((prev) => prev.map((coord) => (coord.id === id ? { ...coord, isActive: !coord.isActive } : coord)))
    toast({
      title: "Success",
      description: "Coordinator status updated",
    })
  }

  const deleteCoordinator = (id: string) => {
    setCoordinators((prev) => prev.filter((coord) => coord.id !== id))
    toast({
      title: "Success",
      description: "Coordinator deleted successfully",
    })
  }

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const availableCenters = centers.filter(
    (center) => !coordinators.some((coord) => coord.centerId === center.id && coord.isActive),
  )

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Coordinators</h1>
            <p className="text-gray-600 mt-1">Create and manage center coordinators for {user.area} Area</p>
          </div>
          <Button onClick={() => setShowAddForm(true)} className="rssb-primary mt-4 sm:mt-0">
            <Plus className="mr-2 h-4 w-4" />
            Add Coordinator
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Coordinators</p>
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
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{coordinators.filter((c) => c.isActive).length}</p>
                </div>
                <Shield className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inactive</p>
                  <p className="text-2xl font-bold text-red-600">{coordinators.filter((c) => !c.isActive).length}</p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-bold text-sm">!</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Available Centers</p>
                  <p className="text-2xl font-bold text-blue-600">{availableCenters.length}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">C</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Coordinator Form */}
        {showAddForm && (
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle>Create New Coordinator</CardTitle>
              <CardDescription>Add a new center coordinator to {user.area} Area</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="form-grid">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={newCoordinator.name}
                      onChange={(e) => setNewCoordinator((prev) => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder="Enter full name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={newCoordinator.username}
                      onChange={(e) => setNewCoordinator((prev) => ({ ...prev, username: e.target.value }))}
                      required
                      placeholder="Enter username"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newCoordinator.password}
                      onChange={(e) => setNewCoordinator((prev) => ({ ...prev, password: e.target.value }))}
                      required
                      placeholder="Enter password"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="center">Center *</Label>
                    <Select value={newCoordinator.centerId} onValueChange={handleCenterChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select center" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCenters.map((center) => (
                          <SelectItem key={center.id} value={center.id}>
                            {center.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" className="rssb-primary">
                    <Shield className="mr-2 h-4 w-4" />
                    Create Coordinator
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Coordinators Table */}
        <Card className="enhanced-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Center Coordinators ({coordinators.length})
            </CardTitle>
            <CardDescription>Manage coordinators for {user.area} Area centers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="enhanced-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Center</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coordinators.map((coordinator) => (
                    <TableRow key={coordinator.id}>
                      <TableCell className="font-medium">{coordinator.name}</TableCell>
                      <TableCell className="font-mono text-sm">{coordinator.username}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm">
                            {showPasswords[coordinator.id] ? coordinator.password : "••••••••"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePasswordVisibility(coordinator.id)}
                            className="h-6 w-6 p-0"
                          >
                            {showPasswords[coordinator.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{coordinator.centerName}</TableCell>
                      <TableCell>{coordinator.createdAt}</TableCell>
                      <TableCell>
                        <Badge variant={coordinator.isActive ? "default" : "secondary"}>
                          {coordinator.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCoordinatorStatus(coordinator.id)}
                            className="h-8 w-8 p-0"
                            title={coordinator.isActive ? "Deactivate" : "Activate"}
                          >
                            {coordinator.isActive ? (
                              <UserX className="h-4 w-4 text-red-600" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => deleteCoordinator(coordinator.id)}
                            title="Delete"
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
            <CardTitle className="text-blue-900">Coordinator Management Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-800">
            <p>• Only Area Coordinators can create and manage Center Coordinators</p>
            <p>• Each center can have only one active coordinator at a time</p>
            <p>• Coordinators can only manage sewadars and attendance for their assigned center</p>
            <p>• Username must be unique across the system</p>
            <p>• Share login credentials securely with the coordinators</p>
            <p>• Inactive coordinators cannot access the system but their data is preserved</p>
            <p>• Use the eye icon to view/hide passwords when sharing credentials</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
