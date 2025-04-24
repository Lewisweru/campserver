// server/src/config/firebaseAdmin.ts

import * as admin from 'firebase-admin';
import { credential as adminCredential } from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

// Load server/.env relative to this file (config -> src -> server)
const envPath = path.resolve(__dirname, '../../.env');
console.log(`[Firebase Admin Config] Attempting to load env from: ${envPath}`);
dotenv.config({ path: envPath });

let firebaseCredential;

const googleAppCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

console.log("Firebase Admin Config: Checking credentials...");
console.log(`Firebase Admin Config: GOOGLE_APPLICATION_CREDENTIALS value from .env: "${googleAppCreds}"`); // Log the value

// --- Logic Updated ---
if (googleAppCreds) {
    // IF GOOGLE_APPLICATION_CREDENTIALS is set, use its value directly as the path
    // ASSUMING it's either absolute OR relative to where the node process starts (usually server/ root)
    const keyPath = googleAppCreds; // Use the value directly
    console.log(`Firebase Admin Config: Using key path directly from env var: "${keyPath}"`);
    try {
        firebaseCredential = adminCredential.cert(keyPath);
        console.log("Firebase Admin Config: Credential object created from GOOGLE_APPLICATION_CREDENTIALS.");
    } catch(e: any) {
        // Add more specific error checking if needed (e.g., file not found)
        console.error(`❌ Firebase Admin Config: Error loading key file from path "${keyPath}": ${e.message}.`);
        console.error(`   Ensure the file exists at that exact path and has correct permissions.`);
        process.exit(1);
    }
} else if (serviceAccountBase64) {
    // Base64 logic remains the same
    try {
        const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
        firebaseCredential = adminCredential.cert(JSON.parse(serviceAccountJson));
        console.log("Firebase Admin Config: Credential object created from Base64 env var.");
    } catch (error) {
        console.error("❌ Firebase Admin Config: Error parsing FIREBASE_SERVICE_ACCOUNT_BASE64:", error);
        process.exit(1);
    }
} else if (projectId && clientEmail && privateKey) {
   // Individual keys logic remains the same
   console.warn("[Firebase Admin Config] Using individual env vars...");
   firebaseCredential = adminCredential.cert({
       projectId: projectId,
       clientEmail: clientEmail,
       privateKey: privateKey.replace(/\\n/g, '\n'),
   });
   console.log("Firebase Admin Config: Credential object created from individual env vars.");
} else {
    console.error("❌ Firebase Admin Config: Credentials not found in environment variables. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_BASE64 in server/.env.");
    process.exit(1);
}
// --- End Logic Update ---

if (!firebaseCredential) {
     console.error("❌ Firebase Admin Config: Failed to create credential object.");
     process.exit(1);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        admin.initializeApp({ credential: firebaseCredential });
        console.log("✅ Firebase Admin SDK Initialized Successfully.");
    } catch (error) {
        console.error("❌ Firebase Admin SDK Initialization Failed:", error);
        process.exit(1);
    }
} else {
    console.log("Firebase Admin SDK already initialized.");
}

export const firebaseAdminAuth = admin.auth();