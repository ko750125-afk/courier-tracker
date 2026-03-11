import {
    Settings,
    Delivery,
    DEFAULT_SETTINGS,
    TEST_DELIVERIES,
    DeliveryTip,
} from "./types";
import { db, getDeviceId } from "./firebase";
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, writeBatch, Firestore } from "firebase/firestore";

const STORAGE_KEY_SETTINGS = "courier-tracker-settings";
const STORAGE_KEY_DELIVERIES = "courier-tracker-deliveries";
const STORAGE_KEY_TIPS = "courier-tracker-tips";

function isClient(): boolean {
    return typeof window !== "undefined";
}

function safeGet(key: string): string | null {
    if (!isClient()) return null;
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.warn("Storage access denied:", e);
        return null;
    }
}

function safeSet(key: string, value: string): void {
    if (!isClient()) return;
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn("Storage write failed:", e);
    }
}

/**
 * Returns either sharedId from settings or unique deviceId
 */
function getTargetId(): string {
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
 * Sync from Cloud - can be forced when changing shared ID
 */
export async function syncFromCloud(targetId?: string): Promise<{ settings?: Settings, deliveries?: Delivery[], tips?: DeliveryTip[] }> {
    if (!db) return {};
    const database = db as Firestore;
    const id = targetId || getTargetId();

    try {
        const userDoc = await getDoc(doc(database, "users", id));
        let settings: Settings | undefined;
        let deliveries: Delivery[] | undefined;
        let tips: DeliveryTip[] | undefined;

        if (userDoc.exists() && userDoc.data().settings) {
            settings = userDoc.data().settings;
            safeSet(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        }

        const deliverySnap = await getDocs(collection(database, "users", id, "deliveries"));
        if (!deliverySnap.empty) {
            deliveries = deliverySnap.docs.map(d => ({
                date: d.id,
                total: d.data().total || 0
            } as Delivery));
            safeSet(STORAGE_KEY_DELIVERIES, JSON.stringify(deliveries));
        }

        const tipsSnap = await getDocs(collection(database, "users", id, "tips"));
        if (!tipsSnap.empty) {
            tips = tipsSnap.docs.map(d => d.data() as DeliveryTip);
            safeSet(STORAGE_KEY_TIPS, JSON.stringify(tips));
        }

        return { settings, deliveries, tips };
    } catch (e) {
        console.warn("Cloud sync failed:", e);
        return {};
    }
}

export async function loadSettings(): Promise<Settings> {
    const stored = safeGet(STORAGE_KEY_SETTINGS);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') return parsed as Settings;
        } catch { }
    }

    const { settings } = await syncFromCloud();
    if (settings) return settings;

    // First run seed
    await saveSettings(DEFAULT_SETTINGS);
    await seedTestDeliveries();
    return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
    // If it's the first time setting a sharedId, we should pull cloud data for THAT id immediately
    const prevSettingsStr = safeGet(STORAGE_KEY_SETTINGS);
    const prevSettings = prevSettingsStr ? JSON.parse(prevSettingsStr) as Settings : null;

    safeSet(STORAGE_KEY_SETTINGS, JSON.stringify(settings));

    if (db) {
        const database = db as Firestore;
        try {
            const id = settings.sharedId || getDeviceId();

            // If ID changed, sync THIS device's data TO the new ID for the first time
            // Or if the new ID already has data, sync FROM it next time.
            await setDoc(doc(database, "users", id), { settings }, { merge: true });

            // If user just ADDED a sharedId, let's also migration current local deliveries TO the cloud under that ID
            if (settings.sharedId && (!prevSettings || prevSettings.sharedId !== settings.sharedId)) {
                const localDeliveries = await loadDeliveries();
                if (localDeliveries.length > 0) {
                    const batch = writeBatch(database);
                    localDeliveries.forEach(d => {
                        const ref = doc(database, "users", settings.sharedId!, "deliveries", d.date);
                        batch.set(ref, { total: d.total });
                    });
                    await batch.commit();
                }
            }
        } catch (e) {
            console.error("Cloud save failed:", e);
        }
    }
}

export async function loadDeliveries(): Promise<Delivery[]> {
    const stored = safeGet(STORAGE_KEY_DELIVERIES);
    let localDeliveries: Delivery[] = [];

    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) localDeliveries = parsed;
        } catch { }
    }

    if (localDeliveries.length === 0) {
        const { deliveries } = await syncFromCloud();
        if (deliveries) return deliveries.sort((a, b) => b.date.localeCompare(a.date));
    }

    return localDeliveries.sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveDelivery(date: string, total: number): Promise<void> {
    const deliveries = await loadDeliveries();
    const existing = deliveries.findIndex((d) => d.date === date);
    if (existing >= 0) {
        deliveries[existing].total = total;
    } else {
        deliveries.push({ date, total });
    }

    safeSet(STORAGE_KEY_DELIVERIES, JSON.stringify(deliveries));

    if (db) {
        const database = db as Firestore;
        try {
            const id = getTargetId();
            await setDoc(doc(database, "users", id, "deliveries", date), { total });
        } catch (e) {
            console.error("Cloud save failed:", e);
        }
    }
}

export async function deleteDelivery(date: string): Promise<void> {
    const deliveries = await loadDeliveries();
    const filtered = deliveries.filter((d) => d.date !== date);
    safeSet(STORAGE_KEY_DELIVERIES, JSON.stringify(filtered));

    if (db) {
        const database = db as Firestore;
        try {
            const id = getTargetId();
            await deleteDoc(doc(database, "users", id, "deliveries", date));
        } catch (e) {
            console.error("Cloud delete failed:", e);
        }
    }
}

export async function loadTips(): Promise<DeliveryTip[]> {
    const stored = safeGet(STORAGE_KEY_TIPS);
    let localTips: DeliveryTip[] = [];

    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) localTips = parsed;
        } catch { }
    }

    if (localTips.length === 0) {
        const { tips } = await syncFromCloud();
        if (tips) return tips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return localTips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveTip(tip: DeliveryTip): Promise<void> {
    const tips = await loadTips();
    const existing = tips.findIndex((t) => t.id === tip.id);
    if (existing >= 0) {
        tips[existing] = tip;
    } else {
        tips.push(tip);
    }

    safeSet(STORAGE_KEY_TIPS, JSON.stringify(tips));

    if (db) {
        const database = db as Firestore;
        try {
            const id = getTargetId();
            // tips have IDs generated by Date.now() typically
            await setDoc(doc(database, "users", id, "tips", tip.id), tip);
        } catch (e) {
            console.error("Cloud save failed:", e);
        }
    }
}

export async function deleteTip(tipId: string): Promise<void> {
    const tips = await loadTips();
    const filtered = tips.filter((t) => t.id !== tipId);
    safeSet(STORAGE_KEY_TIPS, JSON.stringify(filtered));

    if (db) {
        const database = db as Firestore;
        try {
            const id = getTargetId();
            await deleteDoc(doc(database, "users", id, "tips", tipId));
        } catch (e) {
            console.error("Cloud delete failed:", e);
        }
    }
}

async function seedTestDeliveries(): Promise<void> {
    const stored = safeGet(STORAGE_KEY_DELIVERIES);
    if (!stored) {
        safeSet(STORAGE_KEY_DELIVERIES, JSON.stringify(TEST_DELIVERIES));
        if (db) {
            const database = db as Firestore;
            try {
                const id = getTargetId();
                const batch = writeBatch(database);
                TEST_DELIVERIES.forEach(d => {
                    const ref = doc(database, "users", id, "deliveries", d.date);
                    batch.set(ref, { total: d.total });
                });
                await batch.commit();
            } catch { }
        }
    }
}
