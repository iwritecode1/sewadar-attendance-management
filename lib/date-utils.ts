/**
 * Utility functions for consistent date formatting across the application
 */

/**
 * Format date to DD/MM/YY format
 * @param date - Date string or Date object
 * @returns Formatted date string in DD/MM/YY format
 */
export function formatDate(date: string | Date): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) return ''
  
  const day = dateObj.getDate().toString().padStart(2, '0')
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  const year = dateObj.getFullYear().toString().slice(-2)
  
  return `${day}/${month}/${year}`
}

/**
 * Format date to DD/MM/YYYY format (full year)
 * @param date - Date string or Date object
 * @returns Formatted date string in DD/MM/YYYY format
 */
export function formatDateFull(date: string | Date): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) return ''
  
  const day = dateObj.getDate().toString().padStart(2, '0')
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  const year = dateObj.getFullYear().toString()
  
  return `${day}/${month}/${year}`
}

/**
 * Format date range for display
 * @param fromDate - Start date
 * @param toDate - End date
 * @returns Formatted date range string
 */
export function formatDateRange(fromDate: string | Date, toDate: string | Date): string {
  const from = formatDate(fromDate)
  const to = formatDate(toDate)
  
  if (!from || !to) return ''
  
  return `${from} to ${to}`
}

/**
 * Format date for input fields (YYYY-MM-DD)
 * @param date - Date string or Date object
 * @returns Formatted date string for input fields
 */
export function formatDateForInput(date: string | Date): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) return ''
  
  const year = dateObj.getFullYear()
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  const day = dateObj.getDate().toString().padStart(2, '0')
  
  return `${year}-${month}-${day}`
}