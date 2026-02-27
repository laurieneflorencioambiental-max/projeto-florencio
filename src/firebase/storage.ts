'use client';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import { firebaseConfig } from './config';

let storageInstance: any | null = null;

const getStorageInstance = (): any => {
    if (!storageInstance) {
        try {
            const { firebaseApp } = initializeFirebase();
            storageInstance = getStorage(firebaseApp, `gs://${firebaseConfig.storageBucket}`);
        } catch (e) {
            console.error("Firebase Storage could not be initialized:", e);
            throw new Error("Firebase Storage initialization failed.");
        }
    }
    return storageInstance;
};


export type ImageType =
  | 'proposalLogoUrl'
  | 'sidebarLogoUrl'
  | 'loginBackgroundUrl'
  | 'proposalCoverUrl'
  | 'proposalLocationUrl'
  | 'proposalClosingUrl'
  | 'profilePicture';

export const uploadImageAndGetUrl = async (file: File, imageType: ImageType): Promise<string> => {
    const storage = getStorageInstance();
    if (!storage) throw new Error("Firebase Storage is not initialized.");

    const filePath = `customization/${imageType}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, filePath);

    // This is a timeout mechanism.
    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Upload timed out after 30 seconds. Check your connection and Firebase Storage security rules.")), 30000)
    );

    const uploadPromise = async () => {
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    };
    
    return Promise.race([uploadPromise(), timeoutPromise]);
};

export const deleteImageByUrl = async (url: string): Promise<void> => {
    const storage = getStorageInstance();
    if (!storage) throw new Error("Firebase Storage is not initialized.");
    if (!url.includes(firebaseConfig.storageBucket!)) {
        console.warn("URL does not seem to be a Firebase Storage URL. Skipping delete.", url);
        return;
    }
    try {
        const imageRef = ref(storage, url);
        await deleteObject(imageRef);
    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
            console.warn("Tried to delete an image that doesn't exist:", url);
        } else {
            console.error("Error deleting image from storage:", error);
            throw error; // Re-throw other errors
        }
    }
};
