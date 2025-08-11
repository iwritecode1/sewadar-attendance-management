import mongoose, { Schema, type Document } from "mongoose"

export interface ISewaEvent extends Document {
  place: string
  department: string
  fromDate: string
  toDate: string
  area: string
  areaCode: string
  createdBy: string
  createdAt: Date
}

const SewaEventSchema: Schema = new Schema({
  place: { type: String, required: true },
  department: { type: String, required: true },
  fromDate: { type: String, required: true },
  toDate: { type: String, required: true },
  area: { type: String, required: true },
  areaCode: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
})

// Create indexes for common queries
SewaEventSchema.index({ areaCode: 1 })
SewaEventSchema.index({ department: 1 })
SewaEventSchema.index({ place: 1 })
SewaEventSchema.index({ createdBy: 1 })
SewaEventSchema.index({ createdAt: -1 })
SewaEventSchema.index({ fromDate: 1 })
SewaEventSchema.index({ toDate: 1 })
// Compound indexes for common query patterns
SewaEventSchema.index({ areaCode: 1, fromDate: -1 }) // Area events sorted by date
SewaEventSchema.index({ areaCode: 1, createdAt: -1 }) // Recent events by area
SewaEventSchema.index({ place: 1, department: 1, fromDate: 1, toDate: 1 }) // Duplicate event detection
SewaEventSchema.index({ areaCode: 1, department: 1 }) // Department-based filtering by area
// Date range queries
SewaEventSchema.index({ fromDate: 1, toDate: 1 })
SewaEventSchema.index({ areaCode: 1, fromDate: 1, toDate: 1 })

// Ensure the model is properly registered
let SewaEvent: mongoose.Model<ISewaEvent>

try {
  // Try to get existing model
  SewaEvent = mongoose.model<ISewaEvent>("SewaEvent")
} catch (error) {
  // Model doesn't exist, create it
  SewaEvent = mongoose.model<ISewaEvent>("SewaEvent", SewaEventSchema)
}

export default SewaEvent
