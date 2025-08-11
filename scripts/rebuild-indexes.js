/**
 * Script to rebuild all database indexes
 * Use this if you need to force recreation of indexes
 */

const mongoose = require('mongoose')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sewadar-management'

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error)
    process.exit(1)
  }
}

async function rebuildIndexes() {
  console.log('\n🔨 Rebuilding Database Indexes')
  console.log('=' .repeat(60))

  const collections = ['sewadars', 'attendancerecords', 'sewaevents', 'users', 'centers']

  for (const collectionName of collections) {
    try {
      console.log(`\n🔄 Rebuilding indexes for ${collectionName}...`)
      
      const collection = mongoose.connection.db.collection(collectionName)
      
      // Drop all indexes except _id
      console.log('  • Dropping existing indexes...')
      await collection.dropIndexes()
      
      // Reindex will be triggered automatically when models are loaded
      console.log('  • Indexes will be recreated automatically')
      console.log('  ✅ Completed')
      
    } catch (error) {
      if (error.message.includes('ns not found')) {
        console.log(`  ⚠️  Collection ${collectionName} does not exist yet`)
      } else {
        console.error(`  ❌ Error rebuilding indexes for ${collectionName}:`, error.message)
      }
    }
  }

  // Now load models to trigger index creation
  console.log('\n📋 Loading models to recreate indexes...')
  try {
    require('../models/Sewadar')
    require('../models/AttendanceRecord')
    require('../models/SewaEvent')
    require('../models/User')
    require('../models/Center')
    console.log('✅ Models loaded, indexes will be created automatically')
  } catch (error) {
    console.error('❌ Error loading models:', error.message)
  }
}

async function waitForIndexCreation() {
  console.log('\n⏳ Waiting for index creation to complete...')
  
  // Wait a bit for indexes to be created
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  const collections = ['sewadars', 'attendancerecords', 'sewaevents', 'users', 'centers']
  
  for (const collectionName of collections) {
    try {
      const collection = mongoose.connection.db.collection(collectionName)
      const indexes = await collection.getIndexes()
      console.log(`  • ${collectionName}: ${Object.keys(indexes).length} indexes`)
    } catch (error) {
      if (!error.message.includes('ns not found')) {
        console.error(`  ❌ Error checking ${collectionName}:`, error.message)
      }
    }
  }
}

async function runRebuild() {
  await connectDB()
  
  try {
    await rebuildIndexes()
    await waitForIndexCreation()
    
    console.log('\n🎉 Index rebuild completed!')
    console.log('\n💡 Run "npm run verify:indexes" to verify the new indexes')
    
  } catch (error) {
    console.error('❌ Rebuild failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('👋 Disconnected from MongoDB')
  }
}

// Run rebuild if this script is executed directly
if (require.main === module) {
  console.log('⚠️  WARNING: This will drop and recreate all database indexes!')
  console.log('This may cause temporary performance degradation during rebuild.')
  console.log('Continue? (Press Ctrl+C to cancel, or wait 5 seconds to proceed)')
  
  setTimeout(() => {
    runRebuild().catch(console.error)
  }, 5000)
}

module.exports = { runRebuild }