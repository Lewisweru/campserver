// server/src/models/Profile.ts

import { ObjectId } from 'mongodb';

// Interface used within the backend
export interface Profile {
  _id: ObjectId; // Use ObjectId for backend interactions
  firebaseUid: string;
  role: 'camper' | 'admin';
  fullName: string;
  email?: string | null; // Can be null from Firebase sometimes
  dateOfBirth?: Date | null; // Store as Date in DB
  phone?: string | null;
  emergencyContact?: string | null;
  medicalConditions?: string | null;
  profilePicture?: string | null;
  createdAt: Date;
  updatedAt: Date;
}