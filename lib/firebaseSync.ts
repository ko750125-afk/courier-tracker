import { Settings, Delivery, DeliveryTip } from "./types";
import { getDatabase, getDeviceId } from "./firebase";
import { doc, getDoc, collection, getDocs, writeBatch, setDoc, onSnapshot, Firestore } from "firebase/firestore";
import { isClient, safeGet, safeSet, STORAGE_KEY_SETTINGS, STORAGE_KEY_DELIVERIES, STORAGE_KEY_TIPS } from "./storage";

/**
 * Returns either uid (if logged in), sharedId from settings, or unique deviceId
 */
export function getTargetId(uid?: string): string {
    if (uid) return uid; // UID takes highest priority

    const settingsStr = safeGet(STORAGE_KEY_SETTINGS);
    if (settingsStr) {
        try {
            const settings = JSON.parse(settingsStr) as Settings;
            if (settings.sharedId) return settings.sharedId;
        } catch { }
    }
    return getDeviceId();
}

/**
 * Sync from Cloud - can be forced when changing shared ID or Logging in
 */
export async function syncFromCloud(uid?: string, targetIdOverride?: string): Promise<{ settings?: Settings, deliveries?: Delivery[], tips?: DeliveryTip[] }> {
    let database: Firestore;
    try {
        database = getDatabase();
    } catch (e: any) {
        console.error("Database connection failed:", e);
        throw e;
    }
    const id = (targetIdOverride || getTargetId(uid)).trim();
    if (!id) return {}; // Silently return if no ID (e.g. initial load)

    try {
        console.log(`📡 Cloud Sync Starting for ID: [${id}]`);
        const userDoc = await getDoc(doc(database, "users", id));
        let settings: Settings | undefined;
        let deliveries: Delivery[] | undefined;
        let tips: DeliveryTip[] | undefined;

        if (userDoc.exists() && userDoc.data().settings) {
            settings = userDoc.data().settings;
            safeSet(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        }

        const deliverySnap = await getDocs(collection(database, "users", id, "deliveries"));
        const cloudDeliveries = !deliverySnap.empty ? deliverySnap.docs.map(d => ({
            date: d.id,
            total: d.data().total || 0
        } as Delivery)) : [];

        const storedDeliveriesRaw = safeGet(STORAGE_KEY_DELIVERIES);
        let localDeliveries: Delivery[] = [];
        if (storedDeliveriesRaw) {
            try { localDeliveries = JSON.parse(storedDeliveriesRaw); } catch { }
        }

        const mergedDeliveries = [...localDeliveries];
        cloudDeliveries.forEach(cd => {
            const idx = mergedDeliveries.findIndex(ld => ld.date === cd.date);
            if (idx >= 0) {
                mergedDeliveries[idx] = cd;
            } else {
                mergedDeliveries.push(cd);
            }
        });

        if (mergedDeliveries.length > 0) {
            safeSet(STORAGE_KEY_DELIVERIES, JSON.stringify(mergedDeliveries));
            deliveries = mergedDeliveries;

            if (cloudDeliveries.length === 0 && localDeliveries.length > 0) {
                console.log(`☁️ Auto-Backing up ${localDeliveries.length} deliveries to cloud...`);
                const batch = writeBatch(database);
                localDeliveries.forEach(d => {
                    const ref = doc(database, "users", id, "deliveries", d.date);
                    batch.set(ref, { total: d.total }, { merge: true });
                });
                await batch.commit();
            }
        }

        const tipsSnap = await getDocs(collection(database, "users", id, "tips"));
        if (!tipsSnap.empty) {
            tips = tipsSnap.docs.map(d => d.data() as DeliveryTip);
            safeSet(STORAGE_KEY_TIPS, JSON.stringify(tips));
        }

        console.log(`✅ Sync Success: [${id}] -> Merged ${mergedDeliveries.length} deliveries.`);
        return { settings, deliveries, tips };
    } catch (e: any) {
        console.error("❌ Cloud sync failed:", e);
        throw e;
    }
}

/**
 * Migrate data from current deviceId to user's uid
 */
export async function migrateFromDeviceToUser(uid: string): Promise<void> {
    const database = getDatabase();
    const deviceId = getDeviceId();
    
    console.log(`🚀 Migrating data from [${deviceId}] to [${uid}]`);

    try {
        const deviceDoc = await getDoc(doc(database, "users", deviceId));
        if (deviceDoc.exists()) {
            const settings = deviceDoc.data().settings;
            await setDoc(doc(database, "users", uid), { settings }, { merge: true });
        }

        const deliverySnap = await getDocs(collection(database, "users", deviceId, "deliveries"));
        if (!deliverySnap.empty) {
            const batch = writeBatch(database);
            deliverySnap.docs.forEach(d => {
                const ref = doc(database, "users", uid, "deliveries", d.id);
                batch.set(ref, d.data());
            });
            await batch.commit();
        }

        const tipsSnap = await getDocs(collection(database, "users", deviceId, "tips"));
        if (!tipsSnap.empty) {
            const batch = writeBatch(database);
            tipsSnap.docs.forEach(d => {
                const ref = doc(database, "users", uid, "tips", d.id);
                batch.set(ref, d.data());
            });
            await batch.commit();
        }

        console.log("✅ Migration complete!");
    } catch (e) {
        console.error("Migration failed:", e);
        throw e;
    }
}

/**
 * Subscribe to settings changes (Real-time Sync)
 */
export function subscribeToSettings(uid: string | undefined, callback: (settings: Settings) => void) {
    if (!isClient()) return () => {};
    
    try {
        const database = getDatabase();
        const id = getTargetId(uid);
        
        return onSnapshot(doc(database, "users", id), (doc) => {
            if (doc.exists() && doc.data().settings) {
                const settings = doc.data().settings as Settings;
                const current = safeGet(STORAGE_KEY_SETTINGS);
                if (current !== JSON.stringify(settings)) {
                    safeSet(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
                    callback(settings);
                }
            }
        }, (error) => {
            console.warn("Real-time settings subscription error:", error);
        });
    } catch (e) {
        console.warn("Real-time sync subscription failed:", e);
        return () => {};
    }
}

/**
 * Subscribe to deliveries changes (Real-time Sync)
 */
export function subscribeToDeliveries(uid: string | undefined, callback: (deliveries: Delivery[]) => void) {
    if (!isClient()) return () => {};
    
    try {
        const database = getDatabase();
        const id = getTargetId(uid);
        
        return onSnapshot(collection(database, "users", id, "deliveries"), (snap) => {
            const cloudDeliveries = snap.docs.map(d => ({
                date: d.id,
                total: d.data().total || 0
            } as Delivery));
            
            const stored = safeGet(STORAGE_KEY_DELIVERIES);
            let localDeliveries: Delivery[] = [];
            if (stored) {
                try { localDeliveries = JSON.parse(stored); } catch { }
            }
            
            const merged = [...localDeliveries];
            cloudDeliveries.forEach(cd => {
                const idx = merged.findIndex(ld => ld.date === cd.date);
                if (idx >= 0) {
                    merged[idx] = cd;
                } else {
                    merged.push(cd);
                }
            });
            
            const sorted = merged.sort((a, b) => b.date.localeCompare(a.date));
            const currentStr = JSON.stringify(sorted);
            const storedStr = safeGet(STORAGE_KEY_DELIVERIES);
            
            if (currentStr !== storedStr) {
                safeSet(STORAGE_KEY_DELIVERIES, currentStr);
                callback(sorted);
            }
        }, (error) => {
            console.warn("Real-time deliveries subscription error:", error);
        });
    } catch (e) {
        console.warn("Real-time deliveries subscription failed:", e);
        return () => {};
    }
}
