import mongoose, { Schema, type Document } from "mongoose"

export interface ICenter extends Document {
  name: string
  code: string
  area: string
  areaCode: string
  createdAt: Date
}

const CenterSchema: Schema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  area: { type: String, required: true },
  areaCode: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

// Create indexes for common queries
CenterSchema.index({ areaCode: 1 })
CenterSchema.index({ name: 1 })
// Compound index for area and name to ensure unique center names within an area
CenterSchema.index({ area: 1, name: 1 }, { unique: true })
CenterSchema.index({ areaCode: 1, name: 1 }) // For area-based center lookups with sorting

export default mongoose.models.Center || mongoose.model<ICenter>("Center", CenterSchema)
