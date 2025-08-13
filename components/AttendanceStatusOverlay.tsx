"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Loader2, AlertCircle, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AttendanceStatusOverlayProps {
  isOpen: boolean;
  status: "loading" | "success" | "error" | "confirm";
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  attendanceData?: {
    eventName?: string;
    eventDate?: string;
    totalSewadars?: number;
    nominalRollImages?: number;
    newTempSewadars?: number;
    newTempSewadarsList?: Array<{ name: string; fatherName: string }>;
    existingTempSewadars?: Array<{ name: string; fatherName: string }>;
    // Confirmation data
    selectedSewadars?: Array<{ name: string; fatherHusbandName: string; badgeNumber: string }>;
    tempSewadars?: Array<{ name: string; fatherName: string }>;
  };
}

export default function AttendanceStatusOverlay({
  isOpen,
  status,
  message,
  onClose,
  onConfirm,
  attendanceData,
}: AttendanceStatusOverlayProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />;
      case "success":
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case "error":
        return <XCircle className="h-12 w-12 text-red-600" />;
      case "confirm":
        return <AlertCircle className="h-12 w-12 text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "loading":
        return "text-blue-900";
      case "success":
        return "text-green-900";
      case "error":
        return "text-red-900";
      case "confirm":
        return "text-gray-900";
      default:
        return "text-gray-900";
    }
  };

  const getBackgroundColor = () => {
    switch (status) {
      case "loading":
        return "bg-blue-50";
      case "success":
        return "bg-green-50";
      case "error":
        return "bg-red-50";
      case "confirm":
        return "bg-white";
      default:
        return "bg-gray-50";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && status !== "loading") {
        onClose();
      }
    }}>
      <DialogContent 
        className={cn(
          getBackgroundColor(),
          "w-[95vw] max-w-md max-h-[75vh]",
          status === "loading" && "[&>button]:hidden" // Hide close button for loading
        )}
      >
        <DialogHeader className="text-center">
          <div className={cn("flex flex-col items-center", status === "confirm" ? "space-y-2" : "space-y-4")}>
            {getStatusIcon()}
            <DialogTitle className={`text-center ${getStatusColor()}`}>
              {status === "loading" && "Submitting Attendance"}
              {status === "success" && "Attendance Submitted Successfully"}
              {status === "error" && "Submission Failed"}
              {status === "confirm" && "Confirm Attendance Submission"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogBody className="px-4 py-0 flex flex-col">
          {status === "confirm" && attendanceData ? (
            <>
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto text-left text-gray-700 space-y-3 w-full">
                {/* Event Details */}
                {attendanceData.eventName && (
                  <div className="text-center pb-2 mt-2">
                    <p className="text-sm font-medium text-gray-800">{attendanceData.eventName}</p>
                    {attendanceData.eventDate && (
                      <p className="text-xs text-gray-600">{attendanceData.eventDate}</p>
                    )}
                  </div>
                )}

                {/* All Sewadars */}
                {((attendanceData.selectedSewadars && attendanceData.selectedSewadars.length > 0) || 
                  (attendanceData.tempSewadars && attendanceData.tempSewadars.length > 0)) && (
                  <div>
                    <span className="font-medium text-gray-900 block mb-1">Sewadars ({attendanceData.totalSewadars}):</span>
                    <div className="text-sm bg-gray-50 rounded p-2 space-y-0.5">
                      {/* Regular Sewadars */}
                      {attendanceData.selectedSewadars?.map((sewadar, index) => (
                        <div key={`regular-${index}`} className="text-gray-700 py-0.5">
                          {index + 1}. {sewadar.name} / {sewadar.fatherHusbandName}
                        </div>
                      ))}
                      {/* Temp Sewadars */}
                      {attendanceData.tempSewadars?.map((sewadar, index) => {
                        const sequenceNumber = (attendanceData.selectedSewadars?.length || 0) + index + 1;
                        return (
                          <div key={`temp-${index}`} className="text-gray-700 py-0.5">
                            {sequenceNumber}. {sewadar.name} / {sewadar.fatherName}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Buttons at Bottom */}
              <div className="flex-shrink-0 pt-4 pb-4 border-t bg-white">
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex items-center"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Back
                  </Button>
                  <Button
                    onClick={onConfirm}
                    className="bg-green-600 hover:bg-green-700 flex items-center"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Confirm & Submit
                  </Button>
                </div>
              </div>
            </>
          ) : status === "success" && attendanceData ? (
            <>
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto text-left text-gray-700 space-y-4 w-full">
                {attendanceData.eventName && (
                  <div className="border-b border-gray-200 pb-3">
                    <span className="font-medium text-gray-900 block">Event:</span>
                    <p className="text-sm font-medium text-gray-800">{attendanceData.eventName}</p>
                    {attendanceData.eventDate && (
                      <p className="text-xs text-gray-600 mt-1">{attendanceData.eventDate}</p>
                    )}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-900 block">Total Sewadars:</span>
                    <p className="text-lg font-semibold text-gray-800">{attendanceData.totalSewadars || 0}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900 block">Images:</span>
                    <p className="text-lg font-semibold text-gray-800">{attendanceData.nominalRollImages || 0}</p>
                  </div>
                </div>
                
                {attendanceData.newTempSewadarsList && attendanceData.newTempSewadarsList.length > 0 ? (
                  <div>
                    <span className="font-medium text-gray-900 block">New Temp Sewadars ({attendanceData.newTempSewadarsList.length}):</span>
                    <div className="text-sm max-h-32 overflow-y-auto bg-green-50 rounded p-2 mt-1">
                      {attendanceData.newTempSewadarsList.map((sewadar, index) => (
                        <p key={index} className="text-gray-700 py-1">
                          {sewadar.name} / {sewadar.fatherName}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="font-medium text-gray-900 block">New Temp Sewadars:</span>
                    <p className="text-lg font-semibold text-gray-800">{attendanceData.newTempSewadars || 0} created</p>
                  </div>
                )}
                
                {attendanceData.existingTempSewadars && attendanceData.existingTempSewadars.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-900 block">Existing Temp Sewadars:</span>
                    <p className="text-sm text-gray-600 mb-2">{attendanceData.existingTempSewadars.length} sewadars</p>
                    <div className="text-sm max-h-32 overflow-y-auto bg-gray-50 rounded p-2">
                      {attendanceData.existingTempSewadars.map((sewadar, index) => (
                        <p key={index} className="text-gray-700 py-1">
                          {sewadar.name} / {sewadar.fatherName}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Button at Bottom */}
              <div className="flex-shrink-0 pt-4 pb-4 border-t bg-white">
                <div className="flex justify-center">
                  <Button
                    onClick={onClose}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto text-center">
                <DialogDescription className="text-center text-gray-600 whitespace-pre-line">
                  {message}
                </DialogDescription>
              </div>

              {/* Sticky Button at Bottom */}
              {status !== "loading" && status !== "confirm" && (
                <div className="flex-shrink-0 pt-4 pb-4 border-t bg-white">
                  <div className="flex justify-center">
                    <Button
                      onClick={onClose}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}