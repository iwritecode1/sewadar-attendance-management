/**
 * Script to create test Excel files for sewadar import testing
 */

const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

// Test data for Excel file
const TEST_DATA = [
  {
    Badge_Number: 'HI1234GA0001',
    Sewadar_Name: 'John Doe',
    Father_Husband_Name: 'Robert Doe',
    DOB: '15-01-1998',
    Age: '26',
    Gender: 'MALE',
    Badge_Status: 'PERMANENT',
    Zone: 'North Zone',
    Area: 'Haryana',
    Centre: 'Test Center',
    Department: 'Security',
    Contact_No: '9876543210',
    Emergency_Contact: '9876543211'
  },
  {
    Badge_Number: 'HI1234GA0002',
    Sewadar_Name: 'Jane Smith',
    Father_Husband_Name: 'Michael Smith',
    DOB: '20-05-1995',
    Age: '29',
    Gender: 'FEMALE',
    Badge_Status: 'PERMANENT',
    Zone: 'North Zone',
    Area: 'Haryana',
    Centre: 'Test Center',
    Department: 'Medical',
    Contact_No: '9876543212',
    Emergency_Contact: '9876543213'
  }
]

function createTestExcel() {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new()
    
    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(TEST_DATA)
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sewadars')
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '..', 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    
    // Write the file
    const filePath = path.join(uploadsDir, 'test-sewadar-import.xlsx')
    XLSX.writeFile(workbook, filePath)
    
    console.log(`✅ Test Excel file created: ${filePath}`)
    console.log('\nFile contains:')
    TEST_DATA.forEach((sewadar, index) => {
      console.log(`${index + 1}. ${sewadar.Sewadar_Name} (${sewadar.Badge_Number}) - ${sewadar.Badge_Status}`)
    })
    
    return filePath
  } catch (error) {
    console.error('❌ Failed to create test Excel file:', error)
    throw error
  }
}

// Create temp-to-permanent test scenario Excel
function createTempToPermanentTestExcel() {
  try {
    // This Excel contains a permanent sewadar that should match a temporary one
    const tempToPermanentData = [
      {
        Badge_Number: 'HI1234GA0003',
        Sewadar_Name: 'John Doe',  // Same name as temp sewadar
        Father_Husband_Name: 'Robert Doe',  // Same father name as temp sewadar
        DOB: '15-01-1998',
        Age: '26',
        Gender: 'MALE',
        Badge_Status: 'PERMANENT',  // Now permanent
        Zone: 'North Zone',
        Area: 'Haryana',
        Centre: 'Test Center',  // Same center
        Department: 'Security',
        Contact_No: '9876543210',
        Emergency_Contact: '9876543211'
      }
    ]
    
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(tempToPermanentData)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sewadars')
    
    const uploadsDir = path.join(__dirname, '..', 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    
    const filePath = path.join(uploadsDir, 'test-temp-to-permanent.xlsx')
    XLSX.writeFile(workbook, filePath)
    
    console.log(`✅ Temp-to-permanent test Excel file created: ${filePath}`)
    console.log('\nThis file should be used after creating a temporary sewadar with:')
    console.log('- Name: John Doe')
    console.log('- Father Name: Robert Doe')
    console.log('- Center: Test Center (1234)')
    console.log('- Badge Status: TEMPORARY')
    
    return filePath
  } catch (error) {
    console.error('❌ Failed to create temp-to-permanent test Excel file:', error)
    throw error
  }
}

function createTestFiles() {
  console.log('📊 Creating test Excel files for sewadar import...\n')
  
  try {
    createTestExcel()
    console.log('')
    createTempToPermanentTestExcel()
    
    console.log('\n🎉 All test files created successfully!')
    console.log('\nUsage:')
    console.log('1. Use test-sewadar-import.xlsx for general import testing')
    console.log('2. Use test-temp-to-permanent.xlsx for testing temp-to-permanent conversion')
    
  } catch (error) {
    console.error('❌ Failed to create test files:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  createTestFiles()
}

module.exports = { createTestExcel, createTempToPermanentTestExcel }