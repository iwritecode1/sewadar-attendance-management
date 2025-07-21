// Static department options for the RSSB system
export const DEPARTMENTS = [
  "ADMINISTRATION",
  "AREA SECRETARY OFFICE", 
  "AUDIO-VISUAL",
  "BAAL PATHI",
  "BAAL SATSANG",
  "BAAL SATSANG KARTA",
  "BADGE SECTION",
  "B.A.V.",
  "ELECTRIC",
  "ENGLISH SATSANG SPEAKER",
  "ENQUIRY",
  "HORTICULTURE",
  "I.T.",
  "LANGAR",
  "LUGGAGE",
  "MAINTENANCE",
  "MEDICAL",
  "OFFICE",
  "PANDAL",
  "PATHI",
  "PICKLE",
  "SANITATION",
  "SATSANG KARTA",
  "SATSANG READER",
  "SECURITY",
  "STITCHING",
  "STORE",
  "TRAFFIC",
  "WATER",
  "WORKSHOP",
  "ZONAL OFFICE",
  "ZONAL PURCHASE CELL"
] as const

export type Department = typeof DEPARTMENTS[number]

// Badge status options
export const BADGE_STATUSES = [
  "PERMANENT",
  "TEMPORARY", 
  "OPEN",
  "UNKNOWN"
] as const

export type BadgeStatus = typeof BADGE_STATUSES[number]

// Gender options
export const GENDERS = [
  "MALE",
  "FEMALE"
] as const

export type Gender = typeof GENDERS[number]