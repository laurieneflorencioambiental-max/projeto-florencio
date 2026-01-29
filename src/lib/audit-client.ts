'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeFirebase } from '@/firebase';

// This function calls our backend Cloud Function.
// It will fail silently until the function is deployed.
export const logClientEvent = (action: 'login' | 'logout') => {
  try {
    const { firebaseApp } = initializeFirebase();
    // It's important to specify the same region you deploy your function to.
    const functions = getFunctions(firebaseApp, 'southamerica-east1'); 
    const logEvent = httpsCallable(functions, 'logAuditEvent');
    
    // We don't await this. It's a "fire and forget" call.
    // The user experience should not be blocked by audit logging.
    logEvent({ action: action }).catch(error => {
      // Log internal errors from the function call if they happen
      console.error("Cloud Function call for audit failed:", error);
    });
  } catch (error) {
    // Fail silently on the client if Functions SDK fails to initialize.
    console.error("Failed to initialize Firebase Functions for audit logging:", error);
  }
};
