"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ChevronDown, Plus, Search, X } from "lucide-react"
import { formatDate, formatDateRange } from "@/lib/date-utils"

interface SewaEvent {
  _id: string
  place: string
  department: string
  fromDate: string
  toDate: string
}

interface SearchableEventSelectProps {
  events: SewaEvent[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}

export default function SearchableEventSelect({
  events,
  value,
  onValueChange,
  placeholder = "Choose an event"
}: SearchableEventSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter events based on search term
  const filteredEvents = events.filter(event => {
    const searchLower = searchTerm.toLowerCase()
    
    // Create the full display format for searching using new date format
    const fullFormat = `${event.place} - ${event.department} (${formatDateRange(event.fromDate, event.toDate)})`.toLowerCase()
    
    // Create alternative formats for flexible searching
    const placeAndDept = `${event.place} ${event.department}`.toLowerCase()
    const placeAndDeptWithDash = `${event.place} - ${event.department}`.toLowerCase()
    
    // Format dates for searching
    const fromDateFormatted = formatDate(event.fromDate).toLowerCase()
    const toDateFormatted = formatDate(event.toDate).toLowerCase()
    
    return (
      // Search in individual fields
      event.place.toLowerCase().includes(searchLower) ||
      event.department.toLowerCase().includes(searchLower) ||
      event.fromDate.includes(searchLower) ||
      event.toDate.includes(searchLower) ||
      fromDateFormatted.includes(searchLower) ||
      toDateFormatted.includes(searchLower) ||
      // Search in combined formats
      fullFormat.includes(searchLower) ||
      placeAndDept.includes(searchLower) ||
      placeAndDeptWithDash.includes(searchLower)
    )
  })

  // Show all filtered events (no limit)
  const displayEvents = filteredEvents

  // Get selected event for display
  const selectedEvent = events.find(event => event._id === value)

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (eventValue: string) => {
    onValueChange(eventValue)
    setIsOpen(false)
    setSearchTerm("")
  }

  const formatEventDisplay = (event: SewaEvent) => {
    return `${event.place} - ${event.department} (${formatDateRange(event.fromDate, event.toDate)})`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between text-left font-normal"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {selectedEvent ? formatEventDisplay(selectedEvent) : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg border bg-white">
          <div className="p-3">
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={inputRef}
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-8"
              />
              {searchTerm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Event Options - Scrollable */}
            <div className="max-h-64 overflow-y-auto">
              <div className="space-y-1">
                {displayEvents.map((event) => (
                  <button
                    key={event._id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-md transition-colors"
                    onClick={() => handleSelect(event._id)}
                  >
                    <div className="font-medium text-gray-900">
                      {formatEventDisplay(event)}
                    </div>
                  </button>
                ))}

                {/* Show total count if there are many events */}
                {filteredEvents.length > 6 && !searchTerm && (
                  <div className="px-3 py-2 text-xs text-gray-500 border-t">
                    {filteredEvents.length} events available. Use search to find specific events quickly.
                  </div>
                )}

                {/* No results message */}
                {searchTerm && filteredEvents.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500 text-center">
                    No events found matching "{searchTerm}"
                  </div>
                )}

                {/* Create New Event Option */}
                <div className="border-t pt-2 mt-2">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-md transition-colors flex items-center text-blue-600"
                    onClick={() => handleSelect("new")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="font-medium">Create New Event</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}