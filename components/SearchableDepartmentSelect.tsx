"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Plus, Search, Check } from "lucide-react"
import { useData } from "@/contexts/DataContext"
import { toTitleCase } from "@/lib/text-utils"

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
  const [focusedDepartmentIndex, setFocusedDepartmentIndex] = useState(-1)
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
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Auto-scroll to focused department item within dropdown only
  useEffect(() => {
    if (focusedDepartmentIndex >= 0 && isOpen) {
      const focusedElement = document.getElementById(`department-option-${focusedDepartmentIndex}`);
      const dropdown = document.getElementById('department-dropdown');
      
      if (focusedElement && dropdown) {
        const dropdownScrollTop = dropdown.scrollTop;
        const dropdownHeight = dropdown.clientHeight;
        const elementOffsetTop = focusedElement.offsetTop;
        const elementHeight = focusedElement.offsetHeight;
        
        // Check if element is above the visible area
        if (elementOffsetTop < dropdownScrollTop) {
          dropdown.scrollTop = elementOffsetTop;
        }
        // Check if element is below the visible area
        else if (elementOffsetTop + elementHeight > dropdownScrollTop + dropdownHeight) {
          dropdown.scrollTop = elementOffsetTop + elementHeight - dropdownHeight;
        }
      }
    }
  }, [focusedDepartmentIndex, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value?.toUpperCase()
    setSearchTerm(inputValue)
    setIsOpen(true)
    setFocusedDepartmentIndex(-1) // Reset focused index when search changes
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    setSearchTerm(value || "")
  }

  const handleDepartmentSelect = (department: string) => {
    onValueChange(department)
    setSearchTerm("")
    setIsOpen(false)
  }

  const handleAddNewDepartment = () => {
    // Directly add the department
    const departmentToAdd = searchTerm.trim().toUpperCase()
    
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
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isOpen && filteredDepartments.length > 0) {
      // Arrow down - move focus down
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedDepartmentIndex((prev) =>
          prev < filteredDepartments.length - 1 ? prev + 1 : prev
        );
      }
      // Arrow up - move focus up
      else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedDepartmentIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }
      // Enter - select the focused item
      else if (e.key === "Enter" && focusedDepartmentIndex >= 0) {
        e.preventDefault();
        const department = filteredDepartments[focusedDepartmentIndex];
        if (department) {
          handleDepartmentSelect(department);
        }
      }
      // Escape - close dropdown
      else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        setFocusedDepartmentIndex(-1);
      }
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filteredDepartments.length === 1) {
        handleDepartmentSelect(filteredDepartments[0])
      } else if (searchTerm.trim() && !exactMatch) {
        handleAddNewDepartment()
      }
    } else if (e.key === "Escape") {
      setIsOpen(false)
      setFocusedDepartmentIndex(-1)
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
          id="department-dropdown"
          className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1"
        >
          {filteredDepartments.length > 0 ? (
            <>
              {filteredDepartments.map((department, index) => (
                <div
                  key={department}
                  id={`department-option-${index}`}
                  className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center justify-between ${
                    focusedDepartmentIndex === index
                      ? "bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => handleDepartmentSelect(department)}
                  onMouseEnter={() => setFocusedDepartmentIndex(index)}
                >
                  <span className="font-medium">{toTitleCase(department)}</span>
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
        </div>
      )}
    </div>
  )
}