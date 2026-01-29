'use client';

import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  type Auth,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export const logClientEvent = (action: 'login' | 'logout', auth: Auth) => {
  const user = auth.currentUser;
  if (!user) {
    // Cannot log event if user is not authenticated
    return;
  }

  try {
    const { firestore } = initializeFirebase();
    const logsCollection = collection(firestore, 'audit-logs');

    const logEntry = {
      userId: user.uid,
      userEmail: user.email || 'N/A',
      action: action,
      timestamp: serverTimestamp(),
      ipAddress: null, // IP address cannot be reliably retrieved from the client
    };

    // "Fire and forget" write to Firestore
    addDoc(logsCollection, logEntry)
      .then(logRef => {
        // Add the document ID to the document itself for easier querying
        updateDoc(logRef, { id: logRef.id });
      })
      .catch(error => {
        console.error('Client-side audit log failed:', error);
      });
  } catch (error) {
    console.error('Failed to initialize Firebase for audit logging:', error);
  }
};
