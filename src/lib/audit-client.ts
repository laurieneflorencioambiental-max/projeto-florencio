'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeFirebase } from '@/firebase';
import type { Auth } from 'firebase/auth';

// This function will call the Cloud Function.
export const logClientEvent = (action: string, auth: Auth, details?: string) => {
  if (!auth.currentUser) {
    return;
  }

  try {
    const { firebaseApp } = initializeFirebase();
    if (!firebaseApp) return;
    
    // Ensure you specify the same region as your function
    const functions = getFunctions(firebaseApp, 'us-central1'); 
    const logAuditEvent = httpsCallable(functions, 'logAuditEvent');
    
    // "Fire and forget" call to the function
    logAuditEvent({ action, details })
      .catch(error => {
        console.error(`Failed to log '${action}' event via Cloud Function:`, error);
      });

  } catch (error) {
    console.error('Failed to initialize Firebase Functions for audit logging:', error);
  }
};
