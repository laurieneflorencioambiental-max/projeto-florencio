import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();
const db = admin.firestore();

// Define secrets that will be used in the functions
const WHATSAPP_TOKEN = functions.config().whatsapp.token;
const VERIFY_TOKEN = functions.config().whatsapp.verify_token;
const WHATSAPP_PHONE_NUMBER_ID = functions.config().whatsapp.phone_number_id;


interface AuditEventData {
    action: string;
    details?: string;
}

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
 * Webhook to receive events from WhatsApp Cloud API.
 */
export const webhookWhatsApp = functions
    .region("us-central1")
    .https.onRequest(async (req, res) => {
        // Verification request from WhatsApp
        if (req.method === "GET") {
            const mode = req.query["hub.mode"];
            const token = req.query["hub.verify_token"];
            const challenge = req.query["hub.challenge"];

            if (mode === "subscribe" && token === VERIFY_TOKEN) {
                console.log("Webhook verified successfully!");
                res.status(200).send(challenge);
            } else {
                console.error("Webhook verification failed.");
                res.sendStatus(403);
            }
            return;
        }

        // Handle incoming messages and status updates
        if (req.method === "POST") {
            const entry = req.body.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;

            if (value?.messages) {
                const messageData = value.messages[0];
                await handleIncomingMessage(messageData, value.contacts[0]);
            } else if (value?.statuses) {
                const statusData = value.statuses[0];
                await handleMessageStatusUpdate(statusData);
            }

            res.sendStatus(200);
            return;
        }

        res.sendStatus(404);
    });

/**
 * Handles incoming message payloads from the webhook.
 */
async function handleIncomingMessage(message: any, contact: any) {
    const from = message.from; // Sender's phone number
    const contactName = contact.profile.name;
    const conversationId = `wpp_${from}`;
    const conversationRef = db.collection("conversations").doc(conversationId);
    
    let messageText = "";
    let messageType = message.type;
    let buttonId = "";

    if (message.type === "text") {
        messageText = message.text.body;
    } else if (message.type === "interactive") {
        const interactive = message.interactive;
        if (interactive.type === "button_reply") {
            messageText = interactive.button_reply.title;
            buttonId = interactive.button_reply.id;
        }
    }
    
    // Save the message to the subcollection
    await conversationRef.collection("messages").add({
        wamid: message.id,
        direction: "in",
        type: messageType,
        text: messageText,
        status: "received",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        senderUid: null,
    });

    const conversationSnap = await conversationRef.get();
    if (!conversationSnap.exists) {
        // New conversation, create it and send the menu.
        await conversationRef.set({
            id: conversationId,
            contactName: contactName,
            contactPhoneNumber: from,
            lastMessage: messageText,
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "open",
            queue: "UNASSIGNED",
            assignedToUid: null,
            unreadCount: 1,
            budgetId: null,
        });
        await sendMenu(from);
    } else {
        // Existing conversation, update it.
        const updateData: any = {
            lastMessage: messageText,
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "open", // Re-open conversation on new message
            unreadCount: admin.firestore.FieldValue.increment(1),
        };
        
        // If a button was clicked, route the conversation
        if (buttonId) {
            const newQueue = getQueueFromButtonId(buttonId);
            if (newQueue) {
                updateData.queue = newQueue;
                const agent = await assignAgent(newQueue);
                if (agent) {
                    updateData.assignedToUid = agent.uid;
                }
            }
        }
        
        await conversationRef.update(updateData);
    }
}

/**
 * Sends the initial interactive menu to a new contact.
 */
async function sendMenu(to: string) {
    const messagePayload = {
        messaging_product: "whatsapp",
        to: to,
        type: "interactive",
        interactive: {
            type: "button",
            body: {
                text: "Olá! Bem-vindo ao atendimento do Grupo Florencio. Como podemos ajudar hoje?",
            },
            action: {
                buttons: [
                    { type: "reply", reply: { id: "route_aso", title: "Agendar ASO" } },
                    { type: "reply", reply: { id: "route_orcamento", title: "Orçamento" } },
                    { type: "reply", reply: { id: "route_documentos", title: "Documentos" } },
                ],
            },
        },
    };
    await sendMessage(messagePayload);
}

/**
 * Maps a button ID from WhatsApp to a CRM queue.
 */
function getQueueFromButtonId(buttonId: string): string | null {
    switch (buttonId) {
        case "route_aso": return "ASO";
        case "route_orcamento": return "ORCAMENTO";
        case "route_documentos": return "DOCUMENTOS";
        case "route_financeiro": return "FINANCEIRO";
        default: return null;
    }
}

/**
 * Finds and assigns an available agent to a conversation based on the queue.
 */
async function assignAgent(queue: string): Promise<{ uid: string } | null> {
    const usersRef = db.collection("users");
    // Prioritize online users in the correct queue
    const onlineUsersSnap = await usersRef
        .where("queues", "array-contains", queue)
        .where("presenceStatus", "==", "online")
        .get();

    if (!onlineUsersSnap.empty) {
        const agents = onlineUsersSnap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
        // Simple round-robin logic for now, pick the first one
        return agents[0];
    }
    
    // Fallback: get any user from the queue, even if offline
    const anyUserSnap = await usersRef.where("queues", "array-contains", queue).limit(1).get();
    if (!anyUserSnap.empty) {
        return { uid: anyUserSnap.docs[0].id };
    }

    return null; // No agent found
}

/**
 * Handles message status updates from the webhook.
 */
async function handleMessageStatusUpdate(statusData: any) {
    const messageId = statusData.id;
    const newStatus = statusData.status; // e.g., 'sent', 'delivered', 'read'

    const messagesQuery = db.collectionGroup("messages").where("wamid", "==", messageId).limit(1);
    const messagesSnap = await messagesQuery.get();

    if (!messagesSnap.empty) {
        const messageDocRef = messagesSnap.docs[0].ref;
        await messageDocRef.update({ status: newStatus });
    }
}

/**
 * Generic function to send a message using the WhatsApp Cloud API.
 */
async function sendMessage(payload: object) {
    try {
        await axios.post(
            `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
            payload,
            { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
        );
    } catch (error: any) {
        console.error("Error sending WhatsApp message:", error.response?.data || error.message);
    }
}

/**
 * Callable function for the client UI to send a message.
 */
export const sendWhatsAppMessage = functions.region("us-central1").https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
    }

    const { to, text, conversationId } = data;
    if (!to || !text || !conversationId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing `to`, `text`, or `conversationId`.");
    }
    
    const payload = {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: text },
    };

    const response = await axios.post(
        `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        payload,
        { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
    
    // Save the outgoing message to Firestore
    const wamid = response.data.messages[0].id;
    const conversationRef = db.collection("conversations").doc(conversationId);
    
    await conversationRef.collection("messages").add({
        wamid: wamid,
        direction: "out",
        type: "text",
        text: text,
        status: "sent",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        senderUid: context.auth.uid,
    });
    
    // Update the parent conversation document
    await conversationRef.update({
        lastMessage: text,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, messageId: wamid };
});
