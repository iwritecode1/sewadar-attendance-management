"use client"

import React, { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, XCircle, Clock, AlertTriangle, Download } from "lucide-react"

interface ImportProgressModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string | null
}

interface ImportJob {
  jobId: string
  status: 'processing' | 'completed' | 'failed'
  progress: number
  total: number
  processed: number
  created: number
  updated: number
  errors: Array<{ row: number; error: string; data: any }>
  message: string
  duration: number
}

export default function ImportProgressModal({
  isOpen,
  onClose,
  jobId
}: ImportProgressModalProps) {
  const [job, setJob] = useState<ImportJob | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isCompletedRef = useRef(false)
  const pollStartTimeRef = useRef<number>(0)
  const MAX_POLL_DURATION = 10 * 60 * 1000 // 10 minutes maximum polling

  useEffect(() => {
    if (!isOpen || !jobId) {
      setJob(null)
      setIsPolling(false)
      isCompletedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Reset completion flag when starting new job
    isCompletedRef.current = false
    setIsPolling(true)
    pollStartTimeRef.current = Date.now()

    const pollProgress = async () => {
      // Don't poll if already completed
      if (isCompletedRef.current) {
        return
      }

      // Check if we've been polling too long
      const pollDuration = Date.now() - pollStartTimeRef.current
      if (pollDuration > MAX_POLL_DURATION) {
        console.log('Polling timeout reached, stopping')
        isCompletedRef.current = true
        setIsPolling(false)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setJob({
          jobId: jobId,
          status: 'failed',
          progress: 0,
          total: 0,
          processed: 0,
          created: 0,
          updated: 0,
          errors: [],
          message: 'Import polling timed out. Please check server logs.',
          duration: pollDuration
        })
        return
      }

      try {
        const response = await fetch(`/api/sewadars/import?jobId=${jobId}`)
        
        if (response.ok) {
          const data = await response.json()
          setJob(data)

          // Stop polling if job is completed or failed
          if (data.status === 'completed' || data.status === 'failed') {
            isCompletedRef.current = true
            setIsPolling(false)
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            console.log(`Import ${data.status}: ${data.message}`)
          }
        } else if (response.status === 404) {
          // Job not found - likely expired or invalid jobId
          console.log('Import job not found or expired')
          isCompletedRef.current = true
          setIsPolling(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          // Set a completed job with error message
          setJob({
            jobId: jobId,
            status: 'failed',
            progress: 0,
            total: 0,
            processed: 0,
            created: 0,
            updated: 0,
            errors: [],
            message: 'Import job not found or has expired',
            duration: 0
          })
        } else {
          // Other HTTP errors
          console.error(`API error: ${response.status}`)
          isCompletedRef.current = true
          setIsPolling(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      } catch (error) {
        console.error("Error polling progress:", error)
        isCompletedRef.current = true
        setIsPolling(false)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }

    // Initial poll
    pollProgress()

    // Set up polling interval
    intervalRef.current = setInterval(pollProgress, 1000) // Poll every second

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsPolling(false)
      isCompletedRef.current = false
    }
  }, [isOpen, jobId])

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const downloadErrorReport = () => {
    if (!job || job.errors.length === 0) return

    const errorData = job.errors.map(error => ({
      Row: error.row,
      Error: error.error,
      Badge_Number: error.data?.badgeNumber || '',
      Name: error.data?.name || '',
      Center: error.data?.centerId || ''
    }))

    const csvContent = [
      Object.keys(errorData[0]).join(','),
      ...errorData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `import_errors_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleClose = () => {
    // Clean up polling when modal is closed
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsPolling(false)
    isCompletedRef.current = false
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {job && getStatusIcon(job.status)}
            Import Progress
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[65vh] pr-2">
          {job ? (
            <>
              {/* Progress Bar */}
              <div className="space-y-3 px-1 pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm font-bold text-blue-600">{job.progress}%</span>
                </div>
                <Progress value={job.progress} className="h-3" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{job.processed.toLocaleString()} of {job.total.toLocaleString()} processed</span>
                  <span>Duration: {formatDuration(job.duration)}</span>
                </div>
              </div>

              {/* Status Message */}
              <div className="text-center bg-gray-50 rounded-lg p-4 mx-1">
                <p className="text-sm text-gray-700 font-medium">{job.message}</p>
                {job.status === 'processing' && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                    <span className="text-xs text-blue-600">Processing in background...</span>
                  </div>
                )}
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 px-1">
                <Card className="border-green-200 bg-green-50 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-700">{job.created.toLocaleString()}</div>
                    <div className="text-sm text-green-600 mt-1">Created</div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-700">{job.updated.toLocaleString()}</div>
                    <div className="text-sm text-blue-600 mt-1">Updated</div>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-700">{job.errors.length.toLocaleString()}</div>
                    <div className="text-sm text-red-600 mt-1">Errors</div>
                  </CardContent>
                </Card>
              </div>

              {/* Errors Section */}
              {job.errors.length > 0 && (
                <div className="space-y-3 px-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-gray-700">Import Errors ({job.errors.length.toLocaleString()})</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadErrorReport}
                      className="text-xs h-8"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download Report
                    </Button>
                  </div>

                  <ScrollArea className="h-32 border rounded-md p-3 bg-gray-50">
                    <div className="space-y-2">
                      {job.errors.slice(0, 8).map((error, index) => (
                        <div key={index} className="text-xs flex items-start gap-2 p-2 hover:bg-white rounded border-l-2 border-red-200">
                          <Badge variant="destructive" className="text-xs px-2 py-1 min-w-fit shrink-0">
                            Row {error.row}
                          </Badge>
                          <span className="text-gray-700 flex-1 leading-relaxed break-words">
                            {error.error.length > 100 ? `${error.error.substring(0, 100)}...` : error.error}
                          </span>
                        </div>
                      ))}
                      {job.errors.length > 8 && (
                        <div className="text-xs text-gray-500 italic text-center py-3 border-t mt-2">
                          ... and {(job.errors.length - 8).toLocaleString()} more errors (download report for full list)
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-6 px-1">
                <div className="text-sm">
                  {job.status === 'completed' && (
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Import completed successfully
                    </span>
                  )}
                  {job.status === 'failed' && (
                    <span className="text-red-600 font-medium flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      Import failed
                    </span>
                  )}
                  {job.status === 'processing' && (
                    <span className="text-blue-600 font-medium flex items-center gap-1">
                      <Clock className="h-4 w-4 animate-pulse" />
                      Import in progress...
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {job.status === 'processing' && (
                    <Button variant="outline" size="sm" disabled className="h-9">
                      <Clock className="h-3 w-3 mr-2" />
                      Processing...
                    </Button>
                  )}
                  {(job.status === 'completed' || job.status === 'failed') && (
                    <Button onClick={handleClose} size="sm" className="h-9 px-6">
                      Close
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 px-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Loading import progress...</p>
              <p className="text-xs text-gray-400 mt-2">Please wait while we fetch the latest status</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}