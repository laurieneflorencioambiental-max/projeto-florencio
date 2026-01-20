'use client';

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  StorageReference,
} from 'firebase/storage';
import type { FirebaseApp } from 'firebase/app';

/**
 * Uploads a PDF blob to a specified path in Firebase Storage and returns the public URL.
 *
 * @param app - The FirebaseApp instance.
 * @param path - The full path in Firebase Storage where the file will be saved (e.g., 'proposals/proposal-xyz.pdf').
 * @param pdfBlob - The PDF file as a Blob.
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export const uploadProposalPdf = async (
  app: FirebaseApp,
  path: string,
  pdfBlob: Blob
): Promise<string> => {
  if (!app) {
    throw new Error('Firebase app is not initialized.');
  }

  const storage = getStorage(app);
  const storageRef: StorageReference = ref(storage, path);

  try {
    // Upload the file to the specified path.
    const snapshot = await uploadBytes(storageRef, pdfBlob, {
      contentType: 'application/pdf',
    });

    // Get the public URL for the uploaded file.
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading file to Firebase Storage:', error);
    // Re-throw the error to be handled by the caller.
    throw error;
  }
};