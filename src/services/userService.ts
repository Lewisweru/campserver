// server/src/services/userService.ts

import { getCollection } from '../lib/db';
import { Profile } from '../models/Profile'; // Use backend Profile model
import { ObjectId } from 'mongodb'; // Import ObjectId if needed for queries

// Type for data needed to create a profile
interface CreateProfileData {
    firebaseUid: string;
    email?: string | null;
    role: 'camper' | 'admin';
    fullName: string;
}

export const findUserProfileByFirebaseId = async (firebaseUid: string): Promise<Profile | null> => {
    try {
        const usersCollection = await getCollection<Profile>('users');
        const profile = await usersCollection.findOne({ firebaseUid });
        console.log(`[UserService] findUserProfileByFirebaseId(${firebaseUid}): ${profile ? 'Found' : 'Not Found'}`);
        return profile;
    } catch (error) {
        console.error(`[UserService] Error finding profile for ${firebaseUid}:`, error);
        throw new Error("Database error while finding user profile."); // Throw generic error
    }
};

export const createUserProfile = async (data: CreateProfileData): Promise<Profile> => {
    const usersCollection = await getCollection<Profile>('users');
    const existing = await findUserProfileByFirebaseId(data.firebaseUid); // Use the find function

    if (existing) {
         console.warn(`[UserService] Profile for ${data.firebaseUid} already exists. Returning existing.`);
         // Decide: Update existing on sync or just return? Let's just return existing for now.
         return existing;
         // Or throw an error if sync should only happen once:
         // throw new Error("Profile already exists.");
    }

    console.log(`[UserService] Creating new profile for ${data.firebaseUid}`);
    const now = new Date();
    // Prepare document for insertion (without _id)
    const newProfileData: Omit<Profile, '_id'> = {
        firebaseUid: data.firebaseUid,
        email: data.email || null, // Ensure null instead of undefined if needed
        role: data.role,
        fullName: data.fullName,
        createdAt: now,
        updatedAt: now,
        dateOfBirth: null,
        phone: null,
        emergencyContact: null,
        medicalConditions: null,
        profilePicture: null,
    };

    try {
        const result = await usersCollection.insertOne(newProfileData as any); // `as any` might be needed if Omit causes issues with TS/MongoDriver V6 inference

        // Fetch the complete document including the generated _id
        const insertedProfile = await usersCollection.findOne({ _id: result.insertedId });

        if (!insertedProfile) {
            throw new Error("Failed to retrieve profile after insertion.");
        }
        console.log(`[UserService] Profile created successfully for ${data.firebaseUid}, ID: ${result.insertedId}`);
        return insertedProfile;
    } catch (error) {
         console.error(`[UserService] Error creating profile for ${data.firebaseUid}:`, error);
         throw new Error("Database error while creating user profile.");
    }
};

// Placeholder for update service
// export const updateUserProfile = async (firebaseUid: string, updateData: Partial<...>) => { ... }