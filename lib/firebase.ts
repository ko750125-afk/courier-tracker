import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

// Defensive initialization
if (typeof window !== "undefined" && firebaseConfig.apiKey) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
}

export { db };

export function getDeviceId(): string {
    if (typeof window === "undefined") return "server";
    try {
        let id = localStorage.getItem("courier-tracker-device-id");
        if (!id) {
            // Safer UUID-like fallback for older mobile WebView
            if (typeof crypto !== "undefined" && crypto.randomUUID) {
                id = crypto.randomUUID();
            } else {
                id = Math.random().toString(36).substring(2) + Date.now().toString(36);
            }
            localStorage.setItem("courier-tracker-device-id", id);
        }
        return id;
    } catch {
        return "fallback-id-" + Date.now();
    }
}
