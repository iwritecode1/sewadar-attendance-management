"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ChevronDown, Plus, Search, X, Check, RefreshCw } from "lucide-react"
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
  hasAttendance?: (eventId: string) => boolean
  loading?: boolean
}

export default function SearchableEventSelect({
  events,
  value,
  onValueChange,
  placeholder = "Choose an event",
  hasAttendance,
  loading = false
}: SearchableEventSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [focusedEventIndex, setFocusedEventIndex] = useState(-1)
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

  // Auto-scroll to focused event item within dropdown only
  useEffect(() => {
    if (focusedEventIndex >= 0 && isOpen) {
      const focusedElement = document.getElementById(`event-option-${focusedEventIndex}`);
      const dropdown = document.getElementById('event-dropdown');
      
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
  }, [focusedEventIndex, isOpen])

  const handleSelect = (eventValue: string) => {
    onValueChange(eventValue)
    setIsOpen(false)
    setSearchTerm("")
    setFocusedEventIndex(-1)
  }

  const formatEventDisplay = (event: SewaEvent) => {
    return `${event.place} - ${event.department} (${formatDateRange(event.fromDate, event.toDate)})`
  }

  // Helper function to render event with optional checkmark - mobile responsive
  const renderEventWithCheckmark = (event: SewaEvent, isMobile: boolean = false) => {
    const hasExistingAttendance = hasAttendance && hasAttendance(event._id);
    
    return (
      <div className="flex items-start">
        <div className="w-6 flex justify-start flex-shrink-0 mt-0.5">
          {hasExistingAttendance && (
            <Check className="h-4 w-4 text-green-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {isMobile ? (
            // Mobile layout: Place - Department on first line, dates on second line
            <div className="space-y-1">
              <div className="font-medium text-gray-900 truncate">
                {event.place} - {event.department}
              </div>
              <div className="text-sm text-gray-900">
                {formatDateRange(event.fromDate, event.toDate)}
              </div>
            </div>
          ) : (
            // Desktop layout: single line with truncation
            <span className="truncate font-medium text-gray-900">
              {formatEventDisplay(event)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between text-left font-normal min-h-[2.5rem] h-auto py-2"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        <div className="flex items-start flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center">
              <div className="w-6"></div>
              <span className="flex items-center">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading events...
              </span>
            </div>
          ) : selectedEvent ? (
            renderEventWithCheckmark(selectedEvent, true)
          ) : (
            <div className="flex items-center">
              <div className="w-6"></div>
              <span className="truncate">{placeholder}</span>
            </div>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform flex-shrink-0 ml-2 mt-0.5 ${isOpen ? "rotate-180" : ""}`} />
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
                onChange={(e) => {
                  setSearchTerm(e.target.value?.toUpperCase());
                  setFocusedEventIndex(-1); // Reset focused index when search changes
                }}
                onKeyDown={(e) => {
                  if (displayEvents.length > 0 || e.key === "Escape") {
                    // Arrow down - move focus down
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setFocusedEventIndex((prev) => 
                        // Allow focusing on the "Create New Event" button (index = displayEvents.length)
                        prev < displayEvents.length ? prev + 1 : prev
                      );
                    }
                    // Arrow up - move focus up
                    else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setFocusedEventIndex((prev) => (prev > 0 ? prev - 1 : 0));
                    }
                    // Enter - select the focused item
                    else if (e.key === "Enter" && focusedEventIndex >= 0) {
                      e.preventDefault();
                      const event = displayEvents[focusedEventIndex];
                      if (event) {
                        handleSelect(event._id);
                      }
                    }
                    // Enter with no selection but with search term - create new event
                    else if (e.key === "Enter" && focusedEventIndex === -1 && displayEvents.length === 0 && searchTerm) {
                      e.preventDefault();
                      handleSelect("new");
                    }
                    // Special case: if focused index is equal to displayEvents.length, it means we're focusing the "Create New Event" button
                    else if (e.key === "Enter" && focusedEventIndex === displayEvents.length) {
                      e.preventDefault();
                      handleSelect("new");
                    }
                    // Escape - close dropdown
                    else if (e.key === "Escape") {
                      e.preventDefault();
                      setIsOpen(false);
                      setSearchTerm("");
                      setFocusedEventIndex(-1);
                    }
                  }
                }}
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
            <div id="event-dropdown" className="max-h-64 overflow-y-auto">
              <div className="space-y-1">
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-gray-600">Loading events...</span>
                  </div>
                ) : displayEvents.length > 0 ? (
                  displayEvents.map((event, index) => (
                    <button
                      key={event._id}
                      id={`event-option-${index}`}
                      type="button"
                      className={`w-full text-left px-3 py-3 text-sm rounded-md transition-colors ${
                        focusedEventIndex === index 
                          ? "bg-blue-50" 
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleSelect(event._id)}
                      onMouseEnter={() => setFocusedEventIndex(index)}
                    >
                      {renderEventWithCheckmark(event, true)}
                    </button>
                  ))
                ) : (
                  <>
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

                    {/* No events available */}
                    {!searchTerm && events.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500 text-center">
                        No events available
                      </div>
                    )}
                  </>
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