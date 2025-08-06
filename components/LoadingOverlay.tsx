"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "overlay" | "inline" | "button";
}

export default function LoadingOverlay({
  isLoading,
  message = "Loading...",
  className,
  size = "md",
  variant = "overlay",
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  if (variant === "button") {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Loader2 className={cn("animate-spin", sizeClasses[size])} />
        <span className={textSizeClasses[size]}>{message}</span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className={cn("animate-spin text-blue-600", sizeClasses[size])} />
          <span className={cn("text-gray-600", textSizeClasses[size])}>{message}</span>
        </div>
      </div>
    );
  }

  // Overlay variant
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm",
      className
    )}>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className={cn("animate-spin text-blue-600", sizeClasses[size])} />
          <span className={cn("text-gray-700 text-center", textSizeClasses[size])}>
            {message}
          </span>
        </div>
      </div>
    </div>
  );
}