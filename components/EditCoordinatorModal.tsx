"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useData } from "@/contexts/DataContext"
import { Save, RefreshCw } from "lucide-react"
import type { Coordinator } from "@/contexts/DataContext"

interface EditCoordinatorModalProps {
  coordinatorId: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function EditCoordinatorModal({ coordinatorId, isOpen, onClose, onSuccess }: EditCoordinatorModalProps) {
  const { toast } = useToast()
  const { centers } = useData()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [coordinator, setCoordinator] = useState<Coordinator | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    centerId: "",
    isActive: true,
  })

  useEffect(() => {
    if (coordinatorId && isOpen) {
      fetchCoordinatorDetails()
    }
  }, [coordinatorId, isOpen])

  const fetchCoordinatorDetails = async () => {
    if (!coordinatorId) return

    setLoading(true)
    try {
      const response = await apiClient.getCoordinator(coordinatorId)
      if (response.success) {
        const coord = response.data
        setCoordinator(coord)
        setFormData({
          name: coord.name,
          username: coord.username,
          password: "", // Don't populate password for security
          centerId: coord.centerId,
          isActive: coord.isActive,
        })
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to fetch coordinator details",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch coordinator details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coordinatorId) return

    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.username.trim()) {
      toast({
        title: "Error",
        description: "Username is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.centerId) {
      toast({
        title: "Error",
        description: "Center is required",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const updateData = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        centerId: formData.centerId,
        isActive: formData.isActive,
      }

      // Only include password if it's provided
      if (formData.password.trim()) {
        updateData.password = formData.password
      }

      const response = await apiClient.updateCoordinator(coordinatorId, updateData)

      if (response.success) {
        toast({
          title: "Success",
          description: "Coordinator updated successfully",
        })
        onSuccess()
        onClose()
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to update coordinator",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update coordinator",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] md:w-full">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">
            <span className="hidden md:inline">Edit Coordinator</span>
            <span className="md:hidden">Edit</span>
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading coordinator details...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter coordinator name"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="Enter username"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Leave blank to keep current password"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank to keep the current password</p>
            </div>

            <div>
              <Label htmlFor="center">Center *</Label>
              <Select value={formData.centerId} onValueChange={(value) => handleInputChange("centerId", value)}>
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

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange("isActive", checked)}
              />
              <Label htmlFor="isActive">Active Status</Label>
            </div>

            {/* Mobile - Stacked Buttons */}
            <div className="block md:hidden space-y-3 pt-4">
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Coordinator
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="w-full">
                Cancel
              </Button>
            </div>

            {/* Desktop - Side by Side Buttons */}
            <div className="hidden md:flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Coordinator
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
