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
  console.log("[STORAGE] B0 - entrou uploadProposalPdf", { path, blobSize: pdfBlob?.size });

  const storage = getStorage(app);
  const storageRef = ref(storage, path);

  try {
    console.log("[STORAGE] B1 - antes uploadBytes");
    const snapshot = await uploadBytes(storageRef, pdfBlob, {
      contentType: "application/pdf",
    });

    console.log("[STORAGE] B2 - depois uploadBytes", snapshot.ref.fullPath);
    const downloadUrl = await getDownloadURL(snapshot.ref);

    console.log("[STORAGE] B3 - downloadUrl", downloadUrl);
    return downloadUrl;
  } catch (e) {
    console.error("[STORAGE] ERRO", e);
    throw e;
  }
};