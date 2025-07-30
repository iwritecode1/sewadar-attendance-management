import * as XLSX from "xlsx"
import type { ISewadar } from "@/models/Sewadar"

interface SewadarImportData {
  Badge_Number: string
  Sewadar_Name: string
  Father_Husband_Name: string
  DOB: string
  Age: string
  Gender: string
  Badge_Status: string
  Zone: string
  Area: string
  Centre: string
  Department: string
  Contact_No: string
  Emergency_Contact?: string
}

export function parseSewadarXLS(buffer: Buffer): Partial<ISewadar>[] {
  try {
    // Parse the Excel file
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as SewadarImportData[]



    // Map to Sewadar model format
    return jsonData
      .filter((row) => row.Badge_Number && row.Sewadar_Name) // Ensure required fields exist
      .map((row) => {
        // Extract center code from badge number (e.g., "HI5228GA0001" -> "5228")
        const centerCode = row.Badge_Number.match(/\d{4}/)?.[0] || ""

        // Extract area code from badge number (e.g., "HI5228GA0001" -> "HI")
        const areaCode = row.Badge_Number.substring(0, 2)

        // Parse age value
        const ageValue = parseInt(row.Age) || 0

        return {
          badgeNumber: row.Badge_Number,
          name: row.Sewadar_Name,
          fatherHusbandName: row.Father_Husband_Name || "",
          dob: row.DOB || "",
          age: ageValue,
          gender: (row.Gender === "FEMALE" ? "FEMALE" : "MALE") as "MALE" | "FEMALE",
          badgeStatus: (row.Badge_Status === "PERMANENT" || row.Badge_Status === "TEMPORARY" || row.Badge_Status === "OPEN"
            ? row.Badge_Status
            : "UNKNOWN") as "PERMANENT" | "TEMPORARY" | "OPEN" | "UNKNOWN",
          zone: row.Zone || "",
          area: row.Area || "",
          areaCode: areaCode,
          center: row.Centre || "",
          centerId: centerCode,
          department: row.Department || "",
          contactNo: row.Contact_No || "",
          emergencyContact: row.Emergency_Contact || "",
          updatedAt: new Date(),
        }
      })
  } catch (error) {
    console.error("Error parsing XLS file:", error)
    throw new Error("Failed to parse XLS file")
  }
}
