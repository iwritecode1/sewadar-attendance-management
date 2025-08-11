const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

// Generate test data for import testing
function generateTestData(count = 2500) {
  console.log(`Generating ${count} test sewadar records...`)
  
  const areas = ['HISAR', 'DELHI', 'MUMBAI', 'KOLKATA']
  const centers = {
    'HISAR': ['HISSAR-I', 'HISSAR-II', 'HISSAR-III'],
    'DELHI': ['DELHI-I', 'DELHI-II', 'DELHI-III'],
    'MUMBAI': ['MUMBAI-I', 'MUMBAI-II', 'MUMBAI-III'],
    'KOLKATA': ['KOLKATA-I', 'KOLKATA-II', 'KOLKATA-III']
  }
  const departments = ['LANGAR', 'SECURITY', 'CLEANING', 'PARKING', 'GENERAL']
  const genders = ['MALE', 'FEMALE']
  // Include various badge statuses to test normalization
  const badgeStatuses = [
    'PERMANENT', 'OPEN', 'TEMPORARY',
    'TEMP', 'PERM', 'ACTIVE', 'INACTIVE', 
    'PENDING', 'EXPIRED', 'SUSPENDED',
    'NEW', 'OLD', 'REGULAR', 'SPECIAL'
  ]
  
  const firstNames = [
    'RAJESH', 'SURESH', 'RAMESH', 'MAHESH', 'DINESH', 'NARESH', 'MUKESH', 'RITESH',
    'PRIYA', 'SUNITA', 'GEETA', 'SEETA', 'RITA', 'NITA', 'KAVITA', 'LALITA',
    'AMIT', 'SUMIT', 'ROHIT', 'MOHIT', 'AJIT', 'LALIT', 'ANKIT', 'VINIT'
  ]
  
  const lastNames = [
    'KUMAR', 'SINGH', 'SHARMA', 'GUPTA', 'VERMA', 'AGARWAL', 'JAIN', 'BANSAL',
    'MITTAL', 'GOEL', 'ARORA', 'MALHOTRA', 'CHOPRA', 'KAPOOR', 'SETHI', 'BHATIA'
  ]
  
  const data = []
  
  for (let i = 1; i <= count; i++) {
    const area = areas[Math.floor(Math.random() * areas.length)]
    const centerList = centers[area]
    const center = centerList[Math.floor(Math.random() * centerList.length)]
    const gender = genders[Math.floor(Math.random() * genders.length)]
    const badgeStatus = badgeStatuses[Math.floor(Math.random() * badgeStatuses.length)]
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    const fatherFirstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const fatherLastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    
    // Generate badge number based on area and gender
    const areaCode = area.substring(0, 2)
    const genderCode = gender === 'MALE' ? 'M' : 'F'
    const centerCode = center.split('-')[1] || '1'
    const badgeNumber = `${areaCode}${String(i).padStart(4, '0')}${genderCode}${centerCode}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
    
    const record = {
      Badge_Number: badgeNumber,
      Sewadar_Name: `${firstName} ${lastName}`,
      Father_Husband_Name: `${fatherFirstName} ${fatherLastName}`,
      DOB: `${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${1950 + Math.floor(Math.random() * 50)}`,
      Age: Math.floor(Math.random() * 50) + 20,
      Gender: gender,
      Badge_Status: badgeStatus,
      Zone: `Zone ${Math.floor(Math.random() * 5) + 1}`,
      Area: area,
      Centre: center,
      Department: departments[Math.floor(Math.random() * departments.length)],
      Contact_No: `9${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`,
      Emergency_Contact: `9${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`
    }
    
    data.push(record)
    
    if (i % 500 === 0) {
      console.log(`Generated ${i} records...`)
    }
  }
  
  return data
}

function createTestExcelFile(data, filename) {
  console.log(`Creating Excel file: ${filename}`)
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Sewadars')
  
  // Write file
  const filePath = path.join(__dirname, '..', 'uploads', filename)
  
  // Ensure uploads directory exists
  const uploadsDir = path.dirname(filePath)
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
  
  XLSX.writeFile(wb, filePath)
  
  const stats = fs.statSync(filePath)
  console.log(`✅ Created ${filename}`)
  console.log(`   Records: ${data.length}`)
  console.log(`   File size: ${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB`)
  console.log(`   Location: ${filePath}`)
  
  return filePath
}

function generateMultipleTestFiles() {
  const testCases = [
    { count: 100, name: 'test_import_small_100.xlsx' },
    { count: 500, name: 'test_import_medium_500.xlsx' },
    { count: 1000, name: 'test_import_large_1000.xlsx' },
    { count: 2500, name: 'test_import_xlarge_2500.xlsx' },
    { count: 5000, name: 'test_import_xxlarge_5000.xlsx' }
  ]
  
  console.log('🚀 Generating test files for optimized import testing...\n')
  
  testCases.forEach(testCase => {
    console.log(`\n📊 Generating ${testCase.count} records...`)
    const data = generateTestData(testCase.count)
    createTestExcelFile(data, testCase.name)
  })
  
  console.log('\n✅ All test files generated successfully!')
  console.log('\nTest files created:')
  testCases.forEach(testCase => {
    console.log(`  - ${testCase.name} (${testCase.count} records)`)
  })
  
  console.log('\n📝 Usage Instructions:')
  console.log('1. Start your Next.js development server')
  console.log('2. Login as an admin user')
  console.log('3. Go to Sewadars page and click Import')
  console.log('4. Upload one of the generated test files')
  console.log('5. Monitor the progress modal for large files')
  console.log('6. Check the import results and error reports')
  
  console.log('\n🔧 Performance Testing:')
  console.log('- Small (100): Should complete instantly')
  console.log('- Medium (500): Should complete in ~10-15 seconds')
  console.log('- Large (1000): Should complete in ~20-30 seconds')
  console.log('- XLarge (2500): Should complete in ~1-2 minutes')
  console.log('- XXLarge (5000): Should complete in ~2-4 minutes')
}

// Run the test file generation
if (require.main === module) {
  generateMultipleTestFiles()
}

module.exports = {
  generateTestData,
  createTestExcelFile,
  generateMultipleTestFiles
}