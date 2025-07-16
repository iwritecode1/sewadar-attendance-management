"use server"

import { getSession, isAuthorized } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import Sewadar from "@/models/Sewadar"
import Center from "@/models/Center"
import SewaEvent from "@/models/SewaEvent"
import AttendanceRecord from "@/models/AttendanceRecord"

export async function getDashboardStats() {
  const session = await getSession()

  if (!isAuthorized(session, "admin")) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    // Get counts
    const centerCount = await Center.countDocuments({ areaCode: session.areaCode })
    const sewadarCount = await Sewadar.countDocuments({ areaCode: session.areaCode })
    const eventCount = await SewaEvent.countDocuments({ areaCode: session.areaCode })

    // Calculate total attendance
    const attendanceRecords = await AttendanceRecord.find({ areaCode: session.areaCode })
    let totalAttendance = 0

    for (const record of attendanceRecords) {
      totalAttendance += record.sewadars.length + record.tempSewadars.length
    }

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

    return {
      success: true,
      data: {
        centerCount,
        sewadarCount,
        eventCount,
        totalAttendance,
        centerStats,
        departmentStats: departmentStats.map((d) => ({ department: d._id, count: d.count })),
        recentEvents,
      },
    }
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error)
    return { success: false, error: error.message || "Failed to fetch dashboard stats" }
  }
}

export async function getAttendanceByDate(days = 30) {
  const session = await getSession()

  if (!isAuthorized(session, "admin")) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const attendanceByDate = await AttendanceRecord.aggregate([
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

    return { success: true, data: attendanceByDate }
  } catch (error: any) {
    console.error("Error fetching attendance by date:", error)
    return { success: false, error: error.message || "Failed to fetch attendance by date" }
  }
}

export async function getAttendanceByCenter() {
  const session = await getSession()

  if (!isAuthorized(session, "admin")) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    const attendanceByCenter = await AttendanceRecord.aggregate([
      { $match: { areaCode: session.areaCode } },
      {
        $group: {
          _id: {
            centerId: "$centerId",
            centerName: "$centerName",
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
          centerId: "$_id.centerId",
          centerName: "$_id.centerName",
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ])

    return { success: true, data: attendanceByCenter }
  } catch (error: any) {
    console.error("Error fetching attendance by center:", error)
    return { success: false, error: error.message || "Failed to fetch attendance by center" }
  }
}

export async function getAttendanceByDepartment() {
  const session = await getSession();
  
  if (!isAuthorized(session, 'admin')) {
    return { success: false, error: 'Unauthorized' };
  }
  
  try {
    await dbConnect();
    
    // This is more complex as we need to join with events to get departments
    const attendanceByDepartment = await AttendanceRecord.aggregate([
      { $match: { areaCode: session.areaCode } },
      {
        $lookup: {
          from: 'sewaevents',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $group: {
          _id: '$event.department',
          count: {
            $sum: {
              $add: [
                { $size: '$sewadars' },\
                { $size: '$temp
