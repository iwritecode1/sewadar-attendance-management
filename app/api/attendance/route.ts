import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import AttendanceRecord from "@/models/AttendanceRecord"
import SewaEvent from "@/models/SewaEvent"
import Sewadar from "@/models/Sewadar"
import Center from "@/models/Center"
import { logActivity } from "@/lib/logger"
import { validateAttendanceData } from "@/lib/validators"
import { uploadFiles } from "@/lib/fileUpload"
import mongoose from "mongoose"

// Create new attendance record
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const formData = await request.formData()

    const attendanceData = {
      eventId: formData.get("eventId") as string,
      centerId: formData.get("centerId") as string,
      centerName: formData.get("centerName") as string,
      sewadarIds: formData.getAll("sewadarIds[]").map((id) => id.toString()),
      tempSewadars: JSON.parse((formData.get("tempSewadars") as string) || "[]"),
      nominalRollImages: formData.getAll("nominalRollImages[]") as File[],
    }

    // Validate attendance data
    const validation = validateAttendanceData(attendanceData)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 },
      )
    }

    // Verify event exists and user has access
    const event = await SewaEvent.findById(attendanceData.eventId)
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    if (event.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access to event" }, { status: 403 })
    }

    // Verify center access
    const center = await Center.findOne({ code: attendanceData.centerId })
    if (!center || center.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access to center" }, { status: 403 })
    }

    // For coordinators, ensure they can only submit for their assigned center
    if (session.role === "coordinator" && session.centerId !== attendanceData.centerId) {
      return NextResponse.json(
        {
          error: "Coordinators can only submit attendance for their assigned center",
        },
        { status: 403 },
      )
    }

    // Validate sewadar IDs
    if (attendanceData.sewadarIds.length > 0) {
      const sewadars = await Sewadar.find({
        _id: { $in: attendanceData.sewadarIds.map((id) => new mongoose.Types.ObjectId(id)) },
        centerId: attendanceData.centerId,
      })

      if (sewadars.length !== attendanceData.sewadarIds.length) {
        return NextResponse.json(
          {
            error: "Some sewadars do not belong to the specified center",
          },
          { status: 400 },
        )
      }
    }

    // Process temp sewadars - create new ones or use existing ones
    const processedTempSewadarIds: string[] = []
    const existingSewadarMessages: string[] = []
    const newSewadarMessages: string[] = []
    const errorMessages: string[] = []

    if (attendanceData.tempSewadars.length > 0) {
      for (const tempSewadar of attendanceData.tempSewadars) {
        try {
          // Check for existing sewadar by name and father name (case insensitive)
          const existingSewadar = await Sewadar.findOne({
            centerId: attendanceData.centerId,
            name: { $regex: new RegExp(`^${tempSewadar.name.trim()}$`, 'i') },
            fatherHusbandName: { $regex: new RegExp(`^${tempSewadar.fatherName.trim()}$`, 'i') }
          })

          if (existingSewadar) {
            // Use existing sewadar for attendance
            processedTempSewadarIds.push(existingSewadar._id.toString())
            existingSewadarMessages.push(`${tempSewadar.name} / ${tempSewadar.fatherName}) - Existing (${existingSewadar.badgeNumber})`)
          } else {
            // Create new temp sewadar
            // Generate progressive badge number for this center and gender
            const genderPrefix = tempSewadar.gender === "MALE" ? "GA" : "LA"
            const badgePattern = `T${attendanceData.centerId}${genderPrefix}`

            // Find the highest existing badge number for this center and gender
            const existingBadges = await Sewadar.find({
              centerId: attendanceData.centerId,
              badgeNumber: { $regex: new RegExp(`^${badgePattern}\\d{4}$`) }
            }).sort({ badgeNumber: -1 }).limit(1)

            let nextNumber = 1
            if (existingBadges.length > 0) {
              const lastBadge = existingBadges[0].badgeNumber
              const lastNumber = parseInt(lastBadge.slice(-4))
              nextNumber = lastNumber + 1
            }

            const tempBadgeNumber = `${badgePattern}${String(nextNumber).padStart(4, "0")}`

            // Create actual sewadar record
            const newSewadar = await Sewadar.create({
              badgeNumber: tempBadgeNumber,
              name: tempSewadar.name.trim(),
              fatherHusbandName: tempSewadar.fatherName.trim(),
              dob: "", // Empty for temp sewadars
              age: tempSewadar.age || 0, // Include age from temp sewadar
              gender: tempSewadar.gender,
              badgeStatus: "TEMPORARY",
              zone: center.area, // Use center's area as zone
              area: center.area,
              areaCode: center.areaCode,
              center: center.name,
              centerId: attendanceData.centerId,
              department: "GENERAL", // Default department for temp sewadars
              contactNo: tempSewadar.phone || "",
              emergencyContact: "",
              createdAt: new Date(),
              updatedAt: new Date(),
            })

            processedTempSewadarIds.push(newSewadar._id.toString())
            newSewadarMessages.push(`${tempSewadar.name} / ${tempSewadar.fatherName}) - Created (${tempBadgeNumber})`)
          }
        } catch (error) {
          console.error("Error processing temp sewadar:", error)
          errorMessages.push(`Failed to process ${tempSewadar.name}: ${error.message}`)
        }
      }
    }

    // If ALL temp sewadars failed and no regular sewadars selected, return error
    if (errorMessages.length > 0 && processedTempSewadarIds.length === 0 && attendanceData.sewadarIds.length === 0) {
      return NextResponse.json(
        {
          error: "No sewadars could be processed for attendance",
          details: errorMessages,
        },
        { status: 400 }
      )
    }

    // Upload nominal roll images to ImageKit
    let imageUrls: string[] = []
    if (attendanceData.nominalRollImages.length > 0) {
      try {
        const { uploadMultipleToImageKit } = await import("@/lib/imagekitUpload")
        imageUrls = await uploadMultipleToImageKit(attendanceData.nominalRollImages, "nominal-rolls")
      } catch (error) {
        console.error("ImageKit upload error:", error)
        return NextResponse.json(
          {
            error: "Failed to upload images to ImageKit",
            details: error.message,
          },
          { status: 500 },
        )
      }
    }

    // Check for duplicate attendance
    const existingAttendance = await AttendanceRecord.findOne({
      eventId: new mongoose.Types.ObjectId(attendanceData.eventId),
      centerId: attendanceData.centerId,
    })

    // if (existingAttendance) {
    //   return NextResponse.json(
    //     {
    //       error: "Attendance already submitted for this event and center",
    //     },
    //     { status: 409 },
    //   )
    // }

    // Combine regular sewadars with processed temp sewadars (new + existing)
    const allSewadarIds = [
      ...attendanceData.sewadarIds.map((id) => new mongoose.Types.ObjectId(id)),
      ...processedTempSewadarIds.map((id) => new mongoose.Types.ObjectId(id))
    ]

    // Create attendance record
    const attendance = await AttendanceRecord.create({
      eventId: new mongoose.Types.ObjectId(attendanceData.eventId),
      centerId: attendanceData.centerId,
      centerName: attendanceData.centerName,
      area: session.area,
      areaCode: session.areaCode,
      sewadars: allSewadarIds,
      nominalRollImages: imageUrls,
      submittedBy: new mongoose.Types.ObjectId(session.id),
      submittedAt: new Date(),
    })

    // Log activity
    await logActivity({
      userId: session.id,
      action: "CREATE_ATTENDANCE",
      details: `Created attendance record for event ${event.place} - ${event.department}, center ${attendanceData.centerName}`,
      ipAddress: request.ip || "unknown",
    })

    // Populate the response
    const populatedAttendance = await AttendanceRecord.findById(attendance._id)
      .populate("eventId", "place department fromDate toDate")
      .populate("submittedBy", "name")

    // Prepare response with information about processed temp sewadars
    const response: any = {
      success: true,
      data: populatedAttendance,
    }

    // Add information about temp sewadar processing
    if (existingSewadarMessages.length > 0 || newSewadarMessages.length > 0 || errorMessages.length > 0) {
      const allMessages = [...existingSewadarMessages, ...newSewadarMessages]

      if (allMessages.length > 0) {
        response.tempSewadarInfo = allMessages

        let message = "Attendance submitted successfully."
        if (existingSewadarMessages.length > 0) {
          message += ` ${existingSewadarMessages.length} existing sewadar(s) were included.`
        }
        if (newSewadarMessages.length > 0) {
          message += ` ${newSewadarMessages.length} new temporary sewadar(s) were created.`
        }
        if (errorMessages.length > 0) {
          message += ` ${errorMessages.length} sewadar(s) could not be processed.`
          response.warnings = errorMessages
        }

        response.message = message
      }
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("Create attendance error:", error)
    return NextResponse.json(
      {
        error: "Failed to create attendance record",
      },
      { status: 500 },
    )
  }
}

// Get attendance records
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")
    const centerId = searchParams.get("centerId")
    const fromDate = searchParams.get("fromDate")
    const toDate = searchParams.get("toDate")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    // Build query
    const query: any = { areaCode: session.areaCode }

    if (eventId) {
      query.eventId = new mongoose.Types.ObjectId(eventId)
    }

    // For coordinators, restrict to their center
    if (session.role === "coordinator") {
      query.centerId = session.centerId
    } else if (centerId) {
      query.centerId = centerId
    }

    // Date range filtering
    if (fromDate || toDate) {
      const eventQuery: any = { areaCode: session.areaCode }

      if (fromDate) {
        eventQuery.fromDate = { $gte: fromDate }
      }

      if (toDate) {
        eventQuery.toDate = { $lte: toDate }
      }

      const events = await SewaEvent.find(eventQuery).select("_id")
      query.eventId = { $in: events.map((e) => e._id) }
    }

    // Get total count
    const total = await AttendanceRecord.countDocuments(query)

    // Get records with pagination
    const records = await AttendanceRecord.find(query)
      .populate("eventId", "place department fromDate toDate")
      .populate("submittedBy", "name")
      .populate("sewadars", "name badgeNumber fatherHusbandName gender badgeStatus department contactNo")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)

    return NextResponse.json({
      success: true,
      data: records,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get attendance error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch attendance records",
      },
      { status: 500 },
    )
  }
}
