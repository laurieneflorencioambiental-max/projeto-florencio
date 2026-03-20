"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditEvent = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
exports.logAuditEvent = functions
    .region("us-central1") // Definindo a região explicitamente
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "A função só pode ser chamada por um usuário autenticado.");
    }
    const { action, details } = data;
    // A captura de IP só é confiável em uma Cloud Function
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
        details: details || null,
    };
    try {
        const logRef = await admin.firestore().collection("audit-logs").add(logEntry);
        await logRef.update({ id: logRef.id });
        return { success: true, logId: logRef.id };
    }
    catch (error) {
        console.error("Erro ao salvar o log de auditoria:", error);
        throw new functions.https.HttpsError("internal", "Não foi possível salvar o log de auditoria.");
    }
});
//# sourceMappingURL=index.js.map