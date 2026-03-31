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

let appInternal: FirebaseApp | undefined;
let dbInternal: Firestore | undefined;

export function getDatabase(): Firestore {
    if (dbInternal) return dbInternal;

    if (typeof window === "undefined") {
        throw new Error("서버 환경입니다.");
    }

    if (!firebaseConfig.apiKey) {
        throw new Error(`Firebase API Key가 누락되었습니다. Vercel 환경 변수를 확인해 주세요.`);
    }

    try {
        appInternal = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        dbInternal = getFirestore(appInternal);
        return dbInternal;
    } catch (e: any) {
        throw new Error(`초기화 실패: ${e.message}`);
    }
}

export const db: Firestore | undefined = (typeof window !== "undefined" && firebaseConfig.apiKey) 
    ? getFirestore(getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]) 
    : undefined;


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
