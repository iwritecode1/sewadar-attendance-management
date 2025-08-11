const mongoose = require('mongoose')

// MongoDB connection string - update as needed
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/sewadar-management'

async function cleanDuplicateIndexes() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    
    const db = mongoose.connection.db
    const sewadarsCollection = db.collection('sewadars')
    const centersCollection = db.collection('centers')
    
    console.log('Analyzing existing indexes...')
    
    // Check if collections exist first
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name)
    
    console.log('Available collections:', collectionNames)
    
    if (!collectionNames.includes('sewadars')) {
      console.log('⚠️  Sewadars collection does not exist yet. Skipping index cleanup.')
      console.log('💡 This is normal for a new database. Indexes will be created when data is first imported.')
      return
    }
    
    // Get current indexes
    const sewadarIndexes = await sewadarsCollection.indexes()
    const centerIndexes = collectionNames.includes('centers') ? await centersCollection.indexes() : []
    
    console.log('\nCurrent Sewadar Indexes:')
    sewadarIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`)
    })
    
    console.log('\nCurrent Center Indexes:')
    if (centerIndexes.length > 0) {
      centerIndexes.forEach(index => {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`)
      })
    } else {
      console.log('  - No center indexes found')
    }
    
    // Find and remove problematic duplicate indexes
    const problematicIndexes = [
      // These are the indexes causing warnings
      'badgeNumber_1_centerId_1',
      'centerId_1_badgeNumber_1',
      'badgeNumber_1__id_1'
    ]
    
    console.log('\nRemoving problematic duplicate indexes...')
    
    for (const indexName of problematicIndexes) {
      try {
        const indexExists = sewadarIndexes.find(idx => idx.name === indexName)
        if (indexExists) {
          await sewadarsCollection.dropIndex(indexName)
          console.log(`✓ Dropped duplicate index: ${indexName}`)
        } else {
          console.log(`- Index not found: ${indexName}`)
        }
      } catch (error) {
        if (error.code === 27) {
          console.log(`- Index not found: ${indexName}`)
        } else {
          console.error(`✗ Failed to drop index ${indexName}:`, error.message)
        }
      }
    }
    
    // Now create only the essential indexes we need
    console.log('\nCreating essential indexes...')
    
    const essentialIndexes = [
      // Single field indexes
      { badgeNumber: 1 },
      { areaCode: 1 },
      { centerId: 1 },
      { badgeStatus: 1 },
      
      // Compound indexes for import optimization
      { name: 1, fatherHusbandName: 1, centerId: 1, badgeStatus: 1 },
      { centerId: 1, badgeStatus: 1 },
      
      // Text index for searching
      { name: 'text', fatherHusbandName: 'text' }
    ]
    
    for (const index of essentialIndexes) {
      try {
        await sewadarsCollection.createIndex(index, { 
          background: true,
          name: generateIndexName(index)
        })
        console.log(`✓ Created index: ${JSON.stringify(index)}`)
      } catch (error) {
        if (error.code === 85) {
          console.log(`- Index already exists: ${JSON.stringify(index)}`)
        } else {
          console.error(`✗ Failed to create index ${JSON.stringify(index)}:`, error.message)
        }
      }
    }
    
    // Essential center indexes (only if centers collection exists)
    if (collectionNames.includes('centers')) {
      const centerEssentialIndexes = [
        { code: 1 },
        { areaCode: 1 }
      ]
      
      for (const index of centerEssentialIndexes) {
        try {
          await centersCollection.createIndex(index, { 
            background: true,
            name: generateIndexName(index)
          })
          console.log(`✓ Created center index: ${JSON.stringify(index)}`)
        } catch (error) {
          if (error.code === 85) {
            console.log(`- Center index already exists: ${JSON.stringify(index)}`)
          } else {
            console.error(`✗ Failed to create center index ${JSON.stringify(index)}:`, error.message)
          }
        }
      }
    } else {
      console.log('⚠️  Centers collection does not exist. Skipping center indexes.')
    }
    
    // Final index report
    console.log('\nFinal Index Report:')
    const finalSewadarIndexes = await sewadarsCollection.indexes()
    const finalCenterIndexes = collectionNames.includes('centers') ? await centersCollection.indexes() : []
    
    console.log(`Sewadar collection indexes: ${finalSewadarIndexes.length}`)
    finalSewadarIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`)
    })
    
    console.log(`Center collection indexes: ${finalCenterIndexes.length}`)
    finalCenterIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`)
    })
    
    console.log('\n✅ Index cleanup completed successfully!')
    
  } catch (error) {
    console.error('❌ Error cleaning indexes:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

function generateIndexName(indexSpec) {
  // Generate a consistent index name
  const keys = Object.keys(indexSpec)
  return keys.map(key => `${key}_${indexSpec[key]}`).join('_')
}

// Run the cleanup
cleanDuplicateIndexes()