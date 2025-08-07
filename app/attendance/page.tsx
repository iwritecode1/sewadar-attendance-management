"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import SearchableEventSelect from "@/components/SearchableEventSelect";
import SearchablePlaceSelect from "@/components/SearchablePlaceSelect";
import SearchableDepartmentSelect from "@/components/SearchableDepartmentSelect";
import AttendanceStatusOverlay from "@/components/AttendanceStatusOverlay";
import { generateBadgePattern, getNextBadgeNumber } from "@/lib/badgeUtils";
import {
  Calendar,
  Plus,
  Upload,
  Users,
  Clock,
  Camera,
  Search,
  X,
  UserPlus,
  FileImage,
  Building2,
  RefreshCw,
} from "lucide-react";

const validateImageFile = (file: File): boolean => {
  const validTypes = ["image/jpeg", "image/jpg", "image/png"];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    return false;
  }

  if (file.size > maxSize) {
    return false;
  }

  return true;
};

const handleImageUpload = (
  files: FileList | null,
  setImages: (images: File[]) => void,
  toast: any
) => {
  if (!files) return;

  const validFiles: File[] = [];
  const invalidFiles: string[] = [];

  Array.from(files).forEach((file) => {
    if (validateImageFile(file)) {
      validFiles.push(file);
    } else {
      invalidFiles.push(file.name);
    }
  });

  if (invalidFiles.length > 0) {
    toast({
      title: "Invalid Files",
      description: `Some files were rejected: ${invalidFiles.join(
        ", "
      )}. Please ensure files are images under 5MB.`,
      variant: "destructive",
    });
  }

  if (validFiles.length > 0) {
    setImages(validFiles);
    toast({
      title: "Success",
      description: `${validFiles.length} image(s) uploaded successfully`,
    });
  }
};

// Helper function to get date in YYYY-MM-DD format
const getFormattedDate = (daysOffset: number = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

export default function AttendancePage() {
  const { user } = useAuth();
  const {
    events,
    centers,
    places,
    departments,
    getSewadarsForCenter,
    fetchSewadarsForCenter,
    createEvent,
    createAttendance,
    addPlace,
    addDepartment,
    fetchEvents,
    loading,
    getExistingAttendanceForEvent,
    getExistingAttendanceForEventByUser,
  } = useData();


  const { toast } = useToast();

  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedCenter, setSelectedCenter] = useState(
    user?.role === "coordinator" ? user.centerId || "" : ""
  );

  const [newEvent, setNewEvent] = useState({
    place: "",
    department: "",
    fromDate: getFormattedDate(0), // Current date
    toDate: getFormattedDate(4), // 4 days after current date
  });
  const [selectedSewadars, setSelectedSewadars] = useState<string[]>([]);
  const [tempSewadars, setTempSewadars] = useState([
    {
      name: "",
      fatherName: "",
      age: "",
      gender: "MALE" as "MALE" | "FEMALE",
      phone: "",
    },
  ]);
  const [showNewEventForm, setShowNewEventForm] = useState(false);

  // Searchable dropdown states
  const [sewadarSearch, setSewadarSearch] = useState("");
  const [showSewadarDropdown, setShowSewadarDropdown] = useState(false);
  const [focusedSewadarIndex, setFocusedSewadarIndex] = useState(-1);

  // Fetch all sewadars for the coordinator's center when the component mounts
  useEffect(() => {
    if (user?.role === "coordinator" && user.centerId) {
      // Fetch all sewadars for the coordinator's center with a high limit
      fetchSewadarsForCenter(user.centerId);
    }
  }, [user, fetchSewadarsForCenter]);

  // Auto-scroll to focused sewadar item within dropdown only
  useEffect(() => {
    if (focusedSewadarIndex >= 0 && showSewadarDropdown) {
      const focusedElement = document.getElementById(`sewadar-option-${focusedSewadarIndex}`);
      const dropdown = document.getElementById('sewadar-dropdown');

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
  }, [focusedSewadarIndex, showSewadarDropdown]);

  const [showTempSewadarForm, setShowTempSewadarForm] = useState(false);
  const [showNominalRollForm, setShowNominalRollForm] = useState(false);
  const [nominalRollImages, setNominalRollImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingAttendance, setExistingAttendance] = useState<any>(null);

  // Status overlay state
  const [statusOverlay, setStatusOverlay] = useState({
    isOpen: false,
    status: "loading" as "loading" | "success" | "error",
    message: "",
  });

  // Get current center ID - DRY helper function (still needed for sewadar fetching)
  const getCurrentCenterId = () => selectedCenter || user?.centerId || "";

  // Get current user ID - DRY helper function for attendance checking
  const getCurrentUserId = () => user?.id || "";

  // Get sewadars based on user role and selected center
  const getAvailableSewadars = () => {
    if (user?.role === "admin") {
      return selectedCenter ? getSewadarsForCenter(selectedCenter) : [];
    } else {
      return user?.centerId ? getSewadarsForCenter(user.centerId) : [];
    }
  };

  // Check if attendance exists for a specific event by current user - DRY function used by both useEffect and component
  const hasAttendanceForEvent = (eventId: string) => {
    const userId = getCurrentUserId();
    if (!userId) return false;
    return !!getExistingAttendanceForEventByUser(eventId, userId);
  };

  // Check for existing attendance when event changes (now based on user, not center)
  useEffect(() => {
    if (selectedEvent && selectedEvent !== "new" && getCurrentUserId()) {
      const userId = getCurrentUserId();
      const existing = getExistingAttendanceForEventByUser(selectedEvent, userId);
      setExistingAttendance(existing);
    } else {
      setExistingAttendance(null);
    }
  }, [selectedEvent, user?.id, getExistingAttendanceForEventByUser]);

  const availableSewadars = getAvailableSewadars();

  // Filter sewadars based on search
  const filteredSewadars = availableSewadars.filter(
    (sewadar) =>
      sewadar.name.toLowerCase().includes(sewadarSearch.toLowerCase()) ||
      sewadar.badgeNumber.toLowerCase().includes(sewadarSearch.toLowerCase()) ||
      sewadar.department.toLowerCase().includes(sewadarSearch.toLowerCase())
  );

  // Function to get next progressive badge number for temp sewadars
  const getNextTempBadgeNumber = (gender: "MALE" | "FEMALE", currentIndex: number = 0) => {
    const centerId = selectedCenter || user?.centerId || "";
    const badgePattern = generateBadgePattern(centerId, gender, true);

    // Get existing badges with this pattern
    const existingBadges = availableSewadars
      .filter(sewadar => sewadar.badgeNumber.startsWith(badgePattern))
      .map(sewadar => sewadar.badgeNumber);

    // Count how many temp sewadars of the same gender are being added before this one
    let sameGenderCountBefore = 0;
    for (let i = 0; i < currentIndex; i++) {
      const ts = tempSewadars[i];
      if (ts && ts.gender === gender && (ts.name.trim() || i === currentIndex)) {
        sameGenderCountBefore++;
      }
    }

    // Generate base next badge number from existing badges
    const baseNextBadge = getNextBadgeNumber(existingBadges, badgePattern);
    const baseNumber = parseInt(baseNextBadge.slice(-4));

    // Calculate the final badge number for this specific sewadar
    const finalNumber = baseNumber + sameGenderCountBefore;
    return `${badgePattern}${String(finalNumber).padStart(4, "0")}`;
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Store the event data before creating it
    const eventData = { ...newEvent };

    // Show loading toast
    toast({
      title: "Creating event...",
      description: "Please wait while we create your event",
    });

    try {
      // Make a direct API call to create the event and get the response
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      const result = await response.json();

      if (result.success && result.data && result.data._id) {
        // Reset form immediately
        setNewEvent({
          place: "",
          department: "",
          fromDate: getFormattedDate(0), // Current date
          toDate: getFormattedDate(4), // 4 days after current date
        });

        // Immediately set selectedEvent to empty to unmount the create form
        setSelectedEvent("");

        // Get the newly created event ID directly from the response
        const newEventId = result.data._id;

        // Wait a moment before selecting the event
        setTimeout(() => {
          // Select the newly created event
          setSelectedEvent(newEventId);

          toast({
            title: "Success",
            description: "Event created and selected successfully",
          });

          // Refresh events in the background to ensure everything is up to date
          fetchEvents();
        }, 300);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create event",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: "There was a problem creating the event",
        variant: "destructive",
      });
    }
  };





  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation for mandatory fields
    if (!selectedEvent) {
      toast({
        title: "Error",
        description: "Please select or create a sewa event",
        variant: "destructive",
      });
      return;
    }

    if (selectedSewadars.length === 0 && tempSewadars.every((ts) => !ts.name)) {
      toast({
        title: "Error",
        description:
          "Please select at least one sewadar or add temporary sewadars",
        variant: "destructive",
      });
      return;
    }

    // Nominal roll images are now optional

    // For admin users, ensure a center is selected
    if (user.role === "admin" && !selectedCenter) {
      toast({
        title: "Error",
        description: "Please select a center for attendance submission",
        variant: "destructive",
      });
      return;
    }

    const processedTempSewadars = tempSewadars
      .filter((ts) => ts.name && ts.fatherName)
      .map((ts, index) => ({
        id: `temp-${Date.now()}-${index}`,
        name: ts.name,
        fatherName: ts.fatherName,
        age: Number.parseInt(ts.age) || 0,
        gender: ts.gender,
        phone: ts.phone,
        tempBadge: getNextTempBadgeNumber(ts.gender, index),
      }));

    const selectedCenterData = centers.find((c) => c.code === selectedCenter);

    const attendanceData = {
      eventId: selectedEvent,
      centerId: selectedCenter || user.centerId || "",
      centerName: selectedCenterData?.name || user.centerName || "",
      sewadarIds: selectedSewadars,
      tempSewadars: processedTempSewadars,
      nominalRollImages,
    };

    setIsSubmitting(true);

    // Show loading overlay
    setStatusOverlay({
      isOpen: true,
      status: "loading",
      message: "Please wait while we submit your attendance...",
    });

    try {
      // Make direct API call to get more detailed response
      const formData = new FormData();
      formData.append("eventId", attendanceData.eventId);
      if (attendanceData.centerId) formData.append("centerId", attendanceData.centerId);
      if (attendanceData.centerName) formData.append("centerName", attendanceData.centerName);

      attendanceData.sewadarIds.forEach((id) => formData.append("sewadarIds[]", id));
      formData.append("tempSewadars", JSON.stringify(attendanceData.tempSewadars));

      attendanceData.nominalRollImages.forEach((file) => formData.append("nominalRollImages[]", file));

      const response = await fetch('/api/attendance', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Show success overlay
        let successMessage = "Your attendance has been submitted successfully!";

        // Add temp sewadar info if available
        if (result.tempSewadarInfo && result.tempSewadarInfo.length > 0) {
          successMessage += `\n\nTemporary sewadars added: ${result.tempSewadarInfo.join(", ")}`;
        }

        setStatusOverlay({
          isOpen: true,
          status: "success",
          message: successMessage,
        });

        // Reset form
        setSelectedEvent("");
        setSelectedSewadars([]);
        setTempSewadars([
          { name: "", fatherName: "", age: "", gender: "MALE", phone: "" },
        ]);
        setSewadarSearch("");
        setNominalRollImages([]);
        setShowTempSewadarForm(false);

        // Refresh data in background
        await fetchEvents();
      } else {
        // Show error overlay with specific error message
        setStatusOverlay({
          isOpen: true,
          status: "error",
          message: result.error || "Failed to submit attendance. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error submitting attendance:", error);
      // Show error overlay
      setStatusOverlay({
        isOpen: true,
        status: "error",
        message: "Network error occurred. Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTempSewadar = () => {
    setTempSewadars([
      ...tempSewadars,
      { name: "", fatherName: "", age: "", gender: "MALE", phone: "" },
    ]);
  };

  const removeTempSewadar = (index: number) => {
    if (tempSewadars.length > 1) {
      setTempSewadars(tempSewadars.filter((_, i) => i !== index));
    }
  };

  const updateTempSewadar = (index: number, field: string, value: string) => {
    const updated = [...tempSewadars];
    updated[index] = { ...updated[index], [field]: value };
    setTempSewadars(updated);
  };

  const toggleSewadarSelection = (sewadarId: string) => {
    if (selectedSewadars.includes(sewadarId)) {
      setSelectedSewadars(selectedSewadars.filter((id) => id !== sewadarId));
    } else {
      setSelectedSewadars([...selectedSewadars, sewadarId]);
    }
  };

  const removeSelectedSewadar = (sewadarId: string) => {
    setSelectedSewadars(selectedSewadars.filter((id) => id !== sewadarId));
  };

  const getSelectedSewadarDetails = () => {
    return availableSewadars.filter((sewadar) =>
      selectedSewadars.includes(sewadar._id)
    );
  };

  const handleCenterChange = async (centerId: string) => {
    setSelectedCenter(centerId);
    // Clear selected sewadars when center changes
    setSelectedSewadars([]);
    setSewadarSearch("");
    setShowSewadarDropdown(false);
    setFocusedSewadarIndex(-1);

    // Fetch sewadars for the selected center
    if (centerId && user?.role === "admin") {
      await fetchSewadarsForCenter(centerId);
    }
  };

  const handleCloseStatusOverlay = () => {
    setStatusOverlay({
      isOpen: false,
      status: "loading",
      message: "",
    });
  };

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6 px-2 md:px-0">
        <div>
          <h1 className="text-xl md:text-2xl text-gray-900">Add Attendance</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            Submit attendance for sewa events
          </p>
        </div>

        {/* Center Selection for Area Coordinators */}
        {user?.role === "admin" && (
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="flex items-center text-base md:text-lg">
                <Building2 className="mr-2 h-5 w-5" />
                Center *
              </CardTitle>
              <CardDescription>
                Choose the center for which you want to add attendance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  {/* <Label htmlFor="center">Center *</Label> */}
                  <Select
                    value={selectedCenter}
                    onValueChange={handleCenterChange}
                    disabled={loading.centers}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue
                        placeholder={
                          loading.centers ? (
                            <span className="flex items-center">
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                              Loading centers...
                            </span>
                          ) : (
                            "Select a center"
                          )
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {loading.centers ? (
                        <div className="flex items-center justify-center py-4">
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm text-gray-600">Loading centers...</span>
                        </div>
                      ) : centers.length > 0 ? (
                        centers.map((center) => (
                          <SelectItem key={center._id} value={center.code}>
                            {center.name} ({center.code})
                          </SelectItem>
                        ))
                      ) : (
                        <div className="flex items-center justify-center py-4">
                          <span className="text-sm text-gray-500">No centers available</span>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCenter && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">
                          Selected Center:{" "}
                          {centers.find((c) => c.code === selectedCenter)?.name}
                        </p>
                        <p className="text-sm text-blue-700">
                          Available Sewadars: {loading.sewadars ? (
                            <span className="inline-flex items-center">
                              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                              Loading...
                            </span>
                          ) : (
                            availableSewadars.length
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Event Selection/Creation - Only show if center is selected for admin or always for coordinator */}
        {(user?.role === "coordinator" ||
          (user?.role === "admin" && selectedCenter)) && (
            <Card className="enhanced-card">
              <CardHeader>
                <CardTitle className="flex items-center text-base md:text-lg">
                  <Calendar className="mr-2 h-5 w-5" />
                  Sewa *
                </CardTitle>
                <CardDescription>
                  Choose an existing event or create a new one
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  {/* <Label htmlFor="event">Sewa *</Label> */}
                  <div>
                    <SearchableEventSelect
                      events={events}
                      value={selectedEvent}
                      onValueChange={setSelectedEvent}
                      placeholder="Choose an event"
                      hasAttendance={hasAttendanceForEvent}
                    />
                  </div>

                  {/* Warning message for existing attendance */}
                  {existingAttendance && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 text-sm mb-2">
                        <strong>Note:</strong> You have already added the attendance for this sewa on{" "}
                        <strong>{new Date(existingAttendance.submittedAt).toLocaleDateString()}</strong> with{" "}
                        <strong>{existingAttendance.sewadars?.length || 0} sewadars</strong>.
                      </p>
                      <p className="text-red-800 text-sm">
                        Duplicate attendance submissions are not allowed. Please select a different sewa to add attendance.
                      </p>
                    </div>
                  )}
                </div>

                {selectedEvent === "new" && (
                  <div className="form-section bg-blue-50 border border-blue-200">
                    <h3 className="text-lg font-medium text-blue-900 mb-4">
                      Create New Event
                    </h3>
                    <form onSubmit={handleEventSubmit} className="space-y-4">
                      <div className="form-grid">
                        <div>
                          <Label htmlFor="place">Place *</Label>
                          <div className="mt-1">
                            <SearchablePlaceSelect
                              value={newEvent.place}
                              onValueChange={(value) => {
                                setNewEvent((prev) => ({
                                  ...prev,
                                  place: value,
                                }));
                              }}
                              placeholder="Search or add place"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="department">Department *</Label>
                          <div className="mt-1">
                            <SearchableDepartmentSelect
                              value={newEvent.department}
                              onValueChange={(value) => {
                                setNewEvent((prev) => ({
                                  ...prev,
                                  department: value,
                                }));
                              }}
                              placeholder="Search or add department"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="fromDate">From Date *</Label>
                          <Input
                            id="fromDate"
                            type="date"
                            value={newEvent.fromDate}
                            onChange={(e) =>
                              setNewEvent((prev) => ({
                                ...prev,
                                fromDate: e.target.value,
                              }))
                            }
                            required
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="toDate">To Date *</Label>
                          <Input
                            id="toDate"
                            type="date"
                            value={newEvent.toDate}
                            onChange={(e) =>
                              setNewEvent((prev) => ({
                                ...prev,
                                toDate: e.target.value,
                              }))
                            }
                            required
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="rssb-primary"
                        disabled={loading.events}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {loading.events ? "Creating..." : "Create Event"}
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        {selectedEvent &&
          selectedEvent !== "new" &&
          !existingAttendance &&
          (user?.role === "coordinator" ||
            (user?.role === "admin" && selectedCenter)) && (
            <form onSubmit={handleAttendanceSubmit} className="space-y-6">
              {/* Searchable Sewadar Selection */}
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle className="flex items-center text-base md:text-lg">
                    <Users className="mr-2 h-5 w-5" />
                    Select Sewadars
                  </CardTitle>
                  <CardDescription>
                    Search and select sewadars from{" "}
                    {user?.role === "admin"
                      ? centers.find((c) => c._id === selectedCenter)?.name
                      : user?.centerName}{" "}
                    ({availableSewadars.length} available)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Start typing to search sewadars by name, badge number or department"
                      value={sewadarSearch}
                      onChange={(e) => {
                        setSewadarSearch(e.target.value);
                        setShowSewadarDropdown(e.target.value.trim().length > 0);
                        setFocusedSewadarIndex(-1); // Reset focused index when search changes
                      }}
                      onFocus={() => {
                        if (sewadarSearch.trim()) {
                          setShowSewadarDropdown(true);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (showSewadarDropdown && sewadarSearch.trim() && filteredSewadars.length > 0) {
                          // Arrow down - move focus down
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setFocusedSewadarIndex((prev) =>
                              prev < filteredSewadars.length - 1 ? prev + 1 : prev
                            );
                          }
                          // Arrow up - move focus up
                          else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setFocusedSewadarIndex((prev) => (prev > 0 ? prev - 1 : 0));
                          }
                          // Enter - select the focused item
                          else if (e.key === "Enter" && focusedSewadarIndex >= 0) {
                            e.preventDefault();
                            const sewadar = filteredSewadars[focusedSewadarIndex];
                            if (sewadar) {
                              toggleSewadarSelection(sewadar._id);
                              setSewadarSearch("");
                              setShowSewadarDropdown(false);
                              setFocusedSewadarIndex(-1);
                              // Focus back on search input for next search
                              setTimeout(() => {
                                const searchInput = document.querySelector('input[placeholder*="Start typing to search sewadars"]') as HTMLInputElement;
                                if (searchInput) {
                                  searchInput.focus();
                                }
                              }, 100);
                            }
                          }
                          // Escape - close dropdown
                          else if (e.key === "Escape") {
                            e.preventDefault();
                            setShowSewadarDropdown(false);
                            setSewadarSearch("");
                            setFocusedSewadarIndex(-1);
                          }
                        }
                      }}
                      className="pl-10"
                    />
                  </div>

                  {/* Searchable Dropdown */}
                  {showSewadarDropdown && sewadarSearch.trim() && (
                    <div className="relative">
                      <div
                        id="sewadar-dropdown"
                        className="absolute top-0 left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      >
                        {filteredSewadars.length > 0 ? (
                          filteredSewadars.map((sewadar, index) => (
                            <div
                              key={sewadar._id}
                              id={`sewadar-option-${index}`}
                              className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${focusedSewadarIndex === index
                                ? "bg-blue-50"
                                : "hover:bg-gray-50"
                                }`}
                              onClick={() => {
                                if (!selectedSewadars.includes(sewadar._id)) {
                                  toggleSewadarSelection(sewadar._id);
                                  // Clear search and close dropdown
                                  setSewadarSearch("");
                                  setShowSewadarDropdown(false);
                                  setFocusedSewadarIndex(-1);
                                  // Focus back on search input for next search
                                  setTimeout(() => {
                                    const searchInput = document.querySelector('input[placeholder*="Start typing to search sewadars"]') as HTMLInputElement;
                                    if (searchInput) {
                                      searchInput.focus();
                                    }
                                  }, 100);
                                } else {
                                  // If already selected, remove from selection
                                  toggleSewadarSelection(sewadar._id);
                                }
                              }}
                              onMouseEnter={() => setFocusedSewadarIndex(index)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {sewadar.name} / {sewadar.fatherHusbandName}
                                  </p>
                                  <p className="text-sm text-gray-600 font-mono">
                                    {sewadar.badgeNumber}
                                  </p>
                                  <div className="flex items-center space-x-2">
                                    <p className="text-sm text-gray-500">
                                      {sewadar.department}
                                    </p>
                                    {sewadar.age && (
                                      <span className="text-sm text-gray-500">
                                        | {sewadar.age}Y
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {selectedSewadars.includes(sewadar._id) && (
                                  <Badge variant="secondary">Selected</Badge>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            No sewadars found matching your search
                          </div>
                        )
                        }
                        {/* Close dropdown button */}
                        <div className="border-t border-gray-200 p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowSewadarDropdown(false);
                              setSewadarSearch("");
                              setFocusedSewadarIndex(-1);
                            }}
                            className="w-full text-gray-500 hover:text-gray-700"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Close
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Selected Sewadars */}
                  {selectedSewadars.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">
                        Selected Sewadars ({selectedSewadars.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {getSelectedSewadarDetails().map((sewadar) => (
                          <div
                            key={sewadar._id}
                            className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {sewadar.name} / {sewadar.fatherHusbandName}
                              </p>
                              <p className="text-sm text-gray-600 font-mono">
                                {sewadar.badgeNumber}
                              </p>
                              <div className="flex items-center space-x-2">
                                <p className="text-sm text-gray-500">
                                  {sewadar.department}
                                </p>
                                {sewadar.age && (
                                  <span className="text-sm text-gray-500">
                                    | {sewadar.age}Y
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSelectedSewadar(sewadar._id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableSewadars.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p>No sewadars found for the selected center</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Temporary Sewadars Button and Form */}
              <Card className="enhanced-card mt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 py-2 md:py-0">
                  <CardHeader className="pb-2 md:pb-6">
                    <CardTitle className="flex items-center text-base md:text-lg">
                      <UserPlus className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                      Temporary Sewadars
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Add new temporary sewadars in the system
                    </CardDescription>
                  </CardHeader>
                  <div className="px-6 md:px-0 md:mr-6 mb-6 md:mb-0">
                    <Button
                      type="button"
                      onClick={() =>
                        setShowTempSewadarForm(!showTempSewadarForm)
                      }
                      variant={showTempSewadarForm ? "secondary" : "default"}
                      className="w-full md:w-auto rssb-primary text-sm hover:bg-blue-700 active:bg-blue-800"
                      size="sm"
                    >
                      {showTempSewadarForm ? (
                        <>
                          <X className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                          <span className="hidden md:inline">Close Form</span>
                          <span className="md:hidden">Close</span>
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                          <span className="hidden md:inline">Add Temporary Sewadars</span>
                          <span className="md:hidden">Add Temporary</span>
                        </>
                      )}
                      {tempSewadars.filter((ts) => ts.name).length > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {tempSewadars.filter((ts) => ts.name).length}
                        </Badge>
                      )}
                    </Button>
                  </div>
                </div>

                {showTempSewadarForm && (
                  <CardContent className="space-y-4 pt-0 border-t">
                    {tempSewadars.map((tempSewadar, index) => (
                      <div key={index} className="form-section">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-gray-900">
                            Temporary Sewadar #{index + 1}
                          </h4>
                          {tempSewadars.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeTempSewadar(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="mr-1 h-4 w-4" />
                              Remove
                            </Button>
                          )}
                        </div>
                        <div className="form-grid">
                          <div>
                            <Label>Name *</Label>
                            <Input
                              value={tempSewadar.name}
                              onChange={(e) =>
                                updateTempSewadar(index, "name", e.target.value?.toUpperCase())
                              }
                              placeholder="Full name"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Father / Husband Name *</Label>
                            <Input
                              value={tempSewadar.fatherName}
                              onChange={(e) =>
                                updateTempSewadar(
                                  index,
                                  "fatherName",
                                  e.target.value?.toUpperCase()
                                )
                              }
                              placeholder="Father / Husband Name"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Age *</Label>
                            <Input
                              type="number"
                              value={tempSewadar.age}
                              onChange={(e) =>
                                updateTempSewadar(index, "age", e.target.value)
                              }
                              placeholder="Age"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Gender *</Label>
                            <Select
                              value={tempSewadar.gender}
                              onValueChange={(value: "MALE" | "FEMALE") =>
                                updateTempSewadar(index, "gender", value)
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MALE">Male</SelectItem>
                                <SelectItem value="FEMALE">Female</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Phone</Label>
                            <Input
                              value={tempSewadar.phone}
                              onChange={(e) =>
                                updateTempSewadar(
                                  index,
                                  "phone",
                                  e.target.value
                                )
                              }
                              placeholder="Phone number (optional)"
                              className="mt-1"
                            />
                          </div>
                        </div>
                        {tempSewadar.name && tempSewadar.gender && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                              Auto-generated badge:
                              <span className="font-mono font-medium ml-2 text-blue-600">
                                {getNextTempBadgeNumber(tempSewadar.gender, index)}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addTempSewadar}
                      className="w-full bg-transparent"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Another Temporary Sewadar
                    </Button>
                  </CardContent>
                )}
              </Card>

              {/* Nominal Roll Images - Optional */}
              <Card className="enhanced-card mt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 py-2 md:py-0">
                  <CardHeader className="pb-2 md:pb-6">
                    <CardTitle className="flex items-center text-base md:text-lg">
                      <FileImage className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                      Nominal Roll Images
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Upload nominal roll images
                    </CardDescription>
                  </CardHeader>
                  <div className="px-6 md:px-0 md:mr-6 mb-6 md:mb-0">
                    <Button
                      type="button"
                      onClick={() => {
                        if (!showNominalRollForm) {
                          // If form is closed, open it and trigger file picker
                          setShowNominalRollForm(true);
                          // Use setTimeout to ensure the form is rendered before triggering file picker
                          setTimeout(() => {
                            document.getElementById("nominal-roll-upload")?.click();
                          }, 100);
                        } else {
                          // If form is open, just close it
                          setShowNominalRollForm(false);
                        }
                      }}
                      variant={showNominalRollForm ? "secondary" : "default"}
                      className="w-full md:w-auto rssb-primary text-sm hover:bg-blue-700 active:bg-blue-800"
                      size="sm"
                    >
                      {showNominalRollForm ? (
                        <>
                          <X className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                          <span className="hidden md:inline">Close Form</span>
                          <span className="md:hidden">Close</span>
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                          <span className="hidden md:inline">Add Nominal Roll Images</span>
                          <span className="md:hidden">Add Images</span>
                        </>
                      )}
                      {nominalRollImages.length > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {nominalRollImages.length}
                        </Badge>
                      )}
                    </Button>
                  </div>
                </div>

                {showNominalRollForm && (
                  <CardContent className="space-y-4 pt-0 border-t">
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                        <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium text-gray-700 mb-2">
                          Upload Images
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                          Click to upload or drag and drop multiple images
                        </p>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            handleImageUpload(
                              e.target.files,
                              setNominalRollImages,
                              toast
                            );
                          }}
                          className="hidden"
                          id="nominal-roll-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            document
                              .getElementById("nominal-roll-upload")
                              ?.click()
                          }
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Choose Images
                        </Button>
                      </div>

                      {nominalRollImages.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <h4 className="font-medium text-gray-900 mb-3">
                            Selected Images ({nominalRollImages.length})
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {nominalRollImages.map((file, index) => (
                              <div
                                key={index}
                                className="relative p-3 bg-white rounded-lg border"
                              >
                                <div className="flex items-center space-x-2">
                                  <FileImage className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600 truncate">
                                    {file.name}
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newImages = nominalRollImages.filter(
                                      (_, i) => i !== index
                                    );
                                    setNominalRollImages(newImages);
                                  }}
                                  className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-red-100 hover:bg-red-200 text-red-600 rounded-full"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">
                          Image Upload Guidelines:
                        </h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>
                            • Upload clear, readable images of nominal roll
                          </li>
                          <li>• Supported formats: JPG, PNG, JPEG</li>
                          <li>• Maximum file size: 5MB per image</li>
                          <li>• Images are optional but recommended for record keeping</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Submit Button */}
              <div className="flex flex-col md:flex-row md:justify-end gap-4 md:gap-4 pt-6 px-4 md:px-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedEvent("");
                    setSelectedSewadars([]);
                    setTempSewadars([
                      {
                        name: "",
                        fatherName: "",
                        age: "",
                        gender: "MALE",
                        phone: "",
                      },
                    ]);
                    setSewadarSearch("");
                    setNominalRollImages([]);
                    setShowTempSewadarForm(false);
                    setShowSewadarDropdown(false);
                    setFocusedSewadarIndex(-1);
                  }}
                  disabled={isSubmitting}
                  className="w-full md:w-auto order-2 md:order-1 hover:bg-gray-50 active:bg-gray-100"
                  size="lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full md:w-auto rssb-primary order-1 md:order-2 hover:bg-blue-700 active:bg-blue-800"
                  size="lg"
                  disabled={isSubmitting}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Submitting..." : "Submit Attendance"}
                </Button>
              </div>
            </form>
          )}

        {/* Instructions for Area Coordinators */}
        {user?.role === "admin" && !selectedCenter && (
          <Card className="enhanced-card bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900 text-base md:text-lg">Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-blue-800">
              <p>
                • As an Area Coordinator, you can manage attendance for all
                centers in your area
              </p>
              <p>
                • First, select a center from the dropdown above to view
                available sewadars
              </p>
              <p>
                • You can then create or select events and add attendance for
                that specific center
              </p>
              <p>
                • All mandatory fields must be completed before submitting
                attendance
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status Overlay */}
      <AttendanceStatusOverlay
        isOpen={statusOverlay.isOpen}
        status={statusOverlay.status}
        message={statusOverlay.message}
        onClose={handleCloseStatusOverlay}
      />
    </Layout>
  );
}
