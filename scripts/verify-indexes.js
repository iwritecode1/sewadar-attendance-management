/**
 * Script to verify all database indexes are properly created
 * Run this after deploying the optimized models
 */

const mongoose = require('mongoose')

// Import models to ensure indexes are created
const Sewadar = require('../models/Sewadar').default
const AttendanceRecord = require('../models/AttendanceRecord').default
const SewaEvent = require('../models/SewaEvent').default
const User = require('../models/User').default
const Center = require('../models/Center').default

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

async function verifyIndexes() {
  console.log('\n🔍 Verifying Database Indexes')
  console.log('=' .repeat(60))

  const collections = [
    { name: 'Sewadar', model: Sewadar },
    { name: 'AttendanceRecord', model: AttendanceRecord },
    { name: 'SewaEvent', model: SewaEvent },
    { name: 'User', model: User },
    { name: 'Center', model: Center }
  ]

  for (const { name, model } of collections) {
    try {
      console.log(`\n📋 ${name} Collection Indexes:`)
      
      // Get all indexes for the collection
      const indexes = await model.collection.getIndexes()
      
      // Display indexes in a readable format
      Object.entries(indexes).forEach(([indexName, indexSpec]) => {
        const fields = Object.keys(indexSpec.key).map(field => {
          const direction = indexSpec.key[field]
          if (direction === 1) return `${field}↑`
          if (direction === -1) return `${field}↓`
          if (direction === 'text') return `${field}(text)`
          return `${field}(${direction})`
        }).join(', ')
        
        const unique = indexSpec.unique ? ' [UNIQUE]' : ''
        const sparse = indexSpec.sparse ? ' [SPARSE]' : ''
        console.log(`  • ${indexName}: ${fields}${unique}${sparse}`)
      })
      
      console.log(`  Total indexes: ${Object.keys(indexes).length}`)
      
    } catch (error) {
      console.error(`❌ Error checking indexes for ${name}:`, error.message)
    }
  }
}

async function analyzeIndexUsage() {
  console.log('\n📊 Index Usage Statistics')
  console.log('=' .repeat(60))

  const collections = ['sewadars', 'attendancerecords', 'sewaevents', 'users', 'centers']
  
  for (const collectionName of collections) {
    try {
      console.log(`\n📈 ${collectionName.toUpperCase()} Index Usage:`)
      
      const stats = await mongoose.connection.db.collection(collectionName).aggregate([
        { $indexStats: {} }
      ]).toArray()
      
      if (stats.length === 0) {
        console.log('  No usage statistics available')
        continue
      }
      
      stats.forEach(stat => {
        const indexName = stat.name
        const usageCount = stat.accesses?.ops || 0
        const lastUsed = stat.accesses?.since ? new Date(stat.accesses.since).toISOString() : 'Never'
        
        console.log(`  • ${indexName}: ${usageCount} operations, last used: ${lastUsed}`)
      })
      
    } catch (error) {
      console.error(`❌ Error getting usage stats for ${collectionName}:`, error.message)
    }
  }
}

async function checkQueryPerformance() {
  console.log('\n⚡ Query Performance Tests')
  console.log('=' .repeat(60))

  const testQueries = [
    {
      name: 'Sewadar by Center and Gender',
      collection: 'sewadars',
      query: { centerId: '1234', gender: 'MALE' }
    },
    {
      name: 'Attendance by Area and Date',
      collection: 'attendancerecords',
      query: { areaCode: 'HI', submittedAt: { $gte: new Date('2024-01-01') } }
    },
    {
      name: 'Events by Area and Date Range',
      collection: 'sewaevents',
      query: { areaCode: 'HI', fromDate: { $gte: '2024-01-01' } }
    },
    {
      name: 'Active Coordinators by Center',
      collection: 'users',
      query: { role: 'coordinator', centerId: '1234', isActive: true }
    }
  ]

  for (const test of testQueries) {
    try {
      console.log(`\n🔍 Testing: ${test.name}`)
      
      const collection = mongoose.connection.db.collection(test.collection)
      const explain = await collection.find(test.query).explain('executionStats')
      
      const executionStats = explain.executionStats
      const indexUsed = executionStats.winningPlan?.inputStage?.indexName || 'No index used'
      const docsExamined = executionStats.totalDocsExamined
      const docsReturned = executionStats.totalDocsReturned
      const executionTime = executionStats.executionTimeMillis
      
      console.log(`  Index Used: ${indexUsed}`)
      console.log(`  Documents Examined: ${docsExamined}`)
      console.log(`  Documents Returned: ${docsReturned}`)
      console.log(`  Execution Time: ${executionTime}ms`)
      
      // Calculate efficiency
      const efficiency = docsReturned > 0 ? (docsReturned / docsExamined * 100).toFixed(2) : 0
      console.log(`  Query Efficiency: ${efficiency}%`)
      
      if (indexUsed === 'No index used') {
        console.log('  ⚠️  WARNING: Query not using any index!')
      } else if (efficiency < 50) {
        console.log('  ⚠️  WARNING: Low query efficiency, consider index optimization')
      } else {
        console.log('  ✅ Query is well optimized')
      }
      
    } catch (error) {
      console.error(`❌ Error testing query ${test.name}:`, error.message)
    }
  }
}

async function generateIndexReport() {
  console.log('\n📄 Index Optimization Report')
  console.log('=' .repeat(60))

  try {
    const dbStats = await mongoose.connection.db.stats()
    
    console.log(`Database: ${mongoose.connection.name}`)
    console.log(`Total Collections: ${dbStats.collections}`)
    console.log(`Total Indexes: ${dbStats.indexes}`)
    console.log(`Index Size: ${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Data Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Index to Data Ratio: ${((dbStats.indexSize / dbStats.dataSize) * 100).toFixed(2)}%`)
    
    // Recommendations
    console.log('\n💡 Recommendations:')
    const indexRatio = (dbStats.indexSize / dbStats.dataSize) * 100
    
    if (indexRatio > 50) {
      console.log('  ⚠️  High index to data ratio - consider reviewing unused indexes')
    } else if (indexRatio < 10) {
      console.log('  ✅ Good index to data ratio - well optimized')
    } else {
      console.log('  ✅ Reasonable index to data ratio')
    }
    
  } catch (error) {
    console.error('❌ Error generating report:', error.message)
  }
}

async function runVerification() {
  await connectDB()
  
  try {
    await verifyIndexes()
    await analyzeIndexUsage()
    await checkQueryPerformance()
    await generateIndexReport()
    
    console.log('\n🎉 Index verification completed!')
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('👋 Disconnected from MongoDB')
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  runVerification().catch(console.error)
}

module.exports = { runVerification }