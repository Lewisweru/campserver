// server/src/server.ts

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv'; // Keep dotenv import here
import path from 'path';
// REMOVE: import { fileURLToPath } from 'url'; // Not needed for CommonJS __dirname
import { connectToDb, closeDbConnection } from './lib/db';
import allRoutes from './routes/index';

// Load environment variables from server/.env using CommonJS __dirname
// __dirname points to server/src
const envPath = path.resolve(__dirname, '../.env');
console.log(`[Server] Attempting to load env from: ${envPath}`);
dotenv.config({ path: envPath }); // LOAD ONCE HERE

// Early check for critical env vars AFTER loading dotenv
if (!process.env.MONGODB_URI || !process.env.PORT || !process.env.CORS_ORIGIN) {
    console.error("❌ FATAL ERROR: MONGODB_URI, PORT, or CORS_ORIGIN not found in server/.env. Exiting.");
    process.exit(1);
}
console.log(`[Server] CORS Origin loaded: ${process.env.CORS_ORIGIN}`);
console.log(`[Server] MONGODB_URI loaded: ${process.env.MONGODB_URI ? 'Yes' : 'No - THIS IS AN ISSUE IF FALSE!'}`); // More explicit log
console.log(`[Server] PORT loaded: ${process.env.PORT}`);


// Initialize Firebase Admin SDK (it will use the env vars already loaded into process.env)
import './config/firebaseAdmin';

const app: Express = express();
const port = process.env.PORT; // Use validated port

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[Server Request] ${req.method} ${req.url}`);
    next();
});

// API Routes
app.use('/api', allRoutes);

// Root Route
app.get('/', (req: Request, res: Response) => {
  res.send('Summer Camp Management API - Root OK');
});

// Not Found Handler
app.use((req, res, next) => {
    res.status(404).send({ message: `Not Found - ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("[Server Error Handler]:", err.stack || err); // Log stack trace
    const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
    res.status(500).send({ message: message });
});

// Start Server Function
const startServer = async () => {
    try {
        await connectToDb(); // Ensure DB is connected before starting server
        const server = app.listen(port, () => {
            console.log(`\n🚀 [server]: Backend server ready at http://localhost:${port}`);
            console.log(`   Allowing CORS origin: ${process.env.CORS_ORIGIN}`);
        });

        // Graceful Shutdown
        const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
        signals.forEach(signal => {
            process.on(signal, async () => {
                console.log(`\nReceived ${signal}. Closing server...`);
                server.close(async () => {
                    console.log('HTTP server closed.');
                    await closeDbConnection();
                    process.exit(0);
                });
                // Force close after timeout
                setTimeout(async () => {
                    console.error('Force shutdown after timeout.');
                    await closeDbConnection();
                    process.exit(1);
                }, 10000); // 10 seconds timeout
            });
        });

    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};

startServer();