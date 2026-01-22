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
import { firebaseConfig } from './config';

// Create a module-level singleton for the Storage instance
let storageInstance: FirebaseStorage | null = null;

function getStorageInstance(): FirebaseStorage {
  if (!storageInstance) {
    const { firebaseApp } = initializeFirebase();
    const bucketUrl = `gs://${firebaseConfig.storageBucket}`;
    storageInstance = getStorage(firebaseApp, bucketUrl);
  }
  return storageInstance;
}


/**
 * Uploads a file to a specified path in Firebase Storage and returns the public URL.
 * Includes a timeout to prevent infinite loading states.
 *
 * @param path - The full path in Firebase Storage where the file will be saved.
 * @param file - The file as a File object.
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export const uploadFile = async (
  path: string,
  file: File
): Promise<string> => {
  const UPLOAD_TIMEOUT = 30000; // 30 seconds

  const uploadPromise = (async () => {
    if (!file) {
      throw new Error('File is invalid. Cannot upload file.');
    }

    const storage = getStorageInstance();
    const storageRef = ref(storage, path);

    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  })();

  const timeoutPromise = new Promise<string>((_, reject) =>
    setTimeout(
      () => reject(new Error('O upload demorou muito. Verifique sua conexão e as regras de segurança do Firebase Storage.')),
      UPLOAD_TIMEOUT
    )
  );

  try {
    return await Promise.race([uploadPromise, timeoutPromise]);
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
