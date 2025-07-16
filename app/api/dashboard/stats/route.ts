import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAuthorized } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import Sewadar from "@/models/Sewadar"
import Center from "@/models/Center"
import SewaEvent from "@/models/SewaEvent"
import AttendanceRecord from "@/models/AttendanceRecord"
import User from "@/models/User"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get("days") || "30")

    // Get basic counts
    const [centerCount, sewadarCount, eventCount, coordinatorCount] = await Promise.all([
      Center.countDocuments({ areaCode: session.areaCode }),
      Sewadar.countDocuments({ areaCode: session.areaCode }),
      SewaEvent.countDocuments({ areaCode: session.areaCode }),
      User.countDocuments({
        role: "coordinator",
        areaCode: session.areaCode,
        isActive: true,
      }),
    ])

    // Calculate total attendance
    const attendanceRecords = await AttendanceRecord.find({ areaCode: session.areaCode })
    const totalAttendance = attendanceRecords.reduce(
      (sum, record) => sum + record.sewadars.length + record.tempSewadars.length,
      0,
    )

    // Get center performance
    const centerStats = await Center.aggregate([
      { $match: { areaCode: session.areaCode } },
      {
        $lookup: {
          from: "attendancerecords",
          localField: "code",
          foreignField: "centerId",
          as: "attendance",
        },
      },
      {
        $lookup: {
          from: "sewadars",
          localField: "code",
          foreignField: "centerId",
          as: "sewadars",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          code: 1,
          sewadarCount: { $size: "$sewadars" },
          attendanceCount: {
            $reduce: {
              input: "$attendance",
              initialValue: 0,
              in: {
                $add: ["$$value", { $size: "$$this.sewadars" }, { $size: "$$this.tempSewadars" }],
              },
            },
          },
          eventCount: { $size: "$attendance" },
        },
      },
      { $sort: { attendanceCount: -1 } },
    ])

    // Get department distribution
    const departmentStats = await Sewadar.aggregate([
      { $match: { areaCode: session.areaCode } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    // Get recent events
    const recentEvents = await SewaEvent.find({ areaCode: session.areaCode })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "name")

    // Get attendance trends (last N days)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const attendanceTrends = await AttendanceRecord.aggregate([
      {
        $match: {
          areaCode: session.areaCode,
          submittedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$submittedAt" },
            month: { $month: "$submittedAt" },
            day: { $dayOfMonth: "$submittedAt" },
          },
          count: {
            $sum: {
              $add: [{ $size: "$sewadars" }, { $size: "$tempSewadars" }],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: "$_id.year",
              month: "$_id.month",
              day: "$_id.day",
            },
          },
          count: 1,
        },
      },
      { $sort: { date: 1 } },
    ])

    // Get gender distribution
    const genderStats = await Sewadar.aggregate([
      { $match: { areaCode: session.areaCode } },
      { $group: { _id: "$gender", count: { $sum: 1 } } },
    ])

    // Get badge status distribution
    const badgeStatusStats = await Sewadar.aggregate([
      { $match: { areaCode: session.areaCode } },
      { $group: { _id: "$badgeStatus", count: { $sum: 1 } } },
    ])

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          centerCount,
          sewadarCount,
          eventCount,
          coordinatorCount,
          totalAttendance,
        },
        centerStats,
        departmentStats: departmentStats.map((d) => ({
          department: d._id,
          count: d.count,
        })),
        recentEvents,
        attendanceTrends,
        genderStats: genderStats.map((g) => ({
          gender: g._id,
          count: g.count,
        })),
        badgeStatusStats: badgeStatusStats.map((b) => ({
          status: b._id,
          count: b.count,
        })),
      },
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard statistics",
      },
      { status: 500 },
    )
  }
}
