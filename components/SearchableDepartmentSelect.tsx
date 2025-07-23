"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Search, Check } from "lucide-react"
import { useData } from "@/contexts/DataContext"

interface SearchableDepartmentSelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function SearchableDepartmentSelect({
  value,
  onValueChange,
  placeholder = "Search or add department",
  className = "",
}: SearchableDepartmentSelectProps) {
  const { departments, addDepartment } = useData()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDepartment, setNewDepartment] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter departments based on search term
  const filteredDepartments = departments.filter((department) =>
    department.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Check if search term matches any existing department (case-insensitive)
  const exactMatch = departments.find(
    (department) => department.toLowerCase().trim() === searchTerm.toLowerCase().trim()
  )

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setShowAddForm(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value?.toUpperCase()
    setSearchTerm(inputValue)
    setIsOpen(true)
    setShowAddForm(false)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    setSearchTerm(value || "")
  }

  const handleDepartmentSelect = (department: string) => {
    onValueChange(department)
    setSearchTerm("")
    setIsOpen(false)
    setShowAddForm(false)
  }

  const handleAddNewDepartment = () => {
    setShowAddForm(true)
    setNewDepartment(searchTerm.trim())
  }

  const handleAddDepartmentSubmit = () => {
    const departmentToAdd = newDepartment.trim().toUpperCase()
    
    if (!departmentToAdd) return

    // Check if department already exists (case-insensitive)
    const existingDepartment = departments.find(
      (department) => department.toLowerCase().trim() === departmentToAdd.toLowerCase()
    )

    if (existingDepartment) {
      // If department exists, select it
      handleDepartmentSelect(existingDepartment)
      return
    }

    // Add new department
    addDepartment(departmentToAdd)
    
    // Auto-select the new department after a short delay to ensure it's added
    setTimeout(() => {
      handleDepartmentSelect(departmentToAdd)
    }, 100)

    setNewDepartment("")
    setShowAddForm(false)
  }

  const handleAddDepartmentCancel = () => {
    setShowAddForm(false)
    setNewDepartment("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !showAddForm) {
      e.preventDefault()
      if (filteredDepartments.length === 1) {
        handleDepartmentSelect(filteredDepartments[0])
      } else if (searchTerm.trim() && !exactMatch) {
        handleAddNewDepartment()
      }
    } else if (e.key === "Escape") {
      setIsOpen(false)
      setShowAddForm(false)
    }
  }

  const displayValue = value || ""

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
        <Input
          ref={inputRef}
          value={isOpen ? searchTerm : displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 cursor-pointer"
          autoComplete="off"
        />
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1"
        >
          {showAddForm ? (
            <div className="p-3 border-b">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Input
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value.toUpperCase())}
                    placeholder="Enter new department"
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddDepartmentSubmit()
                      } else if (e.key === "Escape") {
                        handleAddDepartmentCancel()
                      }
                    }}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddDepartmentSubmit}
                    className="flex-1"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Department
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddDepartmentCancel}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {filteredDepartments.length > 0 ? (
                <>
                  {filteredDepartments.map((department) => (
                    <div
                      key={department}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                      onClick={() => handleDepartmentSelect(department)}
                    >
                      <span className="font-medium">{department}</span>
                      {value === department && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  ))}
                  {searchTerm.trim() && !exactMatch && (
                    <div
                      className="p-3 hover:bg-blue-50 cursor-pointer border-t border-gray-200 text-blue-600"
                      onClick={handleAddNewDepartment}
                    >
                      <div className="flex items-center">
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Add "{searchTerm.trim().toUpperCase()}"</span>
                      </div>
                    </div>
                  )}
                </>
              ) : searchTerm.trim() ? (
                <div
                  className="p-3 hover:bg-blue-50 cursor-pointer text-blue-600"
                  onClick={handleAddNewDepartment}
                >
                  <div className="flex items-center">
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Add "{searchTerm.trim().toUpperCase()}"</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-400">
                  <Search className="mx-auto h-8 w-8 mb-2" />
                  <p>Start typing to search departments...</p>
                  <p className="text-xs mt-1">{departments.length} departments available</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}