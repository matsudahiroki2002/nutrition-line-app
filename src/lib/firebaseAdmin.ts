import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { env } from "@/src/lib/env";

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;

export function getFirebaseAdminApp(): App {
  if (cachedApp) {
    return cachedApp;
  }

  if (getApps().length > 0) {
    cachedApp = getApps()[0];
    return cachedApp;
  }

  cachedApp = initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY
    }),
    projectId: env.FIREBASE_PROJECT_ID
  });

  return cachedApp;
}

export function getDb(): Firestore {
  if (cachedDb) {
    return cachedDb;
  }

  cachedDb = getFirestore(getFirebaseAdminApp());
  return cachedDb;
}
