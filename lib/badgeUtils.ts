/**
 * Utility functions for badge number generation and management
 */

export interface BadgeGenerationOptions {
  centerId: string
  gender: "MALE" | "FEMALE"
  isTemporary?: boolean
}

/**
 * Generate badge number pattern based on center and gender
 */
export function generateBadgePattern(centerId: string, gender: "MALE" | "FEMALE", isTemporary = false): string {
  const genderPrefix = gender === "MALE" ? "GA" : "LA"
  const temporaryPrefix = isTemporary ? "T" : ""
  return `${temporaryPrefix}${centerId}${genderPrefix}`
}

/**
 * Extract number from badge (last 4 digits)
 */
export function extractBadgeNumber(badgeNumber: string): number {
  const match = badgeNumber.match(/(\d{4})$/)
  return match ? parseInt(match[1]) : 0
}

/**
 * Format badge number with leading zeros
 */
export function formatBadgeNumber(pattern: string, number: number): string {
  return `${pattern}${String(number).padStart(4, "0")}`
}

/**
 * Get next available badge number from existing badges
 */
export function getNextBadgeNumber(existingBadges: string[], pattern: string): string {
  const numbers = existingBadges
    .filter(badge => badge.startsWith(pattern))
    .map(extractBadgeNumber)
    .filter(num => num > 0)

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
  return formatBadgeNumber(pattern, nextNumber)
}

/**
 * Validate badge number format
 */
export function validateBadgeFormat(badgeNumber: string): boolean {
  // Regular badge: [Area][4digits][GA/LA][4digits] (e.g., HI5228GA0001)
  // Temporary badge: T[4digits][GA/LA][4digits] (e.g., T5228GA0001)
  const regularPattern = /^[A-Z]{2}\d{4}(GA|LA)\d{4}$/
  const temporaryPattern = /^T\d{4}(GA|LA)\d{4}$/
  
  return regularPattern.test(badgeNumber) || temporaryPattern.test(badgeNumber)
}