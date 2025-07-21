import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import SewaEvent from "@/models/SewaEvent"
import AttendanceRecord from "@/models/AttendanceRecord"
import { logActivity } from "@/lib/logger"
import { validateEventData } from "@/lib/validators"

// Create new event
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const body = await request.json()
    const eventData = {
      place: body.place,
      department: body.department,
      fromDate: body.fromDate,
      toDate: body.toDate,
      area: session.area,
      areaCode: session.areaCode,
      createdBy: session.id,
    }

    // Validate event data
    const validation = validateEventData(eventData)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 },
      )
    }

    // Check for duplicate events (same place, department, and dates after trimming)
    const existingEvent = await SewaEvent.findOne({
      place: eventData.place.trim(),
      department: eventData.department.trim(),
      fromDate: eventData.fromDate,
      toDate: eventData.toDate,
      areaCode: session.areaCode,
    })

    if (existingEvent) {
      return NextResponse.json(
        {
          error: "Duplicate event",
          message: `An event with the same place "${eventData.place.trim()}", department "${eventData.department.trim()}", and dates already exists.`,
        },
        { status: 409 },
      )
    }

    // Create event with trimmed values
    const event = await SewaEvent.create({
      ...eventData,
      place: eventData.place.trim(),
      department: eventData.department.trim(),
    })

    // Log activity
    await logActivity({
      userId: session.id,
      action: "CREATE_EVENT",
      details: `Created event ${eventData.place} - ${eventData.department} (${eventData.fromDate} to ${eventData.toDate})`,
      ipAddress: request.ip || "unknown",
    })

    // Populate creator info
    const populatedEvent = await SewaEvent.findById(event._id).populate("createdBy", "name")

    return NextResponse.json(
      {
        success: true,
        data: populatedEvent,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create event error:", error)
    return NextResponse.json(
      {
        error: "Failed to create event",
      },
      { status: 500 },
    )
  }
}

// Get events
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
    const department = searchParams.get("department")
    const place = searchParams.get("place")
    const includeStats = searchParams.get("includeStats") === "true"
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    // Build query - users can only see events from their area
    const query: any = { areaCode: session.areaCode }

    if (fromDate) {
      query.fromDate = { $gte: fromDate }
    }

    if (toDate) {
      query.toDate = { $lte: toDate }
    }

    if (department) {
      query.department = department
    }

    if (place) {
      query.place = place
    }

    // Get total count
    const total = await SewaEvent.countDocuments(query)

    // Get events
    const events = await SewaEvent.find(query)
      .populate("createdBy", "name")
      .sort({ fromDate: -1 })
      .skip(skip)
      .limit(limit)

    let eventsWithStats = events

    if (includeStats) {
      // Add attendance statistics for each event
      eventsWithStats = await Promise.all(
        events.map(async (event) => {
          const attendanceRecords = await AttendanceRecord.find({ eventId: event._id })

          const totalAttendance = attendanceRecords.reduce(
            (sum, record) => sum + record.sewadars.length,
            0,
          )

          const centersParticipated = new Set(attendanceRecords.map((r) => r.centerId)).size

          return {
            ...event.toObject(),
            stats: {
              totalAttendance,
              centersParticipated,
              attendanceRecords: attendanceRecords.length,
            },
          }
        }),
      )
    }

    return NextResponse.json({
      success: true,
      data: eventsWithStats,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get events error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch events",
      },
      { status: 500 },
    )
  }
}
