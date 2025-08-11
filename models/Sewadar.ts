import mongoose, { Schema, type Document } from "mongoose"

export interface ISewadar extends Document {
  badgeNumber: string
  name: string
  fatherHusbandName: string
  dob: string
  age: number
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
  age: { type: Number },
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
SewadarSchema.index({ areaCode: 1 })
SewadarSchema.index({ department: 1 })
SewadarSchema.index({ badgeStatus: 1 })
SewadarSchema.index({ gender: 1 })
SewadarSchema.index({ name: "text" })
SewadarSchema.index({ createdAt: -1 })
SewadarSchema.index({ updatedAt: -1 })
// Compound indexes for common query patterns
SewadarSchema.index({ name: 1, fatherHusbandName: 1, centerId: 1, badgeStatus: 1 }) // Temp sewadar lookup during import
SewadarSchema.index({ centerId: 1, gender: 1 }) // Gender-based queries by center
SewadarSchema.index({ centerId: 1, department: 1 }) // Department-based queries by center
SewadarSchema.index({ centerId: 1, badgeStatus: 1 }) // Badge status queries by center
SewadarSchema.index({ areaCode: 1, department: 1 }) // Department stats by area
SewadarSchema.index({ areaCode: 1, gender: 1 }) // Gender stats by area
SewadarSchema.index({ areaCode: 1, badgeStatus: 1 }) // Badge status stats by area
SewadarSchema.index({ centerId: 1, name: 1, fatherHusbandName: 1 }) // Duplicate detection in center
// Badge number pattern queries for auto-generation
SewadarSchema.index({ centerId: 1, badgeNumber: 1 })
SewadarSchema.index({ badgeNumber: 1, centerId: 1 }) // Badge lookup with center validation
// Sorting and pagination
// SewadarSchema.index({ badgeNumber: 1 }) // Default sorting
// SewadarSchema.index({ centerId: 1, badgeNumber: 1 }) // Center-based sorting

// Force model recompilation to ensure schema changes are recognized
if (mongoose.models.Sewadar) {
  delete mongoose.models.Sewadar
}

export default mongoose.model<ISewadar>("Sewadar", SewadarSchema)
