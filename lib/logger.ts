import dbConnect from "./mongodb"
import mongoose from "mongoose"

// Activity Log Schema
const ActivityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  details: { type: String, required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed },
})

// Create indexes for better query performance
ActivityLogSchema.index({ userId: 1, timestamp: -1 })
ActivityLogSchema.index({ action: 1, timestamp: -1 })
ActivityLogSchema.index({ timestamp: -1 })

const ActivityLog = mongoose.models.ActivityLog || mongoose.model("ActivityLog", ActivityLogSchema)

interface LogActivityParams {
  userId: string
  action: string
  details: string
  ipAddress?: string
  userAgent?: string
  metadata?: any
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await dbConnect()

    await ActivityLog.create({
      userId: new mongoose.Types.ObjectId(params.userId),
      action: params.action,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Failed to log activity:", error)
    // Don't throw error to prevent cascading failures
  }
}

export async function getActivityLogs(params: {
  userId?: string
  action?: string
  fromDate?: Date
  toDate?: Date
  page?: number
  limit?: number
}) {
  try {
    await dbConnect()

    const { userId, action, fromDate, toDate, page = 1, limit = 50 } = params

    const skip = (page - 1) * limit
    const query: any = {}

    if (userId) {
      query.userId = new mongoose.Types.ObjectId(userId)
    }

    if (action) {
      query.action = action
    }

    if (fromDate || toDate) {
      query.timestamp = {}
      if (fromDate) query.timestamp.$gte = fromDate
      if (toDate) query.timestamp.$lte = toDate
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(query).populate("userId", "name username role").sort({ timestamp: -1 }).skip(skip).limit(limit),
      ActivityLog.countDocuments(query),
    ])

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error("Failed to get activity logs:", error)
    throw error
  }
}

// Cleanup old logs (run periodically)
export async function cleanupOldLogs(daysToKeep = 90): Promise<void> {
  try {
    await dbConnect()

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await ActivityLog.deleteMany({
      timestamp: { $lt: cutoffDate },
    })

    console.log(`Cleaned up ${result.deletedCount} old activity logs`)
  } catch (error) {
    console.error("Failed to cleanup old logs:", error)
  }
}
