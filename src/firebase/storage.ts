'use client';

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import type { FirebaseApp } from 'firebase/app';

/**
 * Uploads a file to a specified path in Firebase Storage and returns the public URL.
 *
 * @param app - The FirebaseApp instance.
 * @param path - The full path in Firebase Storage where the file will be saved.
 * @param file - The file as a File object.
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export const uploadFile = async (
  app: FirebaseApp,
  path: string,
  file: File
): Promise<string> => {
  if (!app) {
    throw new Error('Firebase app is not initialized. Cannot upload file.');
  }
  if (!file) {
    throw new Error('File is invalid. Cannot upload file.');
  }

  const storage = getStorage(app);
  const storageRef = ref(storage, path);

  try {
    // uploadBytes can take a File object directly and will infer the contentType.
    const snapshot = await uploadBytes(storageRef, file);
    
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error('Error during Firebase Storage operation:', error);
    // Re-throw to be handled by the UI component
    throw error;
  }
};
