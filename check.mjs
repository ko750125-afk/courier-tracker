import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const envFile = fs.readFileSync(".env.local", "utf8");
const env = {};
envFile.split("\n").forEach(line => {
    const [key, ...val] = line.split("=");
    if (key && val) {
        env[key.trim()] = val.join("=").trim().replace(/['"]/g, '');
    }
});

const firebaseConfig = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    try {
        console.log("Searching all users for any deliveries...");
        const usersSnap = await getDocs(collection(db, "users"));
        console.log("Total users:", usersSnap.size);

        for (const u of usersSnap.docs) {
            const dSnap = await getDocs(collection(db, "users", u.id, "deliveries"));
            if (dSnap.size > 0) {
                console.log(`\nUser ID: ${u.id} - Total deliveries: ${dSnap.size}`);
                dSnap.forEach(d => {
                    console.log(`  ${d.id} => ${d.data().total}`);
                });
            } else {
                console.log(`User ID: ${u.id} - No deliveries.`);
            }
        }
    } catch (e) {
        console.error("Error reading users:", e.message);
    }

    console.log("Done.");
    process.exit(0);
}

check().catch(console.error);
