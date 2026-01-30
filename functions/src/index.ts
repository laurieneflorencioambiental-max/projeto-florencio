import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();
const db = admin.firestore();

interface AuditEventData {
    action: string;
    details?: string;
}

/**
 * Cloud Function to log user audit events.
 * This is called from the client-side to securely log actions with server-side context like IP address.
 */
export const logAuditEvent = functions
    .region("us-central1")
    .https.onCall(async (data: AuditEventData, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "A função só pode ser chamada por um usuário autenticado."
            );
        }

        const { action, details } = data;
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
            const logRef = await db.collection("audit-logs").add(logEntry);
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


/**
 * Webhook to receive messages from the WhatsApp Cloud API.
 * This is the entry point for all incoming messages.
 */
export const whatsAppWebhook = functions
    .region("us-central1")
    .https.onRequest(async (req, res) => {
        const verifyToken = functions.config().whatsapp.verify_token;

        if (req.method === "GET" && req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === verifyToken) {
            console.log("Webhook verified");
            res.status(200).send(req.query["hub.challenge"]);
            return;
        }

        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }

        const body = req.body;

        if (body.object !== "whatsapp_business_account") {
            res.sendStatus(404);
            return;
        }

        // The main logic for processing messages will go here.
        // For now, we just log the received message.
        console.log("Received WhatsApp message:", JSON.stringify(body, null, 2));


        // TODO:
        // 1. Extract message details (from, body, wa_id, etc.).
        // 2. Find or create a 'conversation' document in Firestore.
        // 3. Create a 'message' document in the subcollection of the conversation.
        // 4. Update the 'lastMessage' and 'updatedAt' fields of the conversation.

        res.sendStatus(200);
    });

/**
 * Callable function for sending a WhatsApp message from the CRM UI.
 */
export const sendWhatsAppMessage = functions
    .region("us-central1")
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated to send messages.");
        }

        const { to, text, conversationId } = data;
        const token = functions.config().whatsapp.token;
        const phoneNumberId = functions.config().whatsapp.phone_number_id;

        if (!to || !text || !conversationId) {
            throw new functions.https.HttpsError("invalid-argument", "Missing required parameters: 'to', 'text', 'conversationId'.");
        }

        try {
            const response = await axios.post(
                `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
                {
                    messaging_product: "whatsapp",
                    to: to,
                    text: { body: text },
                },
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const messageData = response.data.messages[0];

            // Save the sent message to Firestore
            const messageRef = db.collection("conversations").doc(conversationId).collection("messages").doc();
            await messageRef.set({
                id: messageRef.id,
                waMessageId: messageData.id,
                conversationId: conversationId,
                from: "me", // Indicates the message was sent from the CRM
                body: text,
                type: "text",
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'sent',
                senderUid: context.auth.uid,
            });

            // Update the conversation's last message
            await db.collection("conversations").doc(conversationId).update({
                lastMessage: {
                    body: text,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return { success: true, messageId: messageData.id };
        } catch (error: any) {
            console.error("Error sending WhatsApp message:", error.response?.data || error.message);
            throw new functions.https.HttpsError("internal", "Failed to send WhatsApp message.", error.response?.data);
        }
    });
