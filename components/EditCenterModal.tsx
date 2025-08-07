"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Building2, Save } from "lucide-react"
import { apiClient } from "@/lib/api-client"

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

interface EditCenterModalProps {
  center: Center
  isOpen: boolean
  onClose: () => void
  onUpdate: (updatedCenter: Center) => void
}

export default function EditCenterModal({ center, isOpen, onClose, onUpdate }: EditCenterModalProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen && center) {
      setFormData({
        name: center.name,
      })
      setErrors({})
    }
  }, [isOpen, center])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Center name is required"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Center name must be at least 2 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await apiClient.updateCenter(center._id, {
        name: formData.name.trim(),
      })

      if (response.success) {
        toast({
          title: "Success",
          description: "Center updated successfully",
        })
        onUpdate(response.data)
        onClose()
      } else {
        throw new Error(response.error || "Failed to update center")
      }
    } catch (error: any) {
      console.error("Update center error:", error)
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update center",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] md:w-full">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl flex items-center">
            <Building2 className="mr-2 h-5 w-5" />
            <span className="hidden md:inline">Edit Center</span>
            <span className="md:hidden">Edit</span>
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Center Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., HISSAR-III"
                className={errors.name ? "border-red-500" : ""}
                disabled={isSubmitting}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">Center Code</Label>
              <Input value={center.code} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500">Center code cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">Area</Label>
              <Input value={center.area} disabled className="bg-gray-50" />
            </div>

            {center.stats && (
              <div className="pt-4 border-t space-y-2">
                <Label className="text-sm font-medium text-gray-500">Center Statistics</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <p className="text-lg font-bold text-blue-600">{center.stats.sewadarCount}</p>
                    <p className="text-xs text-blue-800">Sewadars</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <p className="text-lg font-bold text-green-600">{center.stats.attendanceCount}</p>
                    <p className="text-xs text-green-800">Events</p>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded">
                    <p className="text-lg font-bold text-purple-600">{center.stats.coordinatorCount}</p>
                    <p className="text-xs text-purple-800">Coordinators</p>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile - Stacked Buttons */}
            <div className="block md:hidden space-y-3 pt-4">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Updating..." : "Update Center"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full">
                Cancel
              </Button>
            </div>

            {/* Desktop - Side by Side Buttons */}
            <div className="hidden md:flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Updating..." : "Update Center"}
              </Button>
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
