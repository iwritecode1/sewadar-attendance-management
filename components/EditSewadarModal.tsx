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
import { RefreshCw, Save, X } from "lucide-react"

interface Sewadar {
  _id: string
  badgeNumber: string
  name: string
  fatherHusbandName: string
  dob: string
  gender: string
  badgeStatus: string
  zone: string
  area: string
  center: string
  department: string
  contactNo: string
  emergencyContact: string
}

interface EditSewadarModalProps {
  sewadarId: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function EditSewadarModal({ sewadarId, isOpen, onClose, onSuccess }: EditSewadarModalProps) {
  const { user } = useAuth()
  const { centers } = useData()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Sewadar>>({})

  const departments = [
    "LANGAR",
    "SECURITY",
    "CLEANING",
    "PARKING",
    "STAGE",
    "SOUND",
    "DECORATION",
    "MEDICAL",
    "RECEPTION",
    "TRANSPORT",
    "OTHER",
  ]

  useEffect(() => {
    if (sewadarId && isOpen) {
      fetchSewadarDetails()
    } else {
      setFormData({})
    }
  }, [sewadarId, isOpen])

  const fetchSewadarDetails = async () => {
    if (!sewadarId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/sewadars/${sewadarId}`)
      if (response.ok) {
        const data = await response.json()
        setFormData(data)
      } else {
        throw new Error("Failed to fetch sewadar details")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch sewadar details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sewadarId) return

    setSaving(true)
    try {
      const response = await fetch(`/api/sewadars/${sewadarId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Sewadar updated successfully",
        })
        onSuccess()
      } else {
        const error = await response.json()
        throw new Error(error.message || "Failed to update sewadar")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update sewadar",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof Sewadar, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Sewadar</DialogTitle>
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
                  required
                  disabled={user?.role !== "admin"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fatherHusbandName">Father/Husband Name *</Label>
                <Input
                  id="fatherHusbandName"
                  value={formData.fatherHusbandName || ""}
                  onChange={(e) => handleInputChange("fatherHusbandName", e.target.value)}
                  placeholder="Enter father/husband name"
                  required
                />
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
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
                    <SelectItem value="PERMANENT">Permanent</SelectItem>
                    <SelectItem value="TEMPORARY">Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone">Zone</Label>
                <Input
                  id="zone"
                  value={formData.zone || ""}
                  onChange={(e) => handleInputChange("zone", e.target.value)}
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
                  onValueChange={(value) => handleInputChange("center", value)}
                  disabled={user?.role === "coordinator"}
                >
                  <SelectTrigger>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.department || ""}
                  onValueChange={(value) => handleInputChange("department", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNo">Contact Number</Label>
                <Input
                  id="contactNo"
                  value={formData.contactNo || ""}
                  onChange={(e) => handleInputChange("contactNo", e.target.value)}
                  placeholder="Enter contact number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact || ""}
                  onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                  placeholder="Enter emergency contact"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
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
                  <span>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </span>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
