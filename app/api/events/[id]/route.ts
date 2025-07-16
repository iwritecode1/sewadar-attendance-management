import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAuthorized } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import SewaEvent from "@/models/SewaEvent"
import AttendanceRecord from "@/models/AttendanceRecord"
import { logActivity } from "@/lib/logger"
import { validateEventData } from "@/lib/validators"
import mongoose from "mongoose"

// Get single event
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 })
    }

    const event = await SewaEvent.findById(params.id).populate("createdBy", "name")

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Check access permissions
    if (event.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    // Get event statistics
    const attendanceRecords = await AttendanceRecord.find({ eventId: event._id })
      .populate("submittedBy", "name")
      .populate("sewadars", "name badgeNumber")

    const totalAttendance = attendanceRecords.reduce(
      (sum, record) => sum + record.sewadars.length + record.tempSewadars.length,
      0,
    )

    const centersParticipated = new Set(attendanceRecords.map((r) => r.centerId)).size

    // Calculate duration
    const fromDate = new Date(event.fromDate)
    const toDate = new Date(event.toDate)
    const duration = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    return NextResponse.json({
      success: true,
      data: {
        ...event.toObject(),
        stats: {
          totalAttendance,
          centersParticipated,
          attendanceRecords: attendanceRecords.length,
          duration,
        },
        attendanceRecords,
      },
    })
  } catch (error) {
    console.error("Get event error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch event",
      },
      { status: 500 },
    )
  }
}

// Update event
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 })
    }

    const event = await SewaEvent.findById(params.id)
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Check permissions
    if (event.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    const body = await request.json()
    const updateData = {
      place: body.place,
      department: body.department,
      fromDate: body.fromDate,
      toDate: body.toDate,
    }

    // Validate update data
    const validation = validateEventData({
      ...updateData,
      area: event.area,
      areaCode: event.areaCode,
    })

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 },
      )
    }

    // Update event
    const updatedEvent = await SewaEvent.findByIdAndUpdate(
      params.id,
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
          updatedBy: new mongoose.Types.ObjectId(session.id),
        },
      },
      { new: true },
    ).populate("createdBy", "name")

    // Log activity
    await logActivity({
      userId: session.id,
      action: "UPDATE_EVENT",
      details: `Updated event ${updateData.place} - ${updateData.department}`,
      ipAddress: request.ip || "unknown",
    })

    return NextResponse.json({
      success: true,
      data: updatedEvent,
    })
  } catch (error) {
    console.error("Update event error:", error)
    return NextResponse.json(
      {
        error: "Failed to update event",
      },
      { status: 500 },
    )
  }
}

// Delete event
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 })
    }

    const event = await SewaEvent.findById(params.id)
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Check permissions
    if (event.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    // Check for dependencies
    const attendanceCount = await AttendanceRecord.countDocuments({ eventId: params.id })

    if (attendanceCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete event with ${attendanceCount} attendance records.`,
        },
        { status: 409 },
      )
    }

    // Delete event
    await SewaEvent.findByIdAndDelete(params.id)

    // Log activity
    await logActivity({
      userId: session.id,
      action: "DELETE_EVENT",
      details: `Deleted event ${event.place} - ${event.department}`,
      ipAddress: request.ip || "unknown",
    })

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully",
    })
  } catch (error) {
    console.error("Delete event error:", error)
    return NextResponse.json(
      {
        error: "Failed to delete event",
      },
      { status: 500 },
    )
  }
}
