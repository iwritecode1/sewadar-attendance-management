import mongoose, { Schema, type Document } from "mongoose"

export interface IAttendanceRecord extends Document {
  eventId: mongoose.Types.ObjectId
  centerId: string
  centerName: string
  area: string
  areaCode: string
  sewadars: mongoose.Types.ObjectId[]
  nominalRollImages: string[]
  submittedBy: mongoose.Types.ObjectId
  submittedAt: Date
}

const AttendanceRecordSchema: Schema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: "SewaEvent", required: true },
  centerId: { type: String, required: true },
  centerName: { type: String, required: true },
  area: { type: String, required: true },
  areaCode: { type: String, required: true },
  sewadars: [{ type: Schema.Types.ObjectId, ref: "Sewadar" }],
  nominalRollImages: [{ type: String }],
  submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  submittedAt: { type: Date, default: Date.now },
})

// Create indexes for common queries
AttendanceRecordSchema.index({ eventId: 1 })
AttendanceRecordSchema.index({ centerId: 1 })
AttendanceRecordSchema.index({ area: 1 })
AttendanceRecordSchema.index({ areaCode: 1 })
AttendanceRecordSchema.index({ submittedAt: -1 })
AttendanceRecordSchema.index({ submittedBy: 1 })
// Compound indexes for common query patterns
AttendanceRecordSchema.index({ eventId: 1, centerId: 1, submittedBy: 1 }, { unique: true }) // Prevent duplicate attendance by same user
AttendanceRecordSchema.index({ areaCode: 1, submittedAt: -1 }) // Area-based queries with date sorting
AttendanceRecordSchema.index({ centerId: 1, submittedAt: -1 }) // Center-based queries with date sorting
AttendanceRecordSchema.index({ eventId: 1, areaCode: 1 }) // Event attendance by area
// Index for sewadar attendance lookup
AttendanceRecordSchema.index({ sewadars: 1 })

export default mongoose.models.AttendanceRecord ||
  mongoose.model<IAttendanceRecord>("AttendanceRecord", AttendanceRecordSchema)
