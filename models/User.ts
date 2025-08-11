import mongoose, { Schema, type Document } from "mongoose"
import bcrypt from "bcryptjs"

export interface IUser extends Document {
  name: string
  username: string
  password: string
  role: "admin" | "coordinator"
  area: string
  areaCode: string
  centerId?: string
  centerName?: string
  isActive: boolean
  createdAt: Date
  comparePassword: (candidatePassword: string) => Promise<boolean>
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "coordinator"], required: true },
  area: { type: String, required: true },
  areaCode: { type: String, required: true },
  centerId: { type: String },
  centerName: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
})

// Create indexes for common queries
UserSchema.index({ role: 1 })
UserSchema.index({ areaCode: 1 })
UserSchema.index({ centerId: 1 })
UserSchema.index({ isActive: 1 })
UserSchema.index({ name: 1 })
UserSchema.index({ createdAt: -1 })
// Compound indexes for common query patterns
UserSchema.index({ role: 1, areaCode: 1 }) // Role-based queries by area
UserSchema.index({ role: 1, centerId: 1 }) // Coordinators by center
UserSchema.index({ role: 1, centerId: 1, isActive: 1 }) // Active coordinators by center
UserSchema.index({ areaCode: 1, isActive: 1 }) // Active users by area
UserSchema.index({ role: 1, areaCode: 1, isActive: 1 }) // Active users by role and area

// Hash password before saving
UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error: any) {
    next(error)
  }
})

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
