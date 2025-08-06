import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import Sewadar from "@/models/Sewadar"
import AttendanceRecord from "@/models/AttendanceRecord"
import { logActivity } from "@/lib/logger"
import { validateSewadarData } from "@/lib/validators"
import mongoose from "mongoose"

// Get single sewadar
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid sewadar ID" }, { status: 400 })
    }

    const sewadar = await Sewadar.findById(params.id)

    if (!sewadar) {
      return NextResponse.json({ error: "Sewadar not found" }, { status: 404 })
    }

    // Check access permissions
    if (sewadar.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    if (session.role === "coordinator" && session.centerId !== sewadar.centerId) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    // Get attendance history
    const attendanceRecords = await AttendanceRecord.find({
      sewadars: { $in: [sewadar._id] },
    })
      .populate("eventId", "place department fromDate toDate")
      .sort({ submittedAt: -1 })

    return NextResponse.json({
      success: true,
      data: {
        ...sewadar.toObject(),
        attendanceHistory: attendanceRecords,
      },
    })
  } catch (error) {
    console.error("Get sewadar error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch sewadar",
      },
      { status: 500 },
    )
  }
}

// Update sewadar
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid sewadar ID" }, { status: 400 })
    }

    const sewadar = await Sewadar.findById(params.id)
    if (!sewadar) {
      return NextResponse.json({ error: "Sewadar not found" }, { status: 404 })
    }

    // Check permissions
    if (sewadar.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    if (session.role === "coordinator" && session.centerId !== sewadar.centerId) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    const body = await request.json()
    const updateData = {
      name: body.name,
      fatherHusbandName: body.fatherHusbandName,
      dob: body.dob,
      age: body.age,
      gender: body.gender,
      badgeStatus: body.badgeStatus,
      department: body.department,
      contactNo: body.contactNo,
      emergencyContact: body.emergencyContact,
    }

    // Validate update data
    const validation = validateSewadarData({
      ...updateData,
      badgeNumber: sewadar.badgeNumber, // Keep existing badge number
      zone: sewadar.zone,
      area: sewadar.area,
      areaCode: sewadar.areaCode,
      center: sewadar.center,
      centerId: sewadar.centerId,
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

    // Update sewadar
    const updatedSewadar = await Sewadar.findByIdAndUpdate(
      params.id,
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
          updatedBy: new mongoose.Types.ObjectId(session.id),
        },
      },
      { new: true },
    )

    // Log activity
    await logActivity({
      userId: session.id,
      action: "UPDATE_SEWADAR",
      details: `Updated sewadar ${updateData.name} (${sewadar.badgeNumber})`,
      ipAddress: request.ip || "unknown",
    })

    return NextResponse.json({
      success: true,
      data: updatedSewadar,
    })
  } catch (error) {
    console.error("Update sewadar error:", error)
    return NextResponse.json(
      {
        error: "Failed to update sewadar",
      },
      { status: 500 },
    )
  }
}

// Delete sewadar
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid sewadar ID" }, { status: 400 })
    }

    const sewadar = await Sewadar.findById(params.id)
    if (!sewadar) {
      return NextResponse.json({ error: "Sewadar not found" }, { status: 404 })
    }

    // Check permissions
    if (sewadar.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    if (session.role === "coordinator" && session.centerId !== sewadar.centerId) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    // Check for dependencies
    const attendanceCount = await AttendanceRecord.countDocuments({
      sewadars: { $in: [sewadar._id] },
    })

    if (attendanceCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete sewadar with ${attendanceCount} attendance records.`,
        },
        { status: 409 },
      )
    }

    // Delete sewadar
    await Sewadar.findByIdAndDelete(params.id)

    // Log activity
    await logActivity({
      userId: session.id,
      action: "DELETE_SEWADAR",
      details: `Deleted sewadar ${sewadar.name} (${sewadar.badgeNumber})`,
      ipAddress: request.ip || "unknown",
    })

    return NextResponse.json({
      success: true,
      message: "Sewadar deleted successfully",
    })
  } catch (error) {
    console.error("Delete sewadar error:", error)
    return NextResponse.json(
      {
        error: "Failed to delete sewadar",
      },
      { status: 500 },
    )
  }
}
