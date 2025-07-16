import mongoose, { Schema, type Document } from "mongoose"

export interface ITempSewadar {
  name: string
  fatherName: string
  age: number
  gender: "MALE" | "FEMALE"
  phone: string
  tempBadge: string
}

export interface IAttendanceRecord extends Document {
  eventId: mongoose.Types.ObjectId
  centerId: string
  centerName: string
  area: string
  areaCode: string
  sewadars: mongoose.Types.ObjectId[]
  tempSewadars: ITempSewadar[]
  nominalRollImages: string[]
  submittedBy: mongoose.Types.ObjectId
  submittedAt: Date
}

const TempSewadarSchema = new Schema({
  name: { type: String, required: true },
  fatherName: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ["MALE", "FEMALE"], required: true },
  phone: { type: String, required: true },
  tempBadge: { type: String, required: true },
})

const AttendanceRecordSchema: Schema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: "SewaEvent", required: true },
  centerId: { type: String, required: true },
  centerName: { type: String, required: true },
  area: { type: String, required: true },
  areaCode: { type: String, required: true },
  sewadars: [{ type: Schema.Types.ObjectId, ref: "Sewadar" }],
  tempSewadars: [TempSewadarSchema],
  nominalRollImages: [{ type: String }],
  submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  submittedAt: { type: Date, default: Date.now },
})

// Create indexes for common queries
AttendanceRecordSchema.index({ eventId: 1 })
AttendanceRecordSchema.index({ centerId: 1 })
AttendanceRecordSchema.index({ area: 1 })
AttendanceRecordSchema.index({ submittedAt: -1 })

export default mongoose.models.AttendanceRecord ||
  mongoose.model<IAttendanceRecord>("AttendanceRecord", AttendanceRecordSchema)
