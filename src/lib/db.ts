// server/src/lib/db.ts

import { MongoClient, ServerApiVersion, Db, Collection, Document, ObjectId } from 'mongodb';

// process.env is expected to be populated by server.ts
const dbName = process.env.MONGODB_DB_NAME || "camp-manager";

// Initialize client later, after URI check in connectToDb
let client: MongoClient | null = null;
let dbInstance: Db | null = null;
let connectionPromise: Promise<Db> | null = null;

export async function connectToDb(): Promise<Db> {
  if (dbInstance) {
    return dbInstance;
  }
  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = process.env.MONGODB_URI; // Read URI when connection is actually needed
  if (!uri) {
    // This check is now reliable
    throw new Error("FATAL ERROR: MONGODB_URI environment variable is not set when attempting DB connection.");
  }

  // Initialize client here now that URI is confirmed
  if (!client) {
     console.log("[DB] Initializing MongoDB Client...");
     client = new MongoClient(uri, {
        serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
     });
  }


  console.log("[DB] Attempting MongoDB connection...");
  connectionPromise = (async () => {
    try {
      // Ensure client is not null (shouldn't be due to check above, but belts and suspenders)
      if (!client) throw new Error("MongoDB client not initialized");

      await client.connect();
      await client.db("admin").command({ ping: 1 });
      console.log("✅ Successfully connected to MongoDB!");
      dbInstance = client.db(dbName);
      connectionPromise = null; // Reset promise
      return dbInstance;
    } catch (error) {
      console.error("❌ [DB Connect Error]:", error);
      connectionPromise = null; // Reset promise
      client = null; // Reset client on connection error? Maybe not, allows retry.
      dbInstance = null;
      throw error; // Re-throw
    }
  })();

  return connectionPromise;
}

export async function getDb(): Promise<Db> {
  if (!dbInstance) {
    console.warn("[DB] getDb called before initial connection was established or after failure. Attempting connection...");
    return await connectToDb();
  }
  return dbInstance;
}

export async function getCollection<T extends Document>(collectionName: string): Promise<Collection<T>> {
    const db = await getDb();
    return db.collection<T>(collectionName);
}

export async function closeDbConnection() {
    if (client) {
        try {
            await client.close();
            dbInstance = null;
            client = null; // Clear client reference
            console.log("[DB] MongoDB connection closed.");
        } catch (error) {
            console.error("[DB] Error closing MongoDB connection:", error);
        }
    } else {
         console.log("[DB] No active MongoDB connection to close.");
    }
}