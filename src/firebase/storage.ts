'use client';

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  FirebaseStorage,
} from 'firebase/storage';
import { initializeFirebase } from '@/firebase';

// Create a module-level singleton for the Storage instance
let storageInstance: FirebaseStorage | null = null;

function getStorageInstance(): FirebaseStorage {
  if (!storageInstance) {
    const { firebaseApp } = initializeFirebase();
    storageInstance = getStorage(firebaseApp);
  }
  return storageInstance;
}


/**
 * Uploads a file to a specified path in Firebase Storage and returns the public URL.
 *
 * @param path - The full path in Firebase Storage where the file will be saved.
 * @param file - The file as a File object.
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export const uploadFile = async (
  path: string,
  file: File
): Promise<string> => {
  if (!file) {
    throw new Error('File is invalid. Cannot upload file.');
  }

  const storage = getStorageInstance();
  const storageRef = ref(storage, path);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error('Error during Firebase Storage upload operation:', error);
    // Re-throw to be handled by the UI component
    throw error;
  }
};

/**
 * Deletes a file from Firebase Storage.
 *
 * @param path - The full path of the file to delete in Storage.
 */
export const deleteFile = async (path: string): Promise<void> => {
  const storage = getStorageInstance();
  const fileRef = ref(storage, path);

  try {
    await deleteObject(fileRef);
  } catch (error: any) {
    // If the object doesn't exist, it's not an error in this context.
    // We can safely ignore 'storage/object-not-found' errors.
    if (error.code !== 'storage/object-not-found') {
      console.error('Error deleting file from Firebase Storage:', error);
      // Re-throw other errors to be handled by the caller
      throw error;
    }
  }
};
