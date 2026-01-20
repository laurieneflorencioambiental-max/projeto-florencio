'use client';

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import type { FirebaseApp } from 'firebase/app';

/**
 * Uploads a PDF blob to a specified path in Firebase Storage and returns the public URL.
 *
 * @param app - The FirebaseApp instance.
 * @param path - The full path in Firebase Storage where the file will be saved.
 * @param pdfBlob - The PDF file as a Blob.
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export const uploadProposalPdf = async (
  app: FirebaseApp,
  path: string,
  pdfBlob: Blob
): Promise<string> => {
  if (!app) {
    throw new Error('Firebase app is not initialized. Cannot upload file.');
  }
  if (!pdfBlob || pdfBlob.size === 0) {
    throw new Error('PDF Blob is invalid or empty. Cannot upload file.');
  }

  const storage = getStorage(app);
  const storageRef = ref(storage, path);

  try {
    const snapshot = await uploadBytes(storageRef, pdfBlob, {
      contentType: 'application/pdf',
    });
    
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error('Error during Firebase Storage operation (upload or getURL):', error);
    // Re-throw to be handled by the UI component
    throw error;
  }
};
