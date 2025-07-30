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

    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    // Verify event exists and user has access
    const event = await SewaEvent.findById(params.id)
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    if (event.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access to event" }, { status: 403 })
    }

    // Get all attendance records for this event
    const attendanceRecords = await AttendanceRecord.find({
      eventId: new mongoose.Types.ObjectId(params.id),
      areaCode: session.areaCode
    }).select('nominalRollImages centerName centerId submittedAt submittedBy')
      .populate('submittedBy', 'name')

    // Collect all nominal roll images from all attendance records
    const allImages: Array<{
      url: string
      centerName: string
      centerId: string
      submittedAt: string
      submittedBy: string
    }> = []

    attendanceRecords.forEach(record => {
      if (record.nominalRollImages && record.nominalRollImages.length > 0) {
        record.nominalRollImages.forEach((imageUrl: string) => {
          allImages.push({
            url: imageUrl,
            centerName: record.centerName,
            centerId: record.centerId,
            submittedAt: record.submittedAt.toISOString(),
            submittedBy: record.submittedBy?.name || 'Unknown'
          })
        })
      }
    })

    // Sort images by submission date (most recent first)
    allImages.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

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
        images: allImages.map(img => img.url), // For backward compatibility
        imageDetails: allImages, // Detailed information
        totalImages: allImages.length,
        centersWithImages: [...new Set(allImages.map(img => img.centerName))].length
      }
    })
  } catch (error) {
    console.error("Get event nominal rolls error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    )
  }
}