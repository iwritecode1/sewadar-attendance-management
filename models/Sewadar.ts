import mongoose, { Schema, type Document } from "mongoose"

export interface ISewadar extends Document {
  badgeNumber: string
  name: string
  fatherHusbandName: string
  dob: string
  gender: "MALE" | "FEMALE"
  badgeStatus: "PERMANENT" | "TEMPORARY" | "OPEN" | "UNKNOWN"
  zone: string
  area: string
  areaCode: string
  center: string
  centerId: string
  department: string
  contactNo: string
  emergencyContact: string
  createdAt: Date
  updatedAt: Date
}

const SewadarSchema: Schema = new Schema({
  badgeNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  fatherHusbandName: { type: String, required: true },
  dob: { type: String },
  gender: { type: String, enum: ["MALE", "FEMALE"], required: true },
  badgeStatus: { type: String, enum: ["PERMANENT", "OPEN", "TEMPORARY", "UNKNOWN"], required: true, default: "UNKNOWN" },
  zone: { type: String, required: true },
  area: { type: String, required: true },
  areaCode: { type: String, required: true },
  center: { type: String, required: true },
  centerId: { type: String, required: true },
  department: { type: String },
  contactNo: { type: String },
  emergencyContact: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// Create indexes for common queries
SewadarSchema.index({ centerId: 1 })
SewadarSchema.index({ area: 1 })
SewadarSchema.index({ department: 1 })
SewadarSchema.index({ name: "text" })

export default mongoose.models.Sewadar || mongoose.model<ISewadar>("Sewadar", SewadarSchema)
