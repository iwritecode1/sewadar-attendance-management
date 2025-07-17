import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import AttendanceRecord from "@/models/AttendanceRecord"
import SewaEvent from "@/models/SewaEvent"
import mongoose from "mongoose"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get("fromDate")
    const toDate = searchParams.get("toDate")
    const centerId = searchParams.get("centerId")
    const sewadarId = searchParams.get("sewadarId")
    const eventId = searchParams.get("eventId")
    const format = searchParams.get("format") || "json"

    // Build query based on user role
    const query: any = { areaCode: session.areaCode }

    // For coordinators, restrict to their center
    if (session.role === "coordinator") {
      query.centerId = session.centerId
    } else if (centerId) {
      query.centerId = centerId
    }

    // Event filtering
    if (eventId) {
      query.eventId = new mongoose.Types.ObjectId(eventId)
    }

    // Date range filtering via event lookup
    if (fromDate || toDate) {
      const eventQuery: any = { areaCode: session.areaCode }

      if (fromDate) {
        eventQuery.fromDate = { $gte: fromDate }
      }

      if (toDate) {
        eventQuery.toDate = { $lte: toDate }
      }

      const events = await SewaEvent.find(eventQuery).select("_id")
      query.eventId = { $in: events.map((e) => e._id) }
    }

    // Sewadar filtering
    if (sewadarId) {
      query.sewadars = new mongoose.Types.ObjectId(sewadarId)
    }

    // Fetch attendance records with populated data
    const attendanceRecords = await AttendanceRecord.find(query)
      .populate({
        path: "eventId",
        select: "place department fromDate toDate",
      })
      .populate({
        path: "sewadars",
        select: "name badgeNumber department gender",
      })
      .populate({
        path: "submittedBy",
        select: "name",
      })
      .sort({ submittedAt: -1 })

    // Generate statistics
    const stats = {
      totalRecords: attendanceRecords.length,
      totalSewadars: new Set(attendanceRecords.flatMap((record) => record.sewadars.map((s: any) => s._id.toString())))
        .size,
      totalTempSewadars: attendanceRecords.reduce((sum, record) => sum + record.tempSewadars.length, 0),
      centersInvolved: new Set(attendanceRecords.map((record) => record.centerId)).size,
      eventsInvolved: new Set(attendanceRecords.map((record) => record.eventId._id.toString())).size,
      dateRange: {
        from: attendanceRecords.length > 0 ? attendanceRecords[attendanceRecords.length - 1].submittedAt : null,
        to: attendanceRecords.length > 0 ? attendanceRecords[0].submittedAt : null,
      },
    }

    // Department-wise breakdown
    const departmentStats = {}
    attendanceRecords.forEach((record) => {
      const dept = record.eventId.department
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          records: 0,
          sewadars: new Set(),
          tempSewadars: 0,
        }
      }
      departmentStats[dept].records++
      departmentStats[dept].tempSewadars += record.tempSewadars.length
      record.sewadars.forEach((s: any) => departmentStats[dept].sewadars.add(s._id.toString()))
    })

    // Convert sets to counts
    Object.keys(departmentStats).forEach((dept) => {
      departmentStats[dept].sewadars = departmentStats[dept].sewadars.size
    })

    const reportData = {
      records: attendanceRecords,
      statistics: {
        ...stats,
        departmentBreakdown: departmentStats,
      },
      filters: {
        fromDate,
        toDate,
        centerId,
        sewadarId,
        eventId,
      },
      generatedAt: new Date().toISOString(),
      generatedBy: {
        id: session.id,
        name: session.name,
        role: session.role,
      },
    }

    // Return different formats based on request
    if (format === "csv") {
      // Generate CSV format
      const csvData = attendanceRecords.map((record) => ({
        Date: new Date(record.submittedAt).toLocaleDateString(),
        Event: record.eventId.place,
        Department: record.eventId.department,
        Center: record.centerName,
        "Sewadars Count": record.sewadars.length,
        "Temp Sewadars Count": record.tempSewadars.length,
        "Total Attendance": record.sewadars.length + record.tempSewadars.length,
        "Submitted By": record.submittedBy.name,
      }))

      return NextResponse.json({
        success: true,
        data: csvData,
        format: "csv",
        statistics: reportData.statistics,
      })
    }

    return NextResponse.json({
      success: true,
      data: reportData,
    })
  } catch (error) {
    console.error("Generate attendance report error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate attendance report",
      },
      { status: 500 },
    )
  }
}
