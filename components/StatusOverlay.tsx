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
import { CheckCircle, XCircle, Loader2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatusOverlayProps {
  isOpen: boolean;
  status: "loading" | "success" | "error" | "warning";
  title?: string;
  message: string;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export default function StatusOverlay({
  isOpen,
  status,
  title,
  message,
  onClose,
  actionLabel,
  onAction,
}: StatusOverlayProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />;
      case "success":
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case "error":
        return <XCircle className="h-12 w-12 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-12 w-12 text-yellow-600" />;
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
      case "warning":
        return "text-yellow-900";
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
      case "warning":
        return "bg-yellow-50";
      default:
        return "bg-gray-50";
    }
  };

  const getButtonColor = () => {
    switch (status) {
      case "success":
        return "bg-green-600 hover:bg-green-700";
      case "error":
        return "bg-red-600 hover:bg-red-700";
      case "warning":
        return "bg-yellow-600 hover:bg-yellow-700";
      default:
        return "bg-blue-600 hover:bg-blue-700";
    }
  };

  const getDefaultTitle = () => {
    switch (status) {
      case "loading":
        return "Processing...";
      case "success":
        return "Success";
      case "error":
        return "Error";
      case "warning":
        return "Warning";
      default:
        return "Status";
    }
  };

  const getDefaultActionLabel = () => {
    switch (status) {
      case "success":
        return "Continue";
      case "error":
        return "Try Again";
      case "warning":
        return "OK";
      default:
        return "Close";
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
                {title || getDefaultTitle()}
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
              <div className="flex justify-center mt-4 space-x-2">
                <Button
                  onClick={onAction || onClose}
                  className={getButtonColor()}
                >
                  {actionLabel || getDefaultActionLabel()}
                </Button>
                {onAction && (
                  <Button
                    onClick={onClose}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}