// server/src/controllers/userController.ts

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { findUserProfileByFirebaseId, createUserProfile } from '../services/userService';

export const syncUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { role, fullName } = req.body;
    const firebaseUid = req.user?.uid; // UID comes from verified token via middleware
    const email = req.user?.email;     // Email comes from verified token

    // Basic validation
    if (!role || !fullName) {
        res.status(400).send({ message: 'Missing required fields in request body: role, fullName' });
        return;
    }
    if (role !== 'camper' && role !== 'admin') {
         res.status(400).send({ message: 'Invalid role specified.' });
        return;
    }
    if (!firebaseUid) {
        // Should be caught by middleware, but good failsafe
        res.status(401).send({ message: 'Unauthorized: Could not identify user from token.' });
        return;
    }

    console.log(`[UserController] syncUserProfile request for uid: ${firebaseUid}, role: ${role}`);
    try {
        // Call service to find or create
        const profile = await createUserProfile({ firebaseUid, email, role, fullName });
        // Check if it was existing or newly created (service might return existing)
        // You might want different status codes based on this (200 OK vs 201 Created)
        // For simplicity, let's assume 200 is okay if it exists, 201 if new.
        // The service currently returns existing, so let's send 200 if it has an ID.
        res.status(profile._id ? 200 : 201).send(profile); // Send back the profile data
    } catch (error: any) {
        console.error("[UserController] Error syncing user profile:", error);
        // Send specific status codes if possible (e.g., 409 Conflict if service throws "already exists")
        res.status(500).send({ message: 'Server error syncing user profile', error: error.message });
    }
};

export const getUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
     const uid = req.user?.uid;
     console.log(`[UserController] getUserProfile request for uid: ${uid}`);

    if (!uid) {
        res.status(401).send({ message: 'Unauthorized: User ID not found.' });
        return;
    }

    try {
        const profile = await findUserProfileByFirebaseId(uid);
        if (!profile) {
            // This is important - profile might not exist yet if sync failed or is slow
            res.status(404).send({ message: 'User profile not found.' });
            return;
        }
        // Successfully found profile
        res.status(200).send(profile);
    } catch (error: any) {
        console.error("[UserController] Error fetching user profile:", error);
        res.status(500).send({ message: 'Server error fetching user profile', error: error.message });
    }
};