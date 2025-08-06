"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Plus, Search, Check } from "lucide-react"
import { useData } from "@/contexts/DataContext"
import { toTitleCase } from "@/lib/text-utils"

interface SearchablePlaceSelectProps {
    value: string
    onValueChange: (value: string) => void
    placeholder?: string
    className?: string
}

export default function SearchablePlaceSelect({
    value,
    onValueChange,
    placeholder = "Search or add place",
    className = "",
}: SearchablePlaceSelectProps) {
    const { places, addPlace } = useData()
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [focusedPlaceIndex, setFocusedPlaceIndex] = useState(-1)
    const inputRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Filter places based on search term
    const filteredPlaces = places.filter((place) =>
        place.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Check if search term matches any existing place (case-insensitive)
    const exactMatch = places.find(
        (place) => place.toLowerCase().trim() === searchTerm.toLowerCase().trim()
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

    // Auto-scroll to focused place item within dropdown only
    useEffect(() => {
        if (focusedPlaceIndex >= 0 && isOpen) {
            const focusedElement = document.getElementById(`place-option-${focusedPlaceIndex}`);
            const dropdown = document.getElementById('place-dropdown');
            
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
    }, [focusedPlaceIndex, isOpen])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value?.toUpperCase()
        setSearchTerm(inputValue)
        setIsOpen(true)
        setFocusedPlaceIndex(-1) // Reset focused index when search changes
    }

    const handleInputFocus = () => {
        setIsOpen(true)
        setSearchTerm(value || "")
    }

    const handlePlaceSelect = (place: string) => {
        onValueChange(place)
        setSearchTerm("")
        setIsOpen(false)
    }

    const handleAddNewPlace = () => {
        // Directly add the place
        const placeToAdd = searchTerm.trim().toUpperCase()

        if (!placeToAdd) return

        // Check if place already exists (case-insensitive)
        const existingPlace = places.find(
            (place) => place.toLowerCase().trim() === placeToAdd.toLowerCase()
        )

        if (existingPlace) {
            // If place exists, select it
            handlePlaceSelect(existingPlace)
            return
        }

        // Add new place
        addPlace(placeToAdd)

        // Auto-select the new place after a short delay to ensure it's added
        setTimeout(() => {
            handlePlaceSelect(placeToAdd)
        }, 100)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (isOpen && filteredPlaces.length > 0) {
            // Arrow down - move focus down
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setFocusedPlaceIndex((prev) =>
                    prev < filteredPlaces.length - 1 ? prev + 1 : prev
                );
            }
            // Arrow up - move focus up
            else if (e.key === "ArrowUp") {
                e.preventDefault();
                setFocusedPlaceIndex((prev) => (prev > 0 ? prev - 1 : 0));
            }
            // Enter - select the focused item
            else if (e.key === "Enter" && focusedPlaceIndex >= 0) {
                e.preventDefault();
                const place = filteredPlaces[focusedPlaceIndex];
                if (place) {
                    handlePlaceSelect(place);
                }
            }
            // Escape - close dropdown
            else if (e.key === "Escape") {
                e.preventDefault();
                setIsOpen(false);
                setFocusedPlaceIndex(-1);
            }
        } else if (e.key === "Enter") {
            e.preventDefault()
            if (filteredPlaces.length === 1) {
                handlePlaceSelect(filteredPlaces[0])
            } else if (searchTerm.trim() && !exactMatch) {
                handleAddNewPlace()
            }
        } else if (e.key === "Escape") {
            setIsOpen(false)
            setFocusedPlaceIndex(-1)
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
                    id="place-dropdown"
                    className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1"
                >
                    {filteredPlaces.length > 0 ? (
                        <>
                            {filteredPlaces.map((place, index) => (
                                <div
                                    key={place}
                                    id={`place-option-${index}`}
                                    className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center justify-between ${
                                        focusedPlaceIndex === index
                                            ? "bg-blue-50"
                                            : "hover:bg-gray-50"
                                    }`}
                                    onClick={() => handlePlaceSelect(place)}
                                    onMouseEnter={() => setFocusedPlaceIndex(index)}
                                >
                                    <span className="font-medium">{toTitleCase(place)}</span>
                                    {value === place && (
                                        <Check className="h-4 w-4 text-blue-600" />
                                    )}
                                </div>
                            ))}
                            {searchTerm.trim() && !exactMatch && (
                                <div
                                    className="p-3 hover:bg-blue-50 cursor-pointer border-t border-gray-200 text-blue-600"
                                    onClick={handleAddNewPlace}
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
                            onClick={handleAddNewPlace}
                        >
                            <div className="flex items-center">
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Add "{searchTerm.trim().toUpperCase()}"</span>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 text-center text-gray-400">
                            <Search className="mx-auto h-8 w-8 mb-2" />
                            <p>Start typing to search places...</p>
                            <p className="text-xs mt-1">{places.length} places available</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}