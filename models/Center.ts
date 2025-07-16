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

// Compound index for area and name to ensure unique center names within an area
CenterSchema.index({ area: 1, name: 1 }, { unique: true })

export default mongoose.models.Center || mongoose.model<ICenter>("Center", CenterSchema)
