import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  getDocFromServer,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { AppDatabase } from './types';

// Initialize Firebase App
export const firebaseApp = getApps().length === 0 ? initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
}) : getApp();

// Initialize Firestore with custom Database ID if specified
export const db: Firestore = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

export const MESS_DOC_REF = doc(db, 'mess_records', 'primary_mess');

/**
 * Strips undefined properties before sending to Firestore to avoid errors.
 */
export function cleanForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Validate connection to Firestore as per requirements.
 */
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Connected to Firestore server successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or database connecting.');
    } else {
      console.log('[Firebase] Connection ping:', error);
    }
    return false;
  }
}

// Initial connection test
testFirebaseConnection();

/**
 * Sync entire AppDatabase to Firebase Firestore
 */
export async function syncDatabaseToFirebase(data: AppDatabase): Promise<void> {
  try {
    const payload = cleanForFirestore({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(MESS_DOC_REF, payload, { merge: true });
  } catch (err) {
    console.error('[Firebase] Error saving to Firestore:', err);
    throw err;
  }
}

/**
 * Subscribe to real-time updates from Firebase Firestore
 */
export function subscribeToFirebaseMess(
  onData: (data: AppDatabase) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    MESS_DOC_REF,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppDatabase;
        onData(data);
      } else {
        console.log('[Firebase] No document found in Firestore, initial write may be needed.');
      }
    },
    (error) => {
      console.error('[Firebase] Realtime snapshot error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Fetch initial data from Firebase once
 */
export async function fetchDatabaseFromFirebase(): Promise<AppDatabase | null> {
  try {
    const snapshot = await getDoc(MESS_DOC_REF);
    if (snapshot.exists()) {
      return snapshot.data() as AppDatabase;
    }
    return null;
  } catch (error) {
    console.error('[Firebase] Failed to fetch database:', error);
    return null;
  }
}
