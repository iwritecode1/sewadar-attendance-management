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
