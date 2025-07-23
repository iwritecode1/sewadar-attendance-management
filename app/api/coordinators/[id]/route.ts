import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAuthorized } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import Center from "@/models/Center"
import { logActivity } from "@/lib/logger"
import { validateCoordinatorData } from "@/lib/validators"
import mongoose from "mongoose"
import bcrypt from "bcryptjs"

// Get single coordinator
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid coordinator ID" }, { status: 400 })
    }

    const coordinator = await User.findById(params.id).select("-password")

    if (!coordinator) {
      return NextResponse.json({ error: "Coordinator not found" }, { status: 404 })
    }

    // Check if user has access to this coordinator
    if (coordinator.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: coordinator,
    })
  } catch (error) {
    console.error("Get coordinator error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch coordinator",
      },
      { status: 500 },
    )
  }
}

// Update coordinator
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid coordinator ID" }, { status: 400 })
    }

    const coordinator = await User.findById(params.id)
    if (!coordinator) {
      return NextResponse.json({ error: "Coordinator not found" }, { status: 404 })
    }

    // Check permissions
    if (coordinator.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    const body = await request.json()
    const updateData = {
      name: body.name,
      username: body.username,
      centerId: body.centerId,
      isActive: body.isActive,
    }

    // If password is provided, include it
    if (body.password && body.password.trim() !== "") {
      updateData.password = body.password
    }

    // Validate update data
    const validation = validateCoordinatorData({
      ...updateData,
      area: coordinator.area,
      areaCode: coordinator.areaCode,
      password: updateData.password || "dummy", // Use dummy for validation if no password
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

    // Check if username is already taken by another user
    if (updateData.username !== coordinator.username) {
      const existingUser = await User.findOne({
        username: updateData.username,
        _id: { $ne: params.id },
      })

      if (existingUser) {
        return NextResponse.json(
          {
            error: "Username already exists",
          },
          { status: 409 },
        )
      }
    }

    // Verify center exists if changed
    if (updateData.centerId !== coordinator.centerId) {
      const center = await Center.findOne({
        code: updateData.centerId,
        areaCode: session.areaCode,
      })

      if (!center) {
        return NextResponse.json(
          {
            error: "Center not found or does not belong to your area",
          },
          { status: 404 },
        )
      }

      // Check if center already has an active coordinator
      // if (updateData.isActive) {
      //   const existingCoordinator = await User.findOne({
      //     role: "coordinator",
      //     centerId: updateData.centerId,
      //     isActive: true,
      //     _id: { $ne: params.id },
      //   })

      //   if (existingCoordinator) {
      //     return NextResponse.json(
      //       {
      //         error: "This center already has an active coordinator",
      //       },
      //       { status: 409 },
      //     )
      //   }
      // }

      updateData.centerName = center.name
    }

    // Update coordinator - handle password hashing properly
    if (updateData.password) {
      // If password is being updated, we need to use the save method to trigger the pre-save hook
      const salt = await bcrypt.genSalt(10)
      updateData.password = await bcrypt.hash(updateData.password, salt)
    }
    
    // Update coordinator
    const updatedCoordinator = await User.findByIdAndUpdate(
      params.id,
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
          updatedBy: session.id,
        },
      },
      { new: true },
    ).select("-password")

    // Log activity
    await logActivity({
      userId: session.id,
      action: "UPDATE_COORDINATOR",
      details: `Updated coordinator ${updateData.name}`,
      ipAddress: request.ip || "unknown",
    })

    return NextResponse.json({
      success: true,
      data: updatedCoordinator,
    })
  } catch (error) {
    console.error("Update coordinator error:", error)
    return NextResponse.json(
      {
        error: "Failed to update coordinator",
      },
      { status: 500 },
    )
  }
}

// Delete coordinator
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid coordinator ID" }, { status: 400 })
    }

    const coordinator = await User.findById(params.id)
    if (!coordinator) {
      return NextResponse.json({ error: "Coordinator not found" }, { status: 404 })
    }

    // Check permissions
    if (coordinator.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    // Delete coordinator
    await User.findByIdAndDelete(params.id)

    // Log activity
    await logActivity({
      userId: session.id,
      action: "DELETE_COORDINATOR",
      details: `Deleted coordinator ${coordinator.name}`,
      ipAddress: request.ip || "unknown",
    })

    return NextResponse.json({
      success: true,
      message: "Coordinator deleted successfully",
    })
  } catch (error) {
    console.error("Delete coordinator error:", error)
    return NextResponse.json(
      {
        error: "Failed to delete coordinator",
      },
      { status: 500 },
    )
  }
}
