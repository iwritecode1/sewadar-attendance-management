const mongoose = require('mongoose')

// MongoDB connection string - update as needed
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sewadar-management'

async function optimizeImportIndexes() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    
    const db = mongoose.connection.db
    const sewadarsCollection = db.collection('sewadars')
    const centersCollection = db.collection('centers')
    
    console.log('Creating optimized indexes for import performance...')
    
    // Sewadar collection indexes for import optimization
    const sewadarIndexes = [
      // Primary lookup index for badge number (most common lookup)
      { badgeNumber: 1 },
      
      // Compound index for temporary sewadar matching
      { name: 1, fatherHusbandName: 1, centerId: 1, badgeStatus: 1 },
      
      // Index for area-based filtering
      { areaCode: 1 },
      
      // Compound index for batch processing
      { centerId: 1, badgeStatus: 1 },
      
      // Index for duplicate detection
      { badgeNumber: 1, _id: 1 },
      
      // Text index for name searching (case-insensitive)
      { name: 'text', fatherHusbandName: 'text' }
    ]
    
    // Center collection indexes
    const centerIndexes = [
      // Primary lookup by code
      { code: 1 },
      
      // Area-based filtering
      { areaCode: 1 },
      
      // Compound for area + code lookup
      { areaCode: 1, code: 1 }
    ]
    
    // Create sewadar indexes
    console.log('Creating sewadar indexes...')
    for (const index of sewadarIndexes) {
      try {
        await sewadarsCollection.createIndex(index, { background: true })
        console.log(`✓ Created sewadar index: ${JSON.stringify(index)}`)
      } catch (error) {
        if (error.code === 85) {
          console.log(`- Index already exists: ${JSON.stringify(index)}`)
        } else {
          console.error(`✗ Failed to create sewadar index ${JSON.stringify(index)}:`, error.message)
        }
      }
    }
    
    // Create center indexes
    console.log('Creating center indexes...')
    for (const index of centerIndexes) {
      try {
        await centersCollection.createIndex(index, { background: true })
        console.log(`✓ Created center index: ${JSON.stringify(index)}`)
      } catch (error) {
        if (error.code === 85) {
          console.log(`- Index already exists: ${JSON.stringify(index)}`)
        } else {
          console.error(`✗ Failed to create center index ${JSON.stringify(index)}:`, error.message)
        }
      }
    }
    
    // Get index statistics
    console.log('\nIndex Statistics:')
    const sewadarIndexes = await sewadarsCollection.indexes()
    const centerIndexes = await centersCollection.indexes()
    
    console.log(`Sewadar collection indexes: ${sewadarIndexes.length}`)
    sewadarIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`)
    })
    
    console.log(`Center collection indexes: ${centerIndexes.length}`)
    centerIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`)
    })
    
    // Get collection stats
    const sewadarStats = await sewadarsCollection.stats()
    const centerStats = await centersCollection.stats()
    
    console.log('\nCollection Statistics:')
    console.log(`Sewadars: ${sewadarStats.count} documents, ${Math.round(sewadarStats.size / 1024 / 1024)}MB`)
    console.log(`Centers: ${centerStats.count} documents, ${Math.round(centerStats.size / 1024)}KB`)
    
    console.log('\n✅ Import optimization completed successfully!')
    
  } catch (error) {
    console.error('❌ Error optimizing indexes:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

// Run the optimization
optimizeImportIndexes()