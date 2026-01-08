'use client';

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  StorageReference,
} from 'firebase/storage';
import type { Firestore } from 'firebase/firestore';

/**
 * Uploads a PDF blob to a specified path in Firebase Storage and returns the public URL.
 *
 * @param firestore - The Firestore instance (used to get the app instance).
 * @param pdfBlob - The PDF file as a Blob.
 * @param path - The full path in Firebase Storage where the file will be saved (e.g., 'proposals/proposal-xyz.pdf').
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export const uploadProposalPdf = async (
  firestore: Firestore,
  pdfBlob: Blob,
  path: string
): Promise<string> => {
  if (!firestore.app) {
    throw new Error('Firebase app is not initialized.');
  }

  const storage = getStorage(firestore.app);
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
