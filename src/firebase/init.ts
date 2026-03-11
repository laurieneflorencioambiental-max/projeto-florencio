'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { firebaseConfig } from "./config";

/**
 * Inicializa a instância do Firebase Client App com serviços de produção.
 * Adicionada verificação de ambiente para segurança em SSR.
 */
export function initializeFirebase(): {
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
} {
  // Proteção contra execução no lado do servidor (Node.js)
  if (typeof window === 'undefined') {
    return { firebaseApp: null, auth: null, firestore: null };
  }

  try {
    const firebaseApp =
      getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(firebaseApp);
    const firestore = getFirestore(firebaseApp);
    return { firebaseApp, auth, firestore };
  } catch (error) {
    console.error("Erro ao inicializar Firebase no cliente:", error);
    return { firebaseApp: null, auth: null, firestore: null };
  }
}
