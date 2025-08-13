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
  ChevronDown,
  ChevronUp,
  Eye,
  Crop as CropIcon,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const validateImageFile = (file: File): boolean => {
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const maxSize = 10 * 1024 * 1024; // 10MB (increased to allow larger files before compression)

  if (!validTypes.includes(file.type)) {
    return false;
  }

  if (file.size > maxSize) {
    return false;
  }

  return true;
};

// Image compression function
const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, '.jpg'),
              {
                type: 'image/jpeg',
                lastModified: Date.now()
              }
            );
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback to original if compression fails
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => resolve(file); // Fallback to original if loading fails
    img.src = URL.createObjectURL(file);
  });
};

const handleImageUpload = async (
  files: FileList | null,
  setImages: (images: File[]) => void,
  currentImages: File[],
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
    try {
      // Compress images
      const compressedFiles = await Promise.all(
        validFiles.map(file => compressImage(file))
      );

      // Append to existing images instead of replacing
      setImages([...currentImages, ...compressedFiles]);

      // Calculate compression savings
      const originalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
      const compressedSize = compressedFiles.reduce((sum, file) => sum + file.size, 0);
      const savings = Math.round(((originalSize - compressedSize) / originalSize) * 100);

      toast({
        title: "Success",
        description: `${validFiles.length} image(s) uploaded and optimized (${savings}% size reduction)`,
      });
    } catch (error) {
      // Fallback to original files if compression fails
      setImages([...currentImages, ...validFiles]);
      toast({
        title: "Success",
        description: `${validFiles.length} image(s) uploaded successfully`,
      });
    }
  }
};

// Helper function to get date in YYYY-MM-DD format
const getFormattedDate = (daysOffset: number = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

// Crop functionality functions using react-image-crop
const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop): Promise<File> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Canvas is empty');
      }
      const file = new File([blob], 'cropped-image.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
      resolve(file);
    }, 'image/jpeg', 0.9);
  });
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
    addPlace,
    addDepartment,
    fetchEvents,
    fetchEventsForAttendance,
    fetchAttendance,
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
      isCollapsed: false,
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

  // Fetch all events for attendance dropdown when component mounts
  useEffect(() => {
    if (user) {
      // Load all events for attendance (not filtered by center participation)
      fetchEventsForAttendance({ limit: 1000 });
    }
  }, [user, fetchEventsForAttendance]);

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
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showCropMode, setShowCropMode] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingAttendance, setExistingAttendance] = useState<any>(null);

  // Status overlay state
  const [statusOverlay, setStatusOverlay] = useState({
    isOpen: false,
    status: "loading" as "loading" | "success" | "error",
    message: "",
    attendanceData: undefined as {
      eventName?: string;
      eventDate?: string;
      totalSewadars?: number;
      nominalRollImages?: number;
      newTempSewadars?: number;
      existingTempSewadars?: Array<{ name: string; fatherName: string }>;
    } | undefined,
  });

  // Usage instructions state
  const [showSewaInstructions, setShowSewaInstructions] = useState(false);
  const [showSewadarInstructions, setShowSewadarInstructions] = useState(false);
  const [showTempSewadarInstructions, setShowTempSewadarInstructions] = useState(false);
  const [showCreateEventInstructions, setShowCreateEventInstructions] = useState(false);
  const [showNominalRollInstructions, setShowNominalRollInstructions] = useState(false);
  const [showCenterInstructions, setShowCenterInstructions] = useState(false);

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
      sewadar.fatherHusbandName.toLowerCase().includes(sewadarSearch.toLowerCase()) ||
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
          fetchEventsForAttendance();
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

    // Show confirmation overlay first
    const selectedEventData = events.find(e => e._id === selectedEvent);
    const selectedCenterData = centers.find((c) => c.code === selectedCenter);
    const selectedSewadarDetails = getSelectedSewadarDetails();
    const validTempSewadars = tempSewadars.filter(ts => ts.name.trim() && ts.fatherName.trim());
    const totalSewadars = selectedSewadars.length + validTempSewadars.length;

    setStatusOverlay({
      isOpen: true,
      status: "confirm",
      message: "Please review the details before submitting",
      attendanceData: {
        eventName: selectedEventData ? `${selectedEventData.place} - ${selectedEventData.department}` : "",
        eventDate: selectedEventData ? (() => {
          if (!selectedEventData.fromDate) return "";
          
          const fromDate = new Date(selectedEventData.fromDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          
          if (selectedEventData.toDate) {
            const toDate = new Date(selectedEventData.toDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            
            // Only show "to" if dates are different
            if (toDate !== fromDate) {
              return `${fromDate} to ${toDate}`;
            }
          }
          
          return fromDate;
        })() : "",
        totalSewadars,
        nominalRollImages: nominalRollImages.length,
        selectedSewadars: selectedSewadarDetails,
        tempSewadars: validTempSewadars,
      },
    });
  };

  const handleConfirmSubmission = async () => {
    if (!user) return;

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
      attendanceData: undefined,
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
        // Get event details
        const selectedEventData = events.find(e => e._id === selectedEvent);

        // Get existing temp sewadars (those with names filled but not newly created)
        const existingTempSewadarsData = tempSewadars
          .filter(ts => ts.name.trim() && ts.fatherName.trim())
          .map(ts => ({ name: ts.name, fatherName: ts.fatherName }));

        // Calculate total sewadars (existing selected + all temp sewadars with names)
        const totalSewadars = selectedSewadars.length + tempSewadars.filter(ts => ts.name.trim()).length;

        // Count new temp sewadars created (from API response)
        const newTempSewadarsCount = result.tempSewadarInfo ? result.tempSewadarInfo.length : 0;
        
        // Extract new temp sewadars names from API response
        const newTempSewadarsList = result.tempSewadarInfo ? 
          result.tempSewadarInfo
            .filter((info: string) => info.includes('Created'))
            .map((info: string) => {
              // Extract name and father name from strings like "Name / Father Name) - Created (Badge)"
              const match = info.match(/^(.+?) \/ (.+?)\) - Created/);
              return match ? { name: match[1], fatherName: match[2] } : null;
            })
            .filter(Boolean) : [];

        // Format event date
        const eventDate = selectedEventData?.date ? new Date(selectedEventData.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : undefined;

        setStatusOverlay({
          isOpen: true,
          status: "success",
          message: "Your attendance has been submitted successfully!",
          attendanceData: {
            eventName: selectedEventData?.name,
            eventDate,
            totalSewadars,
            nominalRollImages: nominalRollImages.length,
            newTempSewadars: newTempSewadarsCount,
            newTempSewadarsList: newTempSewadarsList,
            existingTempSewadars: existingTempSewadarsData,
          },
        });

        // Reset form
        setSelectedEvent("");
        setSelectedSewadars([]);
        setTempSewadars([
          { name: "", fatherName: "", age: "", gender: "MALE", phone: "", isCollapsed: false },
        ]);
        setSewadarSearch("");
        setNominalRollImages([]);
        setShowTempSewadarForm(false);

        // Refresh data in background
        const refreshPromises = [
          fetchEventsForAttendance(),
          fetchAttendance()
        ];

        // If temporary sewadars were created, refresh the sewadars list for the center
        if (result.tempSewadarInfo && result.tempSewadarInfo.length > 0) {
          const centerToRefresh = selectedCenter || user.centerId;
          if (centerToRefresh) {
            refreshPromises.push(fetchSewadarsForCenter(centerToRefresh));
          }
        }

        await Promise.all(refreshPromises);
      } else {
        // Show error overlay with specific error message
        setStatusOverlay({
          isOpen: true,
          status: "error",
          message: result.error || "Failed to submit attendance. Please try again.",
          attendanceData: undefined,
        });
      }
    } catch (error) {
      console.error("Error submitting attendance:", error);
      // Show error overlay
      setStatusOverlay({
        isOpen: true,
        status: "error",
        message: "Network error occurred. Please check your connection and try again.",
        attendanceData: undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTempSewadar = () => {
    // Collapse all previous temp sewadars that have required fields filled
    const updatedTempSewadars = tempSewadars.map((ts, index) => {
      if (ts.name.trim() && ts.fatherName.trim() && ts.age && ts.gender) {
        return { ...ts, isCollapsed: true };
      }
      return ts;
    });

    setTempSewadars([
      ...updatedTempSewadars,
      { name: "", fatherName: "", age: "", gender: "MALE", phone: "", isCollapsed: false },
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

  const toggleTempSewadarCollapse = (index: number) => {
    const updated = [...tempSewadars];
    updated[index] = { ...updated[index], isCollapsed: !updated[index].isCollapsed };
    setTempSewadars(updated);
  };

  // Auto-collapse last temp sewadar when moving to nominal roll section
  useEffect(() => {
    if (showNominalRollForm) {
      const lastIndex = tempSewadars.length - 1;
      if (lastIndex >= 0) {
        const tempSewadar = tempSewadars[lastIndex];
        if (tempSewadar.name.trim() && tempSewadar.fatherName.trim() && tempSewadar.age && tempSewadar.gender) {
          const updated = [...tempSewadars];
          updated[lastIndex] = { ...updated[lastIndex], isCollapsed: true };
          setTempSewadars(updated);
        }
      }
    }
  }, [showNominalRollForm]);

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
      attendanceData: undefined,
    });
  };

  // Navigation handlers
  const goToPrevious = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
      setShowCropMode(false);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setZoomLevel(1);
    }
  };

  const goToNext = () => {
    if (selectedImageIndex !== null && selectedImageIndex < nominalRollImages.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
      setShowCropMode(false);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setZoomLevel(1);
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const resetZoom = () => {
    setZoomLevel(1);
  };

  // Crop handlers
  const applyCrop = async () => {
    if (selectedImageIndex === null || !nominalRollImages[selectedImageIndex] || !completedCrop) return;

    if (completedCrop.width < 10 || completedCrop.height < 10) {
      toast({
        title: "Invalid Crop Area",
        description: "Please select a larger area to crop.",
        variant: "destructive",
      });
      return;
    }

    try {
      const imgElement = document.querySelector('.crop-target-image') as HTMLImageElement;
      if (!imgElement) {
        throw new Error('Image element not found');
      }

      const croppedFile = await getCroppedImg(imgElement, completedCrop);

      const newImages = [...nominalRollImages];
      newImages[selectedImageIndex] = croppedFile;
      setNominalRollImages(newImages);

      setShowCropMode(false);
      setCrop(undefined);
      setCompletedCrop(undefined);

      toast({
        title: "Image Cropped",
        description: "The image has been successfully cropped.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Crop Failed",
        description: "Failed to crop the image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const cancelCrop = () => {
    setShowCropMode(false);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setZoomLevel(1);
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

                {/* Show Usage Instructions Button */}
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCenterInstructions(!showCenterInstructions)}
                    className="text-xs text-gray-500 hover:text-gray-700 p-0 h-auto font-medium"
                  >
                    <span className="mr-1">Show Usage Instructions</span>
                    {showCenterInstructions ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </Button>
                </div>

                {/* Usage Instructions - Expandable */}
                {showCenterInstructions && (
                  <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3 text-sm">Center Selection Instructions:</h4>
                    <ul className="text-xs text-blue-800 space-y-2">
                      <li>• <strong>Area Coordinator Access:</strong> As an Area Coordinator, you can manage attendance for all centers in your area</li>
                      <li>• <strong>Select Center:</strong> Choose a center from the dropdown to view available sewadars for that center</li>
                      <li>• <strong>View Sewadars:</strong> After selecting a center, you can see the number of available sewadars</li>
                      <li>• <strong>Create Events:</strong> You can then create or select events and add attendance for the specific center</li>
                      <li>• <strong>Required Fields:</strong> All mandatory fields must be completed before submitting attendance</li>
                    </ul>

                    <div className="mt-4 p-3 bg-blue-100 rounded-md">
                      <p className="text-xs text-blue-900">
                        <strong>💡 Pro Tip:</strong> Select the center first to unlock all other attendance management features for that specific center.
                      </p>
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
                      loading={loading.events}
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

                    {/* Show Usage Instructions Button */}
                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreateEventInstructions(!showCreateEventInstructions)}
                        className="text-xs text-gray-500 hover:text-gray-700 p-0 h-auto font-medium"
                      >
                        <span className="mr-1">Show Usage Instructions</span>
                        {showCreateEventInstructions ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </Button>
                    </div>

                    {/* Usage Instructions - Expandable */}
                    {showCreateEventInstructions && (
                      <div className="mt-3 p-4 bg-blue-100 border border-blue-300 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-3 text-sm">Create New Event Instructions:</h4>
                        <ul className="text-xs text-blue-800 space-y-2">
                          <li>• <strong>Search Place:</strong> Type in the place field to search for existing places</li>
                          <li>• <strong>Add New Place:</strong> If place is not present, type the new place name and click "+Add" option</li>
                          <li>• <strong>Search Department:</strong> Type in the department field to search for existing departments</li>
                          <li>• <strong>Add New Department:</strong> If department is not present, type the new department name and click "+Add" option</li>
                          <li>• <strong>Set Dates:</strong> Choose appropriate from date and to date for the sewa event</li>
                        </ul>

                        <div className="mt-4 p-3 bg-blue-200 rounded-md">
                          <p className="text-xs text-blue-900">
                            <strong>💡 Pro Tip:</strong> When adding new places or departments, make sure to use proper naming conventions like "BEAS" or "RIVER" for consistency.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Show Usage Instructions Button */}
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSewaInstructions(!showSewaInstructions)}
                    className="text-xs text-gray-500 hover:text-gray-700 p-0 h-auto font-medium"
                  >
                    <span className="mr-1">Show Usage Instructions</span>
                    {showSewaInstructions ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </Button>
                </div>

                {/* Usage Instructions - Expandable */}
                {showSewaInstructions && (
                  <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3 text-sm">Sewa Instructions:</h4>
                    <ul className="text-xs text-blue-800 space-y-2">
                      <li>• <strong>Search Events:</strong> Type in the dropdown to search for existing sewa events by place, department, or dates</li>
                      <li>• <strong>Create New Event:</strong> If you don't see the required event with the same dates, click on "Create new event" option shown at the end of the dropdown</li>
                      <li>• <strong>Event Details:</strong> When creating a new event, provide place, department, from date, and to date</li>
                    </ul>

                    <div className="mt-4 p-3 bg-blue-100 rounded-md">
                      <p className="text-xs text-blue-900">
                        <strong>💡 Pro Tip:</strong> Use specific search terms like "Beas Langar" or "Sikanderpur Hospital" to quickly find relevant events.
                      </p>
                    </div>
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

                  {/* Show Usage Instructions Button */}
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSewadarInstructions(!showSewadarInstructions)}
                      className="text-xs text-gray-500 hover:text-gray-700 p-0 h-auto font-medium"
                    >
                      <span className="mr-1">Show Usage Instructions</span>
                      {showSewadarInstructions ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </div>

                  {/* Usage Instructions - Expandable */}
                  {showSewadarInstructions && (
                    <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-3 text-sm">Select Sewadars Instructions:</h4>
                      <ul className="text-xs text-blue-800 space-y-2">
                        <li>• <strong>Search Sewadars:</strong> Type in the search box to find sewadars by name, father name, badge number or department</li>
                        <li>• <strong>Badge Types:</strong> All open, permanent, and temporary sewadars can be searched in the list</li>
                        <li>• <strong>Multiple Selection:</strong> Click on sewadars to select multiple ones for attendance</li>
                        <li>• <strong>Remove Selection:</strong> Click the X button next to selected sewadars to remove them</li>
                      </ul>

                      <div className="mt-4 p-3 bg-blue-100 rounded-md">
                        <p className="text-xs text-blue-900">
                          <strong>💡 Pro Tip:</strong> Use partial names like "Raj" to find all sewadars with names containing "Raj", or search by badge numbers like "GA0001".
                        </p>
                      </div>
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
                      New Temporary Sewadars
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
                          <span className="md:hidden">Add Sewadars</span>
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
                    {tempSewadars.map((tempSewadar, index) => {
                      const isComplete = tempSewadar.name.trim() && tempSewadar.fatherName.trim() && tempSewadar.age && tempSewadar.gender;

                      if (tempSewadar.isCollapsed && isComplete) {
                        // Collapsed card view
                        return (
                          <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors" onClick={() => toggleTempSewadarCollapse(index)}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-green-900 text-sm md:text-base">
                                  {tempSewadar.name} / {tempSewadar.fatherName}
                                </div>
                                <div className="text-green-700 text-xs md:text-sm mt-1">
                                  {getNextTempBadgeNumber(tempSewadar.gender, index)}
                                </div>
                                <div className="text-green-600 text-xs mt-1">
                                  {tempSewadar.gender} | {tempSewadar.age}Y
                                </div>
                              </div>
                              <div className="flex items-center">
                                {tempSewadars.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeTempSewadar(index);
                                    }}
                                    className="text-red-600 hover:text-red-700 p-1"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Expanded form view
                      return (
                        <div key={index} className="form-section">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-gray-900">
                              Temporary Sewadar #{index + 1}
                            </h4>
                            <div className="flex items-center space-x-1">
                              {isComplete && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleTempSewadarCollapse(index)}
                                  className="text-gray-600 hover:text-gray-700 p-1"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                              )}
                              {tempSewadars.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTempSewadar(index)}
                                  className="text-red-600 hover:text-red-700 p-1"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
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
                      );
                    })}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addTempSewadar}
                      className="w-full bg-transparent"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Another Temporary Sewadar
                    </Button>

                    {/* Show Usage Instructions Button */}
                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTempSewadarInstructions(!showTempSewadarInstructions)}
                        className="text-xs text-gray-500 hover:text-gray-700 p-0 h-auto font-medium"
                      >
                        <span className="mr-1">Show Usage Instructions</span>
                        {showTempSewadarInstructions ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </Button>
                    </div>

                    {/* Usage Instructions - Expandable */}
                    {showTempSewadarInstructions && (
                      <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-3 text-sm">New Temporary Sewadars Instructions:</h4>
                        <ul className="text-xs text-blue-800 space-y-2">
                          <li>• <strong>Add New Sewadars:</strong> Fill in name, father name, age, gender, and phone (optional) to add new temporary sewadars</li>
                          <li>• <strong>Auto Badge Generation:</strong> System automatically generates new temporary badge numbers based on center and gender</li>
                          <li>• <strong>Multiple Additions:</strong> Click "Add Another Temporary Sewadar" to add multiple sewadars at once</li>
                          <li>• <strong>Future Searches:</strong> Newly added temporary sewadars can be searched in the sewadar list from next time</li>
                        </ul>

                        <div className="mt-4 p-3 bg-blue-100 rounded-md">
                          <p className="text-xs text-blue-900">
                            <strong>💡 Pro Tip:</strong> Fill in all required fields (name, father name, age, gender) to see the auto-generated badge number preview.
                          </p>
                        </div>
                      </div>
                    )}
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
                              nominalRollImages,
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
                          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {nominalRollImages.map((file, index) => (
                              <div
                                key={index}
                                className="relative bg-white rounded-lg border overflow-hidden group"
                              >
                                <div
                                  className="aspect-square relative cursor-pointer"
                                  onClick={() => {
                                    setSelectedImageIndex(index);
                                    setShowImagePreview(true);
                                  }}
                                >
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={file.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center pointer-events-none">
                                    <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1 pointer-events-none">
                                    <span className="text-xs truncate block">
                                      {file.name}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Show Usage Instructions Button */}
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowNominalRollInstructions(!showNominalRollInstructions)}
                          className="text-xs text-gray-500 hover:text-gray-700 p-0 h-auto font-medium"
                        >
                          <span className="mr-1">Show Usage Instructions</span>
                          {showNominalRollInstructions ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                      </div>

                      {/* Usage Instructions - Expandable */}
                      {showNominalRollInstructions && (
                        <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-3 text-sm">Nominal Roll Images Instructions:</h4>
                          <ul className="text-xs text-blue-800 space-y-2">
                            <li>• <strong>Upload Images:</strong> Click "Take Photo" to capture nominal roll photos or select from library</li>
                            <li>• <strong>Image Quality:</strong> Upload clear, readable images of nominal roll for better record keeping</li>
                            <li>• <strong>File Formats:</strong> Supported formats are JPG, PNG, JPEG, and WebP</li>
                            <li>• <strong>File Size:</strong> Maximum file size is 10MB per image (automatically compressed for faster upload)</li>
                            <li>• <strong>Auto-Optimization:</strong> Images are automatically compressed to reduce upload time</li>
                            <li>• <strong>Optional:</strong> Images are optional but recommended for attendance verification</li>
                            <li>• <strong>Remove Images:</strong> Click the X button on any image to remove it from selection</li>
                          </ul>

                          <div className="mt-4 p-3 bg-blue-100 rounded-md">
                            <p className="text-xs text-blue-900">
                              <strong>💡 Pro Tip:</strong> Take clear photos of the nominal rolls. Images are automatically optimized for faster upload on slow networks.
                            </p>
                          </div>
                        </div>
                      )}
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
                        isCollapsed: false,
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


      </div>

      {/* Image Preview Modal */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-y-auto">
          <DialogHeader className="p-6 pb-4 sticky top-0 bg-white z-20 border-b">
            <DialogTitle>
              Image Preview {selectedImageIndex !== null && `(${selectedImageIndex + 1} of ${nominalRollImages.length})`}
            </DialogTitle>
          </DialogHeader>
          {selectedImageIndex !== null && nominalRollImages[selectedImageIndex] && (
            <div className="flex flex-col">
              {/* Image Container with Navigation */}
              <div className="relative bg-gray-100 overflow-hidden px-6 pt-4 pb-4">
                <div className={`relative flex items-center justify-center ${showCropMode ? 'min-h-[60vh] sm:min-h-[70vh]' : 'min-h-[50vh] sm:min-h-[60vh]'}`}>
                  {/* Previous Button */}
                  {!showCropMode && nominalRollImages.length > 1 && selectedImageIndex > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPrevious}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Image with Crop */}
                  <div className="relative w-full h-full">
                    {showCropMode ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <ReactCrop
                          crop={crop}
                          onChange={(_, percentCrop) => setCrop(percentCrop)}
                          onComplete={(c) => setCompletedCrop(c)}
                          aspect={undefined}
                          minWidth={10}
                          minHeight={10}
                        >
                          <img
                            src={URL.createObjectURL(nominalRollImages[selectedImageIndex])}
                            alt={nominalRollImages[selectedImageIndex].name}
                            className="crop-target-image max-w-full max-h-full object-contain"
                          />
                        </ReactCrop>
                      </div>
                    ) : (
                      <div
                        className="w-full h-full overflow-auto"
                        style={{
                          cursor: zoomLevel > 1 ? 'grab' : 'default'
                        }}
                      >
                        <div 
                          className="flex items-center justify-center min-h-full"
                          style={{
                            padding: zoomLevel > 1 ? `${50 * zoomLevel}px` : '0'
                          }}
                        >
                          <img
                            src={URL.createObjectURL(nominalRollImages[selectedImageIndex])}
                            alt={nominalRollImages[selectedImageIndex].name}
                            className="crop-target-image transition-all duration-200 object-contain"
                            style={{
                              transform: `scale(${zoomLevel})`,
                              maxWidth: zoomLevel <= 1 ? '100%' : 'none',
                              maxHeight: zoomLevel <= 1 ? '100%' : 'none'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Zoom Controls - Only show in non-crop mode */}
                  {!showCropMode && (
                    <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= 3}
                        className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-lg"
                      >
                        <ZoomIn className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= 0.5}
                        className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-lg"
                      >
                        <ZoomOut className="h-3 w-3" />
                      </Button>
                      {zoomLevel !== 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetZoom}
                          className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-lg"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Next Button */}
                  {!showCropMode && nominalRollImages.length > 1 && selectedImageIndex < nominalRollImages.length - 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNext}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Image Dots Indicator */}
                {!showCropMode && nominalRollImages.length > 1 && (
                  <div className="flex justify-center space-x-2 mt-4 pb-4">
                    {nominalRollImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedImageIndex(index);
                          setShowCropMode(false);
                          setCrop(undefined);
                          setCompletedCrop(undefined);
                          setZoomLevel(1);
                        }}
                        className={`w-2 h-2 rounded-full transition-colors ${index === selectedImageIndex ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="p-6 bg-white border-t sticky bottom-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">{nominalRollImages[selectedImageIndex].name}</p>
                    <p>Size: {(nominalRollImages[selectedImageIndex].size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    {/* Remove button */}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const newImages = nominalRollImages.filter((_, i) => i !== selectedImageIndex);
                        setNominalRollImages(newImages);
                        if (newImages.length === 0) {
                          setShowImagePreview(false);
                          setSelectedImageIndex(null);
                        } else if (selectedImageIndex >= newImages.length) {
                          setSelectedImageIndex(newImages.length - 1);
                        }
                        toast({
                          title: "Image Removed",
                          description: "The image has been removed from your selection.",
                          variant: "default",
                        });
                      }}
                    >
                      {/* <X className="h-4 w-4 mr-2" /> */}
                      Remove
                    </Button>

                    {/* Action buttons */}
                    <div className="flex gap-2 ml-auto">
                      {!showCropMode ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowCropMode(true);
                              setCrop({ unit: '%', x: 25, y: 25, width: 50, height: 50 });
                              setZoomLevel(1);
                            }}
                          >
                            <CropIcon className="h-4 w-4 mr-2" />
                            Crop
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setShowImagePreview(false);
                              setSelectedImageIndex(null);
                              setShowCropMode(false);
                              setCrop(undefined);
                              setCompletedCrop(undefined);
                              setZoomLevel(1);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Close
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelCrop}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={applyCrop}
                            disabled={!completedCrop || completedCrop.width < 10 || completedCrop.height < 10}
                          >
                            Apply Crop
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setShowImagePreview(false);
                              setSelectedImageIndex(null);
                              setShowCropMode(false);
                              setCrop(undefined);
                              setCompletedCrop(undefined);
                              setZoomLevel(1);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Close
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Overlay */}
      <AttendanceStatusOverlay
        isOpen={statusOverlay.isOpen}
        status={statusOverlay.status}
        message={statusOverlay.message}
        onClose={handleCloseStatusOverlay}
        onConfirm={handleConfirmSubmission}
        attendanceData={statusOverlay.attendanceData}
      />
    </Layout>
  );
}
