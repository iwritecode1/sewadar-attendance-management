const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");

const MONGODB_URI="mongodb+srv://iwritecode1:31Zs73BH0cJY6DLT@sewadar-attendance.w9lvybm.mongodb.net/sewadar-attendance?retryWrites=true&w=majority&appName=sewadar-attendance"
const DB_NAME = "sewadar-attendance";
const SALT_KEY = "ShukarDateya@01";

function hashPassword(password) {
  return bcrypt.hashSync(password, 12);
}

async function initializeDatabase() {
  console.log("🔄 Starting database initialization...");
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("📡 Connecting to MongoDB...");
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);

    // Create Area
    const areaCollection = db.collection("areas");
    const existingArea = await areaCollection.findOne({ code: "HI" });
    if (!existingArea) {
      await areaCollection.insertOne({
        name: "HISAR",
        code: "HI",
        zone: "Zone 3",
      });
      console.log("✅ Created HISAR area");
    }

    // Create Centers
    const centers = [
      { name: "HISSAR-I", code: "5228", area: "HISAR", areaCode: "HI" },
      { name: "HISSAR-II", code: "5229", area: "HISAR", areaCode: "HI" },
      { name: "HISSAR-III", code: "5230", area: "HISAR", areaCode: "HI" },
    ];

    const centerCollection = db.collection("centers");
    for (const center of centers) {
      const exists = await centerCollection.findOne({ code: center.code });
      if (!exists) {
        await centerCollection.insertOne(center);
        console.log(`✅ Created center: ${center.name}`);
      }
    }

    // Create Admin User
    const userCollection = db.collection("users");
    const existingAdmin = await userCollection.findOne({ username: "admin" });
    if (!existingAdmin) {
      await userCollection.insertOne({
        name: "Area Coordinator",
        username: "admin",
        password: hashPassword("admin123"),
        role: "admin",
        area: "HISAR",
        areaCode: "HI",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("✅ Created admin user");
    }

    // Create Coordinators
    const coordinators = [
      {
        name: "Center Coordinator 1",
        username: "coord1",
        password: hashPassword("coord123"),
        role: "coordinator",
        area: "HISAR",
        areaCode: "HI",
        centerId: "5228",
        centerName: "HISSAR-I",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Center Coordinator 2",
        username: "coord2",
        password: hashPassword("coord123"),
        role: "coordinator",
        area: "HISAR",
        areaCode: "HI",
        centerId: "5229",
        centerName: "HISSAR-II",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const coord of coordinators) {
      const exists = await userCollection.findOne({ username: coord.username });
      if (!exists) {
        await userCollection.insertOne(coord);
        console.log(`✅ Created coordinator: ${coord.name}`);
      }
    }

    console.log("🎉 Database initialization completed successfully!");
  } catch (err) {
    console.error("❌ Database initialization failed:", err.message);
  } finally {
    await client.close();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

initializeDatabase();
