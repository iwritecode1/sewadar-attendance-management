import mongoose, { Schema, type Document } from "mongoose"

export interface IArea extends Document {
  name: string
  code: string
  zone: string
  createdAt: Date
}

const AreaSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  zone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.Area || mongoose.model<IArea>("Area", AreaSchema)
