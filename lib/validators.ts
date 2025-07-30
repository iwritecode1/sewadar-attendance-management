interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export function validateSewadarData(data: any): ValidationResult {
  const errors: string[] = []

  if (!data.badgeNumber || typeof data.badgeNumber !== "string" || data.badgeNumber.trim().length === 0) {
    errors.push("Badge number is required")
  }

  if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
    errors.push("Name is required")
  }

  if (!data.fatherHusbandName || typeof data.fatherHusbandName !== "string") {
    errors.push("Father/Husband name is required")
  }

  if (!data.gender || !["MALE", "FEMALE"].includes(data.gender)) {
    errors.push("Valid gender is required (MALE or FEMALE)")
  }

  if (!data.badgeStatus || !["PERMANENT", "OPEN", "TEMPORARY"].includes(data.badgeStatus)) {
    errors.push("Valid badge status is required (PERMANENT or OPEN)")
  }

  if (!data.centerId || typeof data.centerId !== "string" || data.centerId.trim().length === 0) {
    errors.push("Center ID is required")
  }

  if (!data.department || typeof data.department !== "string" || data.department.trim().length === 0) {
    errors.push("Department is required")
  }

  if (data.contactNo && typeof data.contactNo === "string") {
    const phoneRegex = /^[0-9]{10}$/
    if (!phoneRegex.test(data.contactNo.replace(/\D/g, ""))) {
      errors.push("Contact number must be a valid 10-digit phone number")
    }
  }

  if (data.dob && typeof data.dob === "string") {
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/
    if (!dateRegex.test(data.dob)) {
      errors.push("Date of birth must be in DD-MM-YYYY format")
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateAttendanceData(data: any): ValidationResult {
  const errors: string[] = []

  if (!data.eventId || typeof data.eventId !== "string" || data.eventId.trim().length === 0) {
    errors.push("Event ID is required")
  }

  if (!data.centerId || typeof data.centerId !== "string" || data.centerId.trim().length === 0) {
    errors.push("Center ID is required")
  }

  if (!data.centerName || typeof data.centerName !== "string" || data.centerName.trim().length === 0) {
    errors.push("Center name is required")
  }

  if (!Array.isArray(data.sewadarIds)) {
    errors.push("Sewadar IDs must be an array")
  }

  if (!Array.isArray(data.tempSewadars)) {
    errors.push("Temporary sewadars must be an array")
  }

  // Validate that at least one sewadar is selected
  if (data.sewadarIds.length === 0 && data.tempSewadars.length === 0) {
    errors.push("At least one sewadar must be selected")
  }

  // Validate temporary sewadars (they will be converted to actual sewadars)
  if (Array.isArray(data.tempSewadars)) {
    data.tempSewadars.forEach((tempSewadar: any, index: number) => {
      if (!tempSewadar.name || typeof tempSewadar.name !== "string") {
        errors.push(`Temporary sewadar ${index + 1}: Name is required`)
      }
      if (!tempSewadar.fatherName || typeof tempSewadar.fatherName !== "string") {
        errors.push(`Temporary sewadar ${index + 1}: Father name is required`)
      }
      if (!tempSewadar.gender || !["MALE", "FEMALE"].includes(tempSewadar.gender)) {
        errors.push(`Temporary sewadar ${index + 1}: Valid gender is required`)
      }
      if (!tempSewadar.age || isNaN(Number(tempSewadar.age)) || Number(tempSewadar.age) < 1) {
        errors.push(`Temporary sewadar ${index + 1}: Valid age is required`)
      }
    })
  }

  // Nominal roll images are now optional
  // if (!data.nominalRollImages || (Array.isArray(data.nominalRollImages) && data.nominalRollImages.length === 0)) {
  //   errors.push("Nominal roll images are required")
  // }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateCenterData(data: any): ValidationResult {
  const errors: string[] = []

  if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
    errors.push("Center name is required")
  }

  if (!data.code || typeof data.code !== "string" || data.code.trim().length === 0) {
    errors.push("Center code is required")
  }

  if (data.code && typeof data.code === "string") {
    const codeRegex = /^\d{4}$/
    if (!codeRegex.test(data.code)) {
      errors.push("Center code must be a 4-digit number")
    }
  }

  if (!data.area || typeof data.area !== "string" || data.area.trim().length === 0) {
    errors.push("Area is required")
  }

  if (!data.areaCode || typeof data.areaCode !== "string" || data.areaCode.trim().length === 0) {
    errors.push("Area code is required")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateCoordinatorData(data: any): ValidationResult {
  const errors: string[] = []

  if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
    errors.push("Name is required")
  }

  if (!data.username || typeof data.username !== "string" || data.username.trim().length === 0) {
    errors.push("Username is required")
  }

  if (data.username && typeof data.username === "string") {
    const usernameRegex = /^[a-zA-Z0-9_.@-]{5,35}$/;
    if (!usernameRegex.test(data.username)) {
      errors.push("Username must be 5-35 characters long and contain only letters, numbers, underscores, dots, @ symbols, and hyphens")
    }
  }

  if (!data.password || typeof data.password !== "string" || data.password.length < 6) {
    errors.push("Password must be at least 6 characters long")
  }

  if (!data.centerId || typeof data.centerId !== "string" || data.centerId.trim().length === 0) {
    errors.push("Center ID is required")
  }

  if (!data.area || typeof data.area !== "string" || data.area.trim().length === 0) {
    errors.push("Area is required")
  }

  if (!data.areaCode || typeof data.areaCode !== "string" || data.areaCode.trim().length === 0) {
    errors.push("Area code is required")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateEventData(data: any): ValidationResult {
  const errors: string[] = []

  if (!data.place || typeof data.place !== "string" || data.place.trim().length === 0) {
    errors.push("Place is required")
  }

  if (!data.department || typeof data.department !== "string" || data.department.trim().length === 0) {
    errors.push("Department is required")
  }

  if (!data.fromDate || typeof data.fromDate !== "string") {
    errors.push("From date is required")
  }

  if (!data.toDate || typeof data.toDate !== "string") {
    errors.push("To date is required")
  }

  if (data.fromDate && data.toDate) {
    const fromDate = new Date(data.fromDate)
    const toDate = new Date(data.toDate)

    if (fromDate > toDate) {
      errors.push("From date cannot be later than to date")
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
