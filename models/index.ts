// Import all models to ensure they are registered with Mongoose
import Area from "./Area"
import AttendanceRecord from "./AttendanceRecord"
import Center from "./Center"
import Sewadar from "./Sewadar"
import SewaEvent from "./SewaEvent"
import User from "./User"

// Export all models
export {
  Area,
  AttendanceRecord,
  Center,
  Sewadar,
  SewaEvent,
  User,
}

// Ensure all models are registered
export default {
  Area,
  AttendanceRecord,
  Center,
  Sewadar,
  SewaEvent,
  User,
}