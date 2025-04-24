// server/scripts/setupAdmin.ts

// Use FRONTEND Firebase client for user creation
import { auth } from '../../src/lib/firebase'; // Path goes up from server/scripts to root, then to src/lib
import { createUserWithEmailAndPassword } from 'firebase/auth';
// Use BACKEND MongoDB connection
import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables explicitly from server/.env
// process.cwd() is the root where `npm run` is executed
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

// MongoDB Connection details
const mongoUri = process.env.MONGODB_URI;
const dbName = "camp-manager";

if (!mongoUri) {
    console.error("\n❌ MONGODB_URI not found in server/.env file.\n");
    process.exit(1);
}

const mongoClient = new MongoClient(mongoUri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

// Sync function using direct DB connection
async function syncAdminProfileToMongoDB(
    firebaseUser: { uid: string; email: string | null },
    role: 'admin',
    fullName: string
) {
    try {
        await mongoClient.connect();
        console.log("[setupAdmin] Connected to MongoDB for sync.");
        const db = mongoClient.db(dbName);
        const usersCollection = db.collection('users');

        const userData = {
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            role: role,
            fullName: fullName,
            // Initialize other fields if necessary
            dateOfBirth: null,
            phone: null,
            emergencyContact: null,
            medicalConditions: null,
            profilePicture: null,
        };

        const result = await usersCollection.updateOne(
            { firebaseUid: firebaseUser.uid },
            { $set: { ...userData, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
            { upsert: true }
        );
        console.log(`[setupAdmin] MongoDB sync result for ${firebaseUser.uid}: ${result.upsertedCount > 0 ? 'Inserted' : 'Updated'}`);
        return await usersCollection.findOne({ firebaseUid: firebaseUser.uid });
    } catch(err) {
         console.error("[setupAdmin] Error during MongoDB sync:", err);
         throw err; // Re-throw to fail the script
    } finally {
        await mongoClient.close();
         console.log("[setupAdmin] MongoDB connection closed.");
    }
}

// Main setup function
export const setupDefaultAdmin = async () => {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  const adminFullName = 'Default Admin';

  if (!adminEmail || !adminPassword) {
    console.error("\n❌ DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD not found in server/.env file.\n");
    process.exit(1);
  }
  console.log(`[setupAdmin] Attempting to create admin: ${adminEmail}`);

  try {
    // 1. Create Firebase Auth user (using FRONTEND client)
    const { user } = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log(`[setupAdmin] Admin account created in Firebase Auth: ${user.uid}`);

    // 2. Create/Sync MongoDB profile using direct connection
    await syncAdminProfileToMongoDB(user, 'admin', adminFullName);
    console.log('[setupAdmin] Admin profile synced/verified in MongoDB');

    return { email: adminEmail };

  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.warn(`[setupAdmin] Admin email ${adminEmail} already exists in Firebase Auth.`);
      // Optionally, verify/update the MongoDB profile even if Firebase user exists
      // try {
      //    console.log("[setupAdmin] Verifying existing admin profile in MongoDB...");
      //    const token = await auth.currentUser?.getIdToken(); // Needs sign in first, complex for script
      //    // Or find by email (requires email index in DB)
      //    await syncAdminProfileToMongoDB({ uid: 'LOOKUP_UID_SOMEHOW', email: adminEmail}, 'admin', adminFullName);
      // } catch (syncError) {
      //     console.error("[setupAdmin] Failed to sync existing admin profile:", syncError);
      // }
      return { email: adminEmail };
    }
    console.error('\n❌ [setupAdmin] Error setting up admin account:', error);
    throw error; // Re-throw
  }
};

// --- Execution ---
// Check if the script is run directly
const isRunDirectly = require.main === module;

if (isRunDirectly) {
    console.log("\n🚀 Running admin setup script...\n");
    setupDefaultAdmin()
        .then(result => {
            console.log(`\n✅ Admin setup process completed successfully for ${result?.email}.\n`);
            process.exit(0); // Explicitly exit with success code
        })
        .catch(err => {
            // Error already logged, just exit
            process.exit(1); // Exit with error code on failure
        });
}