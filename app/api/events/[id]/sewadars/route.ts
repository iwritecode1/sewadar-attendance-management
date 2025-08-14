import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAuthorized } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import SewaEvent from "@/models/SewaEvent"
import AttendanceRecord from "@/models/AttendanceRecord"
import mongoose from "mongoose"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()

    // Allow both admin and coordinator access
    if (!isAuthorized(session, "admin") && !isAuthorized(session, "coordinator")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get("centerId")

    // Verify event exists and user has access
    const event = await SewaEvent.findById(params.id)
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    if (event.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access to event" }, { status: 403 })
    }

    // Build query for attendance records
    const attendanceQuery: any = {
      eventId: new mongoose.Types.ObjectId(params.id),
      areaCode: session.areaCode
    }

    // For coordinators, only show data from their center
    if (session.role === "coordinator" && session.centerId) {
      attendanceQuery.centerId = session.centerId
    } else if (centerId && centerId !== "all") {
      // For admins, allow filtering by center
      attendanceQuery.centerId = centerId
    }

    // Get attendance records with populated sewadar details
    const attendanceRecords = await AttendanceRecord.find(attendanceQuery)
      .populate({
        path: "sewadars",
        select: "name fatherHusbandName dob age gender badgeNumber badgeStatus centerId center department contactNo"
      })

    // Flatten all sewadars from all attendance records
    const allSewadars = attendanceRecords.flatMap(record => 
      record.sewadars.map(sewadar => ({
        ...sewadar.toObject(),
        centerName: record.centerName,
        submittedAt: record.submittedAt
      }))
    )

    // Get unique centers that participated in this event
    const centerMap = new Map()
    attendanceRecords.forEach(record => {
      if (!centerMap.has(record.centerId)) {
        centerMap.set(record.centerId, {
          id: record.centerId,
          name: record.centerName
        })
      }
    })
    const centers = Array.from(centerMap.values())

    // Calculate statistics
    const stats = {
      totalSewadars: allSewadars.length,
      totalCenters: centers.length,
      maleCount: allSewadars.filter(s => s.gender === "MALE").length,
      femaleCount: allSewadars.filter(s => s.gender === "FEMALE").length,
      permanentCount: allSewadars.filter(s => s.badgeStatus === "PERMANENT").length,
      temporaryCount: allSewadars.filter(s => s.badgeStatus === "TEMPORARY").length,
      openCount: allSewadars.filter(s => s.badgeStatus === "OPEN").length
    }

    return NextResponse.json({
      success: true,
      data: {
        event: {
          _id: event._id,
          place: event.place,
          department: event.department,
          fromDate: event.fromDate,
          toDate: event.toDate
        },
        sewadars: allSewadars,
        centers,
        stats
      }
    })
  } catch (error) {
    console.error("Get event sewadars error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch event sewadars",
      },
      { status: 500 },
    )
  }
}