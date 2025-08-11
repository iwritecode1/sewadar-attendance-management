/**
 * Test script for temporary to permanent sewadar import functionality
 * This script creates test data and verifies the import logic works correctly
 */

const mongoose = require('mongoose')
const Sewadar = require('../models/Sewadar').default

// Test configuration
const TEST_CONFIG = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/sewadar-test',
  testCenterId: '1234',
  testAreaCode: 'HI'
}

// Test data
const TEMP_SEWADAR = {
  badgeNumber: 'TEMP001',
  name: 'John Doe',
  fatherHusbandName: 'Robert Doe',
  gender: 'MALE',
  badgeStatus: 'TEMPORARY',
  zone: 'North Zone',
  area: 'Haryana',
  areaCode: TEST_CONFIG.testAreaCode,
  center: 'Test Center',
  centerId: TEST_CONFIG.testCenterId,
  department: 'Security',
  age: 25
}

const PERMANENT_SEWADAR_DATA = {
  badgeNumber: 'HI1234GA0001',
  name: 'John Doe',
  fatherHusbandName: 'Robert Doe',
  gender: 'MALE',
  badgeStatus: 'PERMANENT',
  zone: 'North Zone',
  area: 'Haryana',
  areaCode: TEST_CONFIG.testAreaCode,
  center: 'Test Center',
  centerId: TEST_CONFIG.testCenterId,
  department: 'Security',
  age: 25
}

async function connectDB() {
  try {
    await mongoose.connect(TEST_CONFIG.mongoUri)
    console.log('✅ Connected to MongoDB')
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error)
    process.exit(1)
  }
}

async function cleanup() {
  try {
    // Clean up test data
    await Sewadar.deleteMany({
      $or: [
        { badgeNumber: TEMP_SEWADAR.badgeNumber },
        { badgeNumber: PERMANENT_SEWADAR_DATA.badgeNumber }
      ]
    })
    console.log('🧹 Cleaned up test data')
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  }
}

async function testTempToPermanentConversion() {
  console.log('\n🧪 Testing Temporary to Permanent Sewadar Conversion')
  console.log('=' .repeat(60))

  try {
    // Step 1: Create temporary sewadar
    console.log('\n1️⃣ Creating temporary sewadar...')
    const tempSewadar = await Sewadar.create(TEMP_SEWADAR)
    console.log(`✅ Created temp sewadar: ${tempSewadar.name} (${tempSewadar.badgeNumber})`)

    // Step 2: Simulate import logic - check by badge number first
    console.log('\n2️⃣ Testing import logic...')
    
    // First check: by badge number (should not find anything)
    let existingSewadar = await Sewadar.findOne({
      badgeNumber: PERMANENT_SEWADAR_DATA.badgeNumber,
    })
    console.log(`Badge number check: ${existingSewadar ? 'Found' : 'Not found'}`)

    // Second check: by name + father name + center + temp status
    if (!existingSewadar) {
      existingSewadar = await Sewadar.findOne({
        name: { $regex: new RegExp(`^${PERMANENT_SEWADAR_DATA.name.trim()}$`, 'i') },
        fatherHusbandName: { $regex: new RegExp(`^${PERMANENT_SEWADAR_DATA.fatherHusbandName.trim()}$`, 'i') },
        centerId: PERMANENT_SEWADAR_DATA.centerId,
        badgeStatus: "TEMPORARY"
      })
      console.log(`Temp sewadar check: ${existingSewadar ? 'Found' : 'Not found'}`)
    }

    // Step 3: Check for badge conflicts
    if (existingSewadar) {
      const badgeConflict = await Sewadar.findOne({
        badgeNumber: PERMANENT_SEWADAR_DATA.badgeNumber,
        _id: { $ne: existingSewadar._id }
      })
      console.log(`Badge conflict check: ${badgeConflict ? 'Conflict found' : 'No conflict'}`)

      if (!badgeConflict) {
        // Step 4: Update the temporary sewadar
        console.log('\n3️⃣ Updating temporary sewadar with permanent details...')
        await Sewadar.updateOne(
          { _id: existingSewadar._id },
          {
            $set: {
              ...PERMANENT_SEWADAR_DATA,
              updatedAt: new Date(),
            },
          },
        )
        console.log('✅ Successfully updated temporary sewadar to permanent')

        // Step 5: Verify the update
        const updatedSewadar = await Sewadar.findById(existingSewadar._id)
        console.log('\n4️⃣ Verification:')
        console.log(`- Badge Number: ${updatedSewadar.badgeNumber}`)
        console.log(`- Badge Status: ${updatedSewadar.badgeStatus}`)
        console.log(`- Name: ${updatedSewadar.name}`)
        console.log(`- Father Name: ${updatedSewadar.fatherHusbandName}`)
        console.log(`- Center ID: ${updatedSewadar.centerId}`)

        // Verify the old temp badge is gone and new permanent badge exists
        const oldBadgeExists = await Sewadar.findOne({ badgeNumber: TEMP_SEWADAR.badgeNumber })
        const newBadgeExists = await Sewadar.findOne({ badgeNumber: PERMANENT_SEWADAR_DATA.badgeNumber })
        
        console.log(`\n✅ Test Results:`)
        console.log(`- Old temp badge exists: ${oldBadgeExists ? 'Yes (❌ FAIL)' : 'No (✅ PASS)'}`)
        console.log(`- New permanent badge exists: ${newBadgeExists ? 'Yes (✅ PASS)' : 'No (❌ FAIL)'}`)
        console.log(`- Same document ID: ${updatedSewadar._id.toString() === tempSewadar._id.toString() ? 'Yes (✅ PASS)' : 'No (❌ FAIL)'}`)
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

async function testBadgeConflict() {
  console.log('\n🧪 Testing Badge Number Conflict Detection')
  console.log('=' .repeat(60))

  try {
    // Create a sewadar with the permanent badge number
    console.log('\n1️⃣ Creating sewadar with permanent badge...')
    const permanentSewadar = await Sewadar.create({
      ...PERMANENT_SEWADAR_DATA,
      name: 'Different Person',
      fatherHusbandName: 'Different Father'
    })
    console.log(`✅ Created permanent sewadar: ${permanentSewadar.name}`)

    // Create a temporary sewadar
    console.log('\n2️⃣ Creating temporary sewadar...')
    const tempSewadar = await Sewadar.create(TEMP_SEWADAR)
    console.log(`✅ Created temp sewadar: ${tempSewadar.name}`)

    // Try to update temp sewadar with conflicting badge
    console.log('\n3️⃣ Testing conflict detection...')
    const badgeConflict = await Sewadar.findOne({
      badgeNumber: PERMANENT_SEWADAR_DATA.badgeNumber,
      _id: { $ne: tempSewadar._id }
    })

    console.log(`Badge conflict detected: ${badgeConflict ? 'Yes (✅ PASS)' : 'No (❌ FAIL)'}`)

    if (badgeConflict) {
      console.log('✅ Conflict detection working correctly - import would be rejected')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

async function runTests() {
  await connectDB()
  
  try {
    await cleanup()
    await testTempToPermanentConversion()
    
    await cleanup()
    await testBadgeConflict()
    
    console.log('\n🎉 All tests completed!')
    
  } finally {
    await cleanup()
    await mongoose.disconnect()
    console.log('👋 Disconnected from MongoDB')
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = { runTests }