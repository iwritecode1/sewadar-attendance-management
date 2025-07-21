import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import AttendanceRecord from "@/models/AttendanceRecord"
import { formatDate } from "@/lib/date-utils"
import mongoose from "mongoose"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const sewadarId = searchParams.get("sewadarId")
    const eventId = searchParams.get("eventId")
    const centerId = searchParams.get("centerId")
    const fromDate = searchParams.get("fromDate")
    const toDate = searchParams.get("toDate")
    const format = searchParams.get("format") || "json"

    // Build query
    const query: any = { areaCode: session.areaCode }

    // Filter by sewadar
    if (sewadarId) {
      query.sewadars = new mongoose.Types.ObjectId(sewadarId)
    }

    // Filter by event
    if (eventId) {
      query.eventId = new mongoose.Types.ObjectId(eventId)
    }

    // Filter by center
    if (centerId) {
      query.centerId = centerId
    }

    // Date range filtering
    if (fromDate || toDate) {
      query.submittedAt = {}
      if (fromDate) {
        query.submittedAt.$gte = new Date(fromDate)
      }
      if (toDate) {
        query.submittedAt.$lte = new Date(toDate)
      }
    }

    // Get attendance records with populated data
    const attendanceRecords = await AttendanceRecord.find(query)
      .populate({
        path: "eventId",
        select: "place department fromDate toDate"
      })
      .populate({
        path: "submittedBy",
        select: "name"
      })
      .sort({ submittedAt: -1 })

    // If CSV format is requested
    if (format === "csv") {
      const csvHeaders = [
        "Date",
        "Event",
        "Department", 
        "Event From Date",
        "Event To Date",
        "Center",
        "Submitted By",
        "Submitted At"
      ]

      const csvRows = attendanceRecords.map(record => [
        record.eventId?.place || "N/A",
        record.eventId?.department || "N/A",
        record.eventId?.fromDate ? formatDate(record.eventId.fromDate) : "N/A",
        record.eventId?.toDate ? formatDate(record.eventId.toDate) : "N/A",
        record.centerName || "N/A",
        record.submittedBy?.name || "N/A",
        formatDate(record.submittedAt)
      ])

      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n")

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=attendance_report.csv"
        }
      })
    }

    // Return JSON format
    return NextResponse.json({
      success: true,
      data: {
        records: attendanceRecords,
        total: attendanceRecords.length,
        query: {
          sewadarId,
          eventId,
          centerId,
          fromDate,
          toDate
        }
      }
    })
  } catch (error) {
    console.error("Attendance report error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate attendance report",
      },
      { status: 500 },
    )
  }
}