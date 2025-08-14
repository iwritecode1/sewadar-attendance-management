import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import mongoose from "mongoose"
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

    // Ensure database connection is ready
    if (!mongoose.connection.readyState) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get("fromDate")
    const toDate = searchParams.get("toDate")
    const department = searchParams.get("department")
    const place = searchParams.get("place")
    const search = searchParams.get("search")
    const includeStats = searchParams.get("includeStats") === "true"
    const forAttendance = searchParams.get("forAttendance") === "true"
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    // Build query - users can only see events from their area
    const query: any = { areaCode: session.areaCode }

    // For coordinators, apply center-specific filtering only when NOT fetching for attendance
    // When forAttendance=true, show all events so they can submit attendance for any event
    if (session.role === "coordinator" && session.centerId && !forAttendance) {
      const attendanceRecords = await AttendanceRecord.find({
        centerId: session.centerId,
        areaCode: session.areaCode
      }).select('eventId').lean()
      
      const eventIdsForCoordinator = attendanceRecords.map(record => record.eventId.toString())
      
      if (eventIdsForCoordinator.length > 0) {
        query._id = { $in: eventIdsForCoordinator.map(id => new mongoose.Types.ObjectId(id)) }
      } else {
        // If coordinator's center hasn't participated in any events, return empty result
        query._id = { $in: [] }
      }
    }

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

    // Search functionality - search in place and department
    if (search) {
      query.$or = [
        { place: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
      ]
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
          try {
            // Use a more robust query with proper error handling
            const attendanceQuery: any = { eventId: event._id }
            
            // For coordinators, only count stats from their center when NOT fetching for attendance
            if (session.role === "coordinator" && session.centerId && !forAttendance) {
              attendanceQuery.centerId = session.centerId
            }
            
            const attendanceRecords = await AttendanceRecord.find(attendanceQuery).lean().exec()

            const totalAttendance = attendanceRecords.reduce(
              (sum, record) => sum + (record.sewadars?.length || 0),
              0,
            )

            const centersParticipated = (session.role === "coordinator" && session.centerId && !forAttendance)
              ? (attendanceRecords.length > 0 ? 1 : 0) // For coordinators viewing events, it's either 1 (their center) or 0
              : new Set(
                  attendanceRecords
                    .filter(r => r.centerId)
                    .map((r) => r.centerId)
                ).size

            return {
              ...event.toObject(),
              stats: {
                totalAttendance,
                centersParticipated,
                attendanceRecords: attendanceRecords.length,
              },
            }
          } catch (error) {
            console.error(`Error calculating stats for event ${event._id}:`, error)
            // Return event with zero stats if calculation fails
            return {
              ...event.toObject(),
              stats: {
                totalAttendance: 0,
                centersParticipated: 0,
                attendanceRecords: 0,
              },
            }
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
