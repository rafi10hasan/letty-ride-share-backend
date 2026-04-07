import { RtcRole, RtcTokenBuilder } from "agora-token";
import admin from "firebase-admin";
import config from "../../../config";
import { BadRequestError } from "../../errors/request/apiError";
import { IUser } from "../user/user.interface";
import User from "../user/user.model";
// adjust to your actual model import

// ─── Shared helpers ───────────────────────────────────────────────────────────
const buildChannelName = (idA: string, idB: string) =>
    `call_${[idA, idB].sort().join("_")}`;

const buildToken = (channelName: string, uid: number): string => {
    const expireTime = Math.floor(Date.now() / 1000) + 3600;
    const token = RtcTokenBuilder.buildTokenWithUid(
        config.app_id,
        config.app_certificate,
        channelName,
        uid,
        RtcRole.PUBLISHER,
        expireTime,
        expireTime,
    );
    if (!token) throw new BadRequestError("Failed to generate Agora token");
    return token;
};

// ─── 1. Caller starts call ────────────────────────────────────────────────────
const startCall = async (caller: IUser, receiverId: string) => {
    if (!receiverId) {
        throw new BadRequestError("receiverId is required");
    }

    const callerId = caller._id.toString();
    const channelName = buildChannelName(callerId, receiverId);

    // Generate both tokens — caller uid=1, receiver uid=2
    const callerToken = buildToken(channelName, 1);
    const receiverToken = buildToken(channelName, 2);

    // Fetch receiver to get their fcmToken
    const receiver = await User.findById(receiverId).select(
        "fcmToken fullName avatar currentRole",
    );
    if (!receiver) throw new BadRequestError("Receiver not found");

    // Send FCM push to receiver
    if (receiver.fcmToken) {
        const message: admin.messaging.Message = {
            token: receiver.fcmToken,

            android: {
                priority: "high",
                notification: {
                    title: `📞 ${caller.fullName ?? "Someone"} is calling`,
                    body: "Tap to answer the voice call",
                    sound: "default",
                    channelId: "incoming_call",
                    priority: "max",
                    defaultVibrateTimings: true,
                },
            },

            apns: {
                headers: {
                    "apns-priority": "10",
                    "apns-push-type": "alert",
                },
                payload: {
                    aps: {
                        alert: {
                            title: `📞 ${caller.fullName ?? "Someone"} is calling`,
                            body: "Tap to answer the voice call",
                        },
                        sound: "default",
                        badge: 1,
                        "content-available": 1,
                    },
                },
            },

            // All values must be strings in FCM data payload
            data: {
                type: "INCOMING_CALL",
                channelName,
                token: receiverToken,   // receiver's own token
                uid: "2",
                callerName: caller.fullName ?? "",
                callerAvatar: caller.avatar ?? "",
                callerRole: caller.currentRole ?? "",
                callerId,
            },
        };

        try {
            await admin.messaging().send(message);
        } catch (err: any) {
            console.error("[FCM] Push failed:", err.message);
            // Stale token — clean it up silently
            if (
                err.code === "messaging/registration-token-not-registered" ||
                err.code === "messaging/invalid-registration-token"
            ) {
                await User.findByIdAndUpdate(receiverId, { $unset: { fcmToken: 1 } });
            }
            // Don't throw — caller can still proceed even if push fails
        }
    }

    return {
        appId: config.app_id,
        token: callerToken,
        channel: channelName,
        uid: 1,
    };
};

// ─── 2. Receiver gets a fresh token (for token renewal) ───────────────────────
const joinCall = async (receiverId: string, callerId: string) => {
    if (!receiverId || !callerId) {
        throw new BadRequestError("receiverId and callerId are required");
    }

    const channelName = buildChannelName(callerId, receiverId);
    const token = buildToken(channelName, 2);

    return {
        appId: config.app_id,
        token,
        channel: channelName,
        uid: 2,
    };
};

export const callService = { startCall, joinCall };