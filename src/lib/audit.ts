'use client';

import { User } from "firebase/auth";
import { Firestore, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import type { AuditLog } from "./types";

export async function logAuditEvent(
    firestore: Firestore,
    user: User,
    action: 'login' | 'logout'
) {
    if (!firestore || !user) return;

    try {
        const auditLogRef = doc(collection(firestore, 'audit-logs'));
        const newLogEntry: Omit<AuditLog, 'id'> = {
            userId: user.uid,
            userEmail: user.email || 'N/A',
            action: action,
            timestamp: serverTimestamp(),
        };
        // Use setDoc to include the ID in the document data
        await setDoc(auditLogRef, { ...newLogEntry, id: auditLogRef.id });
    } catch (error) {
        // Fail silently on the client. We don't want to block user actions for audit failures.
        console.error("Failed to log audit event:", error);
    }
}
