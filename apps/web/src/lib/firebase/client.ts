import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';

/**
 * The Firebase web client.
 *
 * This configuration is public by design — it ships to every browser that
 * loads the app and identifies the project rather than granting access to it.
 * Security comes from Firebase Auth itself and from the API verifying every ID
 * token with the Admin SDK. The Admin service-account key is a genuine secret
 * and lives only on the server.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True when every required key is present. */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId,
  );
}

/**
 * Returns the singleton Firebase app.
 *
 * `getApps()` is checked first because Next's fast refresh re-runs module code,
 * and initialising twice with the same name throws.
 */
export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Copy apps/web/.env.example to .env.local and fill in the NEXT_PUBLIC_FIREBASE_* values.',
    );
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
