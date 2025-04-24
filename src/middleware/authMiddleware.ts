// server/src/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import { firebaseAdminAuth } from '../config/firebaseAdmin'; // Path relative to middleware dir

// Extend Express Request interface
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    // Role could be added here after DB lookup if needed by many routes
  }
}

export const checkAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
     res.status(401).send({ message: 'Unauthorized: No bearer token provided.' });
     return;
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await firebaseAdminAuth.verifyIdToken(idToken);
    // Attach essential user info from verified token
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
    console.log(`[Auth Middleware] Authenticated user: ${req.user.uid}`);
    next(); // Proceed to the next handler
  } catch (error: any) {
    console.error('[Auth Middleware] Error verifying token:', error.code || error.message);
    let message = 'Forbidden: Invalid or expired token.';
    if (error.code === 'auth/id-token-expired') {
        message = 'Forbidden: Token expired.';
    } else if (error.code === 'auth/argument-error') {
         message = 'Forbidden: Token malformed.';
    }
    res.status(403).send({ message });
    return;
  }
};