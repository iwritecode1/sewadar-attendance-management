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

    // Only include password if it's provided and not empty
    if (body.password && typeof body.password === "string" && body.password.trim() !== "") {
      updateData.password = body.password.trim()
    }

    // Validate update data (skip password validation if not provided)
    const validationData = {
      ...updateData,
      area: coordinator.area,
      areaCode: coordinator.areaCode,
    }

    // Only include password in validation if it's being updated
    if (updateData.password) {
      validationData.password = updateData.password
    }

    // Custom validation for updates
    const errors: string[] = []

    if (!validationData.name || typeof validationData.name !== "string" || validationData.name.trim().length === 0) {
      errors.push("Name is required")
    }

    if (!validationData.username || typeof validationData.username !== "string" || validationData.username.trim().length === 0) {
      errors.push("Username is required")
    }

    if (validationData.username && typeof validationData.username === "string") {
      const usernameRegex = /^[a-zA-Z0-9_.@-]{5,35}$/;
      if (!usernameRegex.test(validationData.username)) {
        errors.push("Username must be 5-35 characters long and contain only letters, numbers, underscores, dots, @ symbols, and hyphens")
      }
    }

    // Only validate password if it's being updated
    if (validationData.password && (typeof validationData.password !== "string" || validationData.password.length < 6)) {
      errors.push("Password must be at least 6 characters long")
    }

    if (!validationData.centerId || typeof validationData.centerId !== "string" || validationData.centerId.trim().length === 0) {
      errors.push("Center ID is required")
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
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

    // Prepare update object
    const updateObject: any = {
      name: updateData.name,
      username: updateData.username,
      centerId: updateData.centerId,
      isActive: updateData.isActive,
      updatedAt: new Date(),
      updatedBy: session.id,
    }

    // Add centerName if it was updated
    if (updateData.centerName) {
      updateObject.centerName = updateData.centerName
    }

    // Handle password update separately if provided
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10)
      updateObject.password = await bcrypt.hash(updateData.password, salt)
    }
    
    // Update coordinator
    const updatedCoordinator = await User.findByIdAndUpdate(
      params.id,
      { $set: updateObject },
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
