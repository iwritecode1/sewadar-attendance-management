"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { RefreshCw, Users } from "lucide-react"
import { DEPARTMENTS } from "@/lib/constants"
import { generateBadgePattern, getNextBadgeNumber } from "@/lib/badgeUtils"

export interface TempSewadarData {
  name: string
  fatherHusbandName: string
  age: string
  gender: "MALE" | "FEMALE"
  department: string
  contactNo: string
}

interface TempSewadarFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  showCenterSelection?: boolean
  selectedCenter?: string
  onCenterChange?: (centerId: string) => void
  submitButtonText?: string
  className?: string
}

export default function TempSewadarForm({
  onSuccess,
  onCancel,
  showCenterSelection = false,
  selectedCenter,
  onCenterChange,
  submitButtonText = "Create Temporary Sewadar",
  className = ""
}: TempSewadarFormProps) {
  const { user } = useAuth()
  const { centers, sewadars } = useData()
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<TempSewadarData>({
    name: "",
    fatherHusbandName: "",
    age: "",
    gender: "MALE",
    department: "General",
    contactNo: "",
  })

  const updateFormData = (field: keyof TempSewadarData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === "name" || field === "fatherHusbandName" ? value.toUpperCase() : value
    }))
  }

  const resetForm = () => {
    setFormData({
      name: "",
      fatherHusbandName: "",
      age: "",
      gender: "MALE",
      department: "General",
      contactNo: "",
    })
  }

  // Generate preview badge number
  const getPreviewBadgeNumber = () => {
    const centerId = showCenterSelection ? selectedCenter : user?.centerId
    if (!centerId) return "Select center first"

    const badgePattern = generateBadgePattern(centerId, formData.gender, true)

    // Get existing badges with this pattern
    const existingBadges = sewadars
      .filter(sewadar => sewadar.badgeNumber.startsWith(badgePattern))
      .map(sewadar => sewadar.badgeNumber)

    return getNextBadgeNumber(existingBadges, badgePattern)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.fatherHusbandName.trim()) {
      toast({
        title: "Error",
        description: "Name and Father/Husband name are required",
        variant: "destructive",
      })
      return
    }

    if (showCenterSelection && !selectedCenter) {
      toast({
        title: "Error",
        description: "Please select a center first",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Get the center for the current user
      const centerId = showCenterSelection ? selectedCenter : user?.centerId
      const centerData = centers.find(c => c.code === centerId || c._id === centerId)

      if (!centerData) {
        throw new Error("Center not found")
      }

      const sewadarData = {
        name: formData.name.trim(),
        fatherHusbandName: formData.fatherHusbandName.trim(),
        dob: "",
        age: parseInt(formData.age) || 0,
        gender: formData.gender,
        badgeStatus: "TEMPORARY",
        zone: centerData.area,
        area: centerData.area,
        areaCode: centerData.areaCode,
        center: centerData.name,
        centerId: centerData.code,
        department: formData.department || "General",
        contactNo: formData.contactNo || "",
        emergencyContact: "",
      }

      const response = await fetch('/api/sewadars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sewadarData),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Success",
          description: `Temporary sewadar created with badge number: ${result.data?.badgeNumber || 'Generated'}`,
        })

        resetForm()
        onSuccess?.()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create temporary sewadar")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create temporary sewadar",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    resetForm()
    onCancel?.()
  }

  // For admin users, show center selection first
  if (showCenterSelection && !selectedCenter) {
    return (
      <Card className={className}>
        <CardContent className="space-y-4 pt-6">
          <div className="text-center space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Select Center First</h3>
              <p className="text-sm text-blue-800 mb-4">
                Please select a center to create a temporary sewadar for
              </p>

              <div className="max-w-md mx-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Center *
                </label>
                <Select
                  value={selectedCenter || ""}
                  onValueChange={onCenterChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select center" />
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

            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="space-y-4 pt-6">
        {/* Show selected center for admin */}
        {showCenterSelection && selectedCenter && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900">
                  Creating temporary sewadar for:
                </p>
                <p className="text-sm text-green-800">
                  {centers.find(c => c.code === selectedCenter)?.name} ({selectedCenter})
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onCenterChange?.("")}
                className="text-green-700 hover:text-green-900"
              >
                Change Center
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => updateFormData("name", e.target.value)}
                placeholder="Full name"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Father/Husband Name *
              </label>
              <Input
                value={formData.fatherHusbandName}
                onChange={(e) => updateFormData("fatherHusbandName", e.target.value)}
                placeholder="Father/Husband name"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age
              </label>
              <Input
                type="number"
                min="1"
                max="120"
                value={formData.age}
                onChange={(e) => updateFormData("age", e.target.value)}
                placeholder="Age"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender *
              </label>
              <Select
                value={formData.gender}
                onValueChange={(value: "MALE" | "FEMALE") => updateFormData("gender", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">MALE</SelectItem>
                  <SelectItem value="FEMALE">FEMALE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <Select
                value={formData.department}
                onValueChange={(value) => updateFormData("department", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Number
              </label>
              <Input
                type="tel"
                value={formData.contactNo}
                onChange={(e) => updateFormData("contactNo", e.target.value)}
                placeholder="Phone number"
                disabled={isSubmitting}
              />
            </div>
          </div>



          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Auto-generated badge:
              <span className="font-mono font-medium ml-2 text-blue-600">
                {getPreviewBadgeNumber()}
              </span>
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim() || !formData.fatherHusbandName.trim()}
              className="rssb-primary"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  {submitButtonText}
                </>
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}