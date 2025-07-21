import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAuthorized } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import AttendanceRecord from "@/models/AttendanceRecord"
import { logActivity } from "@/lib/logger"
import { validateAttendanceData } from "@/lib/validators"
import { uploadFiles, deleteFiles } from "@/lib/fileUpload"
import mongoose from "mongoose"

// Get single attendance record
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid attendance ID" }, { status: 400 })
    }

    const attendance = await AttendanceRecord.findById(params.id)
      .populate("eventId", "place department fromDate toDate")
      .populate("submittedBy", "name")
      .populate("sewadars", "name badgeNumber department")

    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 })
    }

    // Check access permissions
    if (attendance.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    if (session.role === "coordinator" && attendance.centerId !== session.centerId) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: attendance,
    })
  } catch (error) {
    console.error("Get attendance error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch attendance record",
      },
      { status: 500 },
    )
  }
}

// Update attendance record
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid attendance ID" }, { status: 400 })
    }

    const attendance = await AttendanceRecord.findById(params.id)
    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 })
    }

    // Check permissions
    if (attendance.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    if (session.role === "coordinator" && attendance.centerId !== session.centerId) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    const formData = await request.formData()

    const updateData = {
      sewadarIds: formData.getAll("sewadarIds[]").map((id) => id.toString()),
      tempSewadars: JSON.parse((formData.get("tempSewadars") as string) || "[]"),
      nominalRollImages: formData.getAll("nominalRollImages[]") as File[],
    }

    // Validate update data
    const validation = validateAttendanceData({
      ...updateData,
      eventId: attendance.eventId.toString(),
      centerId: attendance.centerId,
      centerName: attendance.centerName,
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

    // Handle image updates
    let imageUrls = attendance.nominalRollImages
    if (updateData.nominalRollImages.length > 0) {
      try {
        // Delete old images
        if (attendance.nominalRollImages.length > 0) {
          await deleteFiles(attendance.nominalRollImages)
        }

        // Upload new images
        imageUrls = await uploadFiles(updateData.nominalRollImages, "nominal-rolls")
      } catch (error) {
        return NextResponse.json(
          {
            error: "Failed to update images",
            details: error.message,
          },
          { status: 500 },
        )
      }
    }

    // Update attendance record
    const updatedAttendance = await AttendanceRecord.findByIdAndUpdate(
      params.id,
      {
        $set: {
          sewadars: updateData.sewadarIds.map((id) => new mongoose.Types.ObjectId(id)),
          tempSewadars: [], // Empty since temp sewadars are now actual sewadars
          nominalRollImages: imageUrls,
          updatedAt: new Date(),
          updatedBy: new mongoose.Types.ObjectId(session.id),
        },
      },
      { new: true },
    )
      .populate("eventId", "place department fromDate toDate")
      .populate("submittedBy", "name")

    // Log activity
    await logActivity({
      userId: session.id,
      action: "UPDATE_ATTENDANCE",
      details: `Updated attendance record ${params.id}`,
      ipAddress: request.ip || "unknown",
    })

    return NextResponse.json({
      success: true,
      data: updatedAttendance,
    })
  } catch (error) {
    console.error("Update attendance error:", error)
    return NextResponse.json(
      {
        error: "Failed to update attendance record",
      },
      { status: 500 },
    )
  }
}

// Delete attendance record
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid attendance ID" }, { status: 400 })
    }

    const attendance = await AttendanceRecord.findById(params.id)
    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 })
    }

    // Check permissions
    if (attendance.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    // Delete associated files
    if (attendance.nominalRollImages.length > 0) {
      try {
        await deleteFiles(attendance.nominalRollImages)
      } catch (error) {
        console.error("Failed to delete files:", error)
        // Continue with deletion even if file cleanup fails
      }
    }

    // Delete attendance record
    await AttendanceRecord.findByIdAndDelete(params.id)

    // Log activity
    await logActivity({
      userId: session.id,
      action: "DELETE_ATTENDANCE",
      details: `Deleted attendance record ${params.id}`,
      ipAddress: request.ip || "unknown",
    })

    return NextResponse.json({
      success: true,
      message: "Attendance record deleted successfully",
    })
  } catch (error) {
    console.error("Delete attendance error:", error)
    return NextResponse.json(
      {
        error: "Failed to delete attendance record",
      },
      { status: 500 },
    )
  }
}
