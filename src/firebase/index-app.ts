'use client';

// Correção da exportação para evitar loop circular
export { initializeFirebase } from "./init";

// Re-exportação de hooks e provedores
export * from "./provider";
export * from "./client-provider";
export * from "./non-blocking-login";
export * from "./non-blocking-updates";

export * from "./firestore/use-doc";
export * from "./firestore/use-collection";

export * from "./error-emitter";
export * from "./errors";
