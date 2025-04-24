// server/src/routes/users.ts

import { Router } from 'express';
import { syncUserProfile, getUserProfile } from '../controllers/userController';
import { checkAuth } from '../middleware/authMiddleware'; // Use the correct middleware import

const router = Router();

// POST /api/users/sync
// Protected: Only an authenticated user (who just signed up in Firebase) can sync their profile
router.post('/sync', checkAuth, syncUserProfile);

// GET /api/users/profile/me
// Protected: Only the authenticated user can get their own profile
router.get('/profile/me', checkAuth, getUserProfile);

// PATCH /api/users/profile
// Protected: Only the authenticated user can update their own profile
// router.patch('/profile', checkAuth, updateUserProfile); // Implement controller later

export default router;