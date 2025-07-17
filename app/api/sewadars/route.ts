import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import Sewadar from "@/models/Sewadar"
import Center from "@/models/Center"
import AttendanceRecord from "@/models/AttendanceRecord"
import { logActivity } from "@/lib/logger"
import { validateSewadarData } from "@/lib/validators"

// Create new sewadar
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const body = await request.json()
    const sewadarData = {
      badgeNumber: body.badgeNumber,
      name: body.name,
      fatherHusbandName: body.fatherHusbandName,
      dob: body.dob,
      gender: body.gender,
      badgeStatus: body.badgeStatus,
      zone: body.zone,
      area: session.area,
      areaCode: session.areaCode,
      center: body.center,
      centerId: body.centerId,
      department: body.department,
      contactNo: body.contactNo,
      emergencyContact: body.emergencyContact,
    }

    // Validate sewadar data
    const validation = validateSewadarData(sewadarData)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 },
      )
    }

    // Check if coordinator has access to this center
    if (session.role === "coordinator" && session.centerId !== sewadarData.centerId) {
      return NextResponse.json(
        {
          error: "Unauthorized access to center",
        },
        { status: 403 },
      )
    }

    // Verify center exists
    const center = await Center.findOne({
      code: sewadarData.centerId,
      areaCode: session.areaCode,
    })

    if (!center) {
      return NextResponse.json(
        {
          error: "Center not found",
        },
        { status: 404 },
      )
    }

    // Check if badge number already exists
    const existingSewadar = await Sewadar.findOne({
      badgeNumber: sewadarData.badgeNumber,
    })

    if (existingSewadar) {
      return NextResponse.json(
        {
          error: "Badge number already exists",
        },
        { status: 409 },
      )
    }

    // Create sewadar
    const sewadar = await Sewadar.create({
      ...sewadarData,
      createdBy: session.id,
      updatedBy: session.id,
    })

    // Log activity
    await logActivity({
      userId: session.id,
      action: "CREATE_SEWADAR",
      details: `Created sewadar ${sewadarData.name} (${sewadarData.badgeNumber})`,
      ipAddress: request.ip || "unknown",
    })

    return NextResponse.json(
      {
        success: true,
        data: sewadar,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create sewadar error:", error)
    return NextResponse.json(
      {
        error: "Failed to create sewadar",
      },
      { status: 500 },
    )
  }
}

// Get sewadars
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get("centerId")
    const search = searchParams.get("search")
    const department = searchParams.get("department")
    const gender = searchParams.get("gender")
    const badgeStatus = searchParams.get("badgeStatus")
    const includeStats = searchParams.get("includeStats") === "true"
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    // Build query
    const query: any = { areaCode: session.areaCode }

    // Center restriction - coordinators can only see sewadars from their center
    if (session.role === "coordinator" && session.centerId) {
      query.centerId = session.centerId
    } else if (centerId) {
      query.centerId = centerId
    }

    // Other filters
    if (department && department !== "all") {
      query.department = department
    }

    if (gender && gender !== "all") {
      query.gender = gender
    }

    if (badgeStatus && badgeStatus !== "all") {
      query.badgeStatus = badgeStatus
    }

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { badgeNumber: { $regex: search, $options: "i" } },
        { fatherHusbandName: { $regex: search, $options: "i" } },
      ]
    }

    // Get total count
    const total = await Sewadar.countDocuments(query)

    // Get sewadars
    const sewadars = await Sewadar.find(query).sort({ name: 1 }).skip(skip).limit(limit)

    let maleCount;
    let femaleCount;
    if(!query["gender"]){
      maleCount = await Sewadar.countDocuments({...query, gender:"MALE"})
      femaleCount = await Sewadar.countDocuments({...query, gender:"FEMALE"})
    } else if(query["gender"] === "MALE"){
      maleCount = await Sewadar.countDocuments(query);
      femaleCount = 0;
    } else {
      femaleCount = await Sewadar.countDocuments(query)
      maleCount = 0
    }

    

    let sewadarsWithStats = sewadars

    if (includeStats) {
      // Add attendance statistics for each sewadar
      sewadarsWithStats = await Promise.all(
        sewadars.map(async (sewadar) => {
          const attendanceCount = await AttendanceRecord.countDocuments({
            sewadars: sewadar._id,
          })

          return {
            ...sewadar.toObject(),
            stats: {
              attendanceCount,
            },
          }
        }),
      )
    }

    return NextResponse.json({
      success: true,
      data: sewadarsWithStats,
      pagination: {
        total,
        maleCount,
        femaleCount,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get sewadars error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch sewadars",
      },
      { status: 500 },
    )
  }
}
