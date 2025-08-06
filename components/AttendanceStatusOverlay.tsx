"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AttendanceStatusOverlayProps {
  isOpen: boolean;
  status: "loading" | "success" | "error";
  message: string;
  onClose: () => void;
}

export default function AttendanceStatusOverlay({
  isOpen,
  status,
  message,
  onClose,
}: AttendanceStatusOverlayProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />;
      case "success":
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case "error":
        return <XCircle className="h-12 w-12 text-red-600" />;
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
      default:
        return "bg-gray-50";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={status !== "loading" ? onClose : undefined}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
            getBackgroundColor()
          )}
        >
          <DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              {getStatusIcon()}
              <DialogTitle className={`text-center ${getStatusColor()}`}>
                {status === "loading" && "Submitting Attendance"}
                {status === "success" && "Attendance Submitted Successfully"}
                {status === "error" && "Submission Failed"}
              </DialogTitle>
              <DialogDescription className="text-center text-gray-600 whitespace-pre-line">
                {message}
              </DialogDescription>
            </div>
          </DialogHeader>
          
          {status !== "loading" && (
            <>
              <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
              <div className="flex justify-center mt-4">
                <Button
                  onClick={onClose}
                  className={
                    status === "success"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }
                >
                  {status === "success" ? "Continue" : "Try Again"}
                </Button>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}