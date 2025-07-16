import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAuthorized } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import Center from "@/models/Center"
import Sewadar from "@/models/Sewadar"
import AttendanceRecord from "@/models/AttendanceRecord"
import User from "@/models/User"
import { logActivity } from "@/lib/logger"
import { validateCenterData } from "@/lib/validators"
import mongoose from "mongoose"

// Get single center
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid center ID" }, { status: 400 })
    }

    const center = await Center.findById(params.id)
    if (!center) {
      return NextResponse.json({ error: "Center not found" }, { status: 404 })
    }

    // Check access permissions
    if (center.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    // Get center statistics
    const [sewadarCount, attendanceCount, coordinatorCount, maleCount, femaleCount] = await Promise.all([
      Sewadar.countDocuments({ centerId: center.code }),
      AttendanceRecord.countDocuments({ centerId: center.code }),
      User.countDocuments({ role: "coordinator", centerId: center.code, isActive: true }),
      Sewadar.countDocuments({ centerId: center.code, gender: "MALE" }),
      Sewadar.countDocuments({ centerId: center.code, gender: "FEMALE" }),
    ])

    // Get department distribution
    const departmentStats = await Sewadar.aggregate([
      { $match: { centerId: center.code } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    return NextResponse.json({
      success: true,
      data: {
        ...center.toObject(),
        stats: {
          sewadarCount,
          attendanceCount,
          coordinatorCount,
          maleCount,
          femaleCount,
          departments: departmentStats.map((d) => ({
            department: d._id,
            count: d.count,
          })),
        },
      },
    })
  } catch (error) {
    console.error("Get center error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch center",
      },
      { status: 500 },
    )
  }
}

// Update center
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid center ID" }, { status: 400 })
    }

    const center = await Center.findById(params.id)
    if (!center) {
      return NextResponse.json({ error: "Center not found" }, { status: 404 })
    }

    // Check permissions
    if (center.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    const body = await request.json()
    const updateData = {
      name: body.name,
    }

    // Validate update data
    const validation = validateCenterData({
      ...updateData,
      code: center.code, // Keep existing code
      area: center.area,
      areaCode: center.areaCode,
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

    // Check if new name already exists in the area (excluding current center)
    if (updateData.name !== center.name) {
      const existingName = await Center.findOne({
        name: updateData.name,
        areaCode: session.areaCode,
        _id: { $ne: params.id },
      })

      if (existingName) {
        return NextResponse.json(
          {
            error: "Center name already exists in this area",
          },
          { status: 409 },
        )
      }
    }

    // Update center
    const updatedCenter = await Center.findByIdAndUpdate(
      params.id,
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
          updatedBy: session.id,
        },
      },
      { new: true },
    )

    // Update related records if name changed
    if (updateData.name !== center.name) {
      await Promise.all([
        Sewadar.updateMany({ centerId: center.code }, { $set: { center: updateData.name } }),
        AttendanceRecord.updateMany({ centerId: center.code }, { $set: { centerName: updateData.name } }),
        User.updateMany({ centerId: center.code }, { $set: { centerName: updateData.name } }),
      ])
    }

    // Log activity
    await logActivity({
      userId: session.id,
      action: "UPDATE_CENTER",
      details: `Updated center ${center.name} to ${updateData.name}`,
      ipAddress: request.ip || "unknown",
    })

    return NextResponse.json({
      success: true,
      data: updatedCenter,
    })
  } catch (error) {
    console.error("Update center error:", error)
    return NextResponse.json(
      {
        error: "Failed to update center",
      },
      { status: 500 },
    )
  }
}

// Delete center
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid center ID" }, { status: 400 })
    }

    const center = await Center.findById(params.id)
    if (!center) {
      return NextResponse.json({ error: "Center not found" }, { status: 404 })
    }

    // Check permissions
    if (center.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    // Check for dependencies
    const [sewadarCount, attendanceCount, coordinatorCount] = await Promise.all([
      Sewadar.countDocuments({ centerId: center.code }),
      AttendanceRecord.countDocuments({ centerId: center.code }),
      User.countDocuments({ role: "coordinator", centerId: center.code }),
    ])

    if (sewadarCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete center with ${sewadarCount} sewadars. Please reassign or delete them first.`,
        },
        { status: 409 },
      )
    }

    if (attendanceCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete center with ${attendanceCount} attendance records.`,
        },
        { status: 409 },
      )
    }

    if (coordinatorCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete center with ${coordinatorCount} coordinators. Please reassign or delete them first.`,
        },
        { status: 409 },
      )
    }

    // Delete center
    await Center.findByIdAndDelete(params.id)

    // Log activity
    await logActivity({
      userId: session.id,
      action: "DELETE_CENTER",
      details: `Deleted center ${center.name} (${center.code})`,
      ipAddress: request.ip || "unknown",
    })

    return NextResponse.json({
      success: true,
      message: "Center deleted successfully",
    })
  } catch (error) {
    console.error("Delete center error:", error)
    return NextResponse.json(
      {
        error: "Failed to delete center",
      },
      { status: 500 },
    )
  }
}
