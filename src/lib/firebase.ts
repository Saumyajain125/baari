/**
 * Firebase client singletons. Only call these from client components or
 * effects: Firestore's persistent cache needs IndexedDB, and the desk relies
 * on it to keep working (and queue writes) while the internet is down.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

/** False when no Firebase env vars are set; pages show a setup hint instead of crashing. */
export const firebaseConfigured = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

function firebaseApp(): FirebaseApp {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured. Copy .env.example to .env.local and fill in your project's web config.");
  }
  app ??= getApps().length ? getApp() : initializeApp(config);
  return app;
}

export function getDb(): Firestore {
  if (db) return db;
  const inBrowser = typeof window !== "undefined";
  db = initializeFirestore(firebaseApp(), {
    localCache: inBrowser
      ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      : memoryLocalCache(),
  });
  if (useEmulators) {
    connectFirestoreEmulator(db, process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST ?? "127.0.0.1", 8080);
  }
  return db;
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(firebaseApp());
  if (useEmulators) {
    connectAuthEmulator(auth, process.env.NEXT_PUBLIC_AUTH_EMULATOR_URL ?? "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
  }
  return auth;
}
