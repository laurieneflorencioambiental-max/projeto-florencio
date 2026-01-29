import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

interface AuditEventData {
    action: "login" | "logout";
}

export const logAuditEvent = functions
    .region("southamerica-east1")
    .https.onCall(async (data: AuditEventData, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "A função só pode ser chamada por um usuário autenticado."
            );
        }

        const { action } = data;
        if (action !== "login" && action !== "logout") {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "A ação deve ser 'login' ou 'logout'."
            );
        }

        const ipAddress = context.rawRequest.ip;
        
        const uid = context.auth.uid;
        const userRecord = await admin.auth().getUser(uid);
        const email = userRecord.email || "N/A";

        const logEntry = {
            userId: uid,
            userEmail: email,
            action: action,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ipAddress: ipAddress || null,
        };
        
        try {
            const logRef = await admin.firestore().collection("audit-logs").add(logEntry);
            await logRef.update({ id: logRef.id });

            return { success: true, logId: logRef.id };
        } catch (error) {
            console.error("Erro ao salvar o log de auditoria:", error);
            throw new functions.https.HttpsError(
                "internal",
                "Não foi possível salvar o log de auditoria."
            );
        }
    });
