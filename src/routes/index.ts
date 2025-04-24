// server/src/routes/index.ts

import { Router } from 'express';
import userRoutes from './users';
// Future imports:
// import adminRoutes from './admin';
// import packageRoutes from './packages';

const router = Router();

// Mount user-related routes
router.use('/users', userRoutes);

// Mount other routes later
// router.use('/admin', /* checkAdminMiddleware, */ adminRoutes);
// router.use('/packages', /* checkAuth, */ packageRoutes);

// Simple health check for API root
router.get('/health', (req, res) => {
    res.status(200).send({ status: 'OK', timestamp: new Date().toISOString() });
});

export default router;