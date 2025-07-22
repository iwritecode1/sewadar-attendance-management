"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { apiClient } from "@/lib/api-client"
import { RefreshCw, Save, X } from "lucide-react"
import { DEPARTMENTS } from "@/lib/constants"
import type { Sewadar } from "@/contexts/DataContext"

interface EditSewadarModalProps {
  sewadarId: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// Using static departments from constants

export default function EditSewadarModal({ sewadarId, isOpen, onClose, onSuccess }: EditSewadarModalProps) {
  const { user } = useAuth()
  const { centers } = useData()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Sewadar>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (sewadarId && isOpen) {
      fetchSewadarDetails()
    } else {
      // Reset form when modal closes
      setFormData({})
      setErrors({})
    }
  }, [sewadarId, isOpen])

  const fetchSewadarDetails = async () => {
    if (!sewadarId) return

    setLoading(true)
    try {
      const response = await apiClient.getSewadar(sewadarId)
      if (response.success) {
        setFormData(response.data)
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to fetch sewadar details",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to fetch sewadar details:", error)
      toast({
        title: "Error",
        description: "Failed to fetch sewadar details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name?.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.fatherHusbandName?.trim()) {
      newErrors.fatherHusbandName = "Father/Husband name is required"
    }

    if (!formData.badgeNumber?.trim()) {
      newErrors.badgeNumber = "Badge number is required"
    }

    if (!formData.gender) {
      newErrors.gender = "Gender is required"
    }

    if (!formData.center) {
      newErrors.center = "Center is required"
    }

    if (!formData.department) {
      newErrors.department = "Department is required"
    }

    if (formData.contactNo && !/^\d{10}$/.test(formData.contactNo.replace(/\D/g, ""))) {
      newErrors.contactNo = "Contact number must be 10 digits"
    }

    if (formData.emergencyContact && !/^\d{10}$/.test(formData.emergencyContact.replace(/\D/g, ""))) {
      newErrors.emergencyContact = "Emergency contact must be 10 digits"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sewadarId || !validateForm()) return

    setSaving(true)
    try {
      const response = await apiClient.updateSewadar(sewadarId, formData)
      if (response.success) {
        toast({
          title: "Success",
          description: "Sewadar updated successfully",
        })
        onSuccess()
        handleClose()
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to update sewadar",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to update sewadar:", error)
      toast({
        title: "Error",
        description: "Failed to update sewadar",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof Sewadar, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleClose = () => {
    setFormData({})
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-full p-4 md:p-6">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg md:text-xl">
              <span className="hidden md:inline">Edit Sewadar</span>
              <span className="md:hidden">Edit</span>
            </DialogTitle>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading sewadar details...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="badgeNumber">Badge Number *</Label>
                <Input
                  id="badgeNumber"
                  value={formData.badgeNumber || ""}
                  onChange={(e) => handleInputChange("badgeNumber", e.target.value)}
                  placeholder="Enter badge number"
                  disabled={user?.role !== "admin"}
                  className={errors.badgeNumber ? "border-red-500" : ""}
                />
                {errors.badgeNumber && <p className="text-sm text-red-500">{errors.badgeNumber}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter full name"
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fatherHusbandName">Father/Husband Name *</Label>
                <Input
                  id="fatherHusbandName"
                  value={formData.fatherHusbandName || ""}
                  onChange={(e) => handleInputChange("fatherHusbandName", e.target.value)}
                  placeholder="Enter father/husband name"
                  className={errors.fatherHusbandName ? "border-red-500" : ""}
                />
                {errors.fatherHusbandName && <p className="text-sm text-red-500">{errors.fatherHusbandName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob || ""}
                  onChange={(e) => handleInputChange("dob", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={formData.gender || ""} onValueChange={(value) => handleInputChange("gender", value)}>
                  <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">MALE</SelectItem>
                    <SelectItem value="FEMALE">FEMALE</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-sm text-red-500">{errors.gender}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="badgeStatus">Badge Status</Label>
                <Select
                  value={formData.badgeStatus || ""}
                  onValueChange={(value) => handleInputChange("badgeStatus", value)}
                  disabled={user?.role !== "admin"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERMANENT">PERMANENT</SelectItem>
                    <SelectItem value="OPEN">OPEN</SelectItem>
                    <SelectItem value="TEMPORARY">TEMPORARY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone">Zone</Label>
                <Input
                  id="zone"
                  value={formData.zone?.toUpperCase() || ""}
                  onChange={(e) => handleInputChange("zone", e.target.value?.toUpperCase())}
                  placeholder="Enter zone"
                  disabled={user?.role !== "admin"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Area</Label>
                <Input
                  id="area"
                  value={formData.area || user?.area || ""}
                  onChange={(e) => handleInputChange("area", e.target.value)}
                  placeholder="Enter area"
                  disabled={user?.role !== "admin"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="center">Center *</Label>
                <Select
                  value={formData.center || ""}
                  onValueChange={(value) => {
                    handleInputChange("center", value)
                    // Also update centerId
                    const selectedCenter = centers.find((c) => c.name === value)
                    if (selectedCenter) {
                      handleInputChange("centerId", selectedCenter._id)
                    }
                  }}
                  disabled={user?.role === "coordinator"}
                >
                  <SelectTrigger className={errors.center ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select center" />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map((center) => (
                      <SelectItem key={center._id} value={center.name}>
                        {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.center && <p className="text-sm text-red-500">{errors.center}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.department || ""}
                  onValueChange={(value) => handleInputChange("department", value)}
                >
                  <SelectTrigger className={errors.department ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department && <p className="text-sm text-red-500">{errors.department}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNo">Contact Number</Label>
                <Input
                  id="contactNo"
                  value={formData.contactNo || ""}
                  onChange={(e) => handleInputChange("contactNo", e.target.value)}
                  placeholder="Enter contact number"
                  className={errors.contactNo ? "border-red-500" : ""}
                />
                {errors.contactNo && <p className="text-sm text-red-500">{errors.contactNo}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact || ""}
                  onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                  placeholder="Enter emergency contact"
                  className={errors.emergencyContact ? "border-red-500" : ""}
                />
                {errors.emergencyContact && <p className="text-sm text-red-500">{errors.emergencyContact}</p>}
              </div>
            </div>

            {/* Mobile - Stacked Buttons */}
            <div className="block md:hidden space-y-3 pt-4">
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose} className="w-full">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>

            {/* Desktop - Side by Side Buttons */}
            <div className="hidden md:flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
