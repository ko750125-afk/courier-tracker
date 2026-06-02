import { Settings, Delivery, DeliveryTip, ReceivedSettlementsMap, DEFAULT_SETTINGS, TEST_DELIVERIES } from "./types";
import { getDatabase } from "./firebase";
import { doc, setDoc, deleteDoc, writeBatch, getDoc } from "firebase/firestore";
import { safeGet, safeSet, STORAGE_KEY_SETTINGS, STORAGE_KEY_DELIVERIES, STORAGE_KEY_TIPS, STORAGE_KEY_RECEIVED } from "./storage";
import { getTargetId, syncFromCloud } from "./firebaseSync";

export async function loadSettings(uid?: string): Promise<Settings> {
    const stored = safeGet(STORAGE_KEY_SETTINGS);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
                syncFromCloud(uid).catch(e => console.warn("Background sync failed:", e));
                return parsed as Settings;
            }
        } catch { }
    }

    try {
        const { settings } = await syncFromCloud(uid);
        if (settings) return settings;
    } catch (e) {
        console.warn("Cloud sync failed in loadSettings, falling back to default:", e);
    }

    const defaultS = { ...DEFAULT_SETTINGS };
    safeSet(STORAGE_KEY_SETTINGS, JSON.stringify(defaultS));
    await seedTestDeliveries();
    return defaultS;
}

export async function saveSettings(settings: Settings, uid?: string): Promise<void> {
    const prevSettingsStr = safeGet(STORAGE_KEY_SETTINGS);
    const prevSettings = prevSettingsStr ? JSON.parse(prevSettingsStr) as Settings : null;

    safeSet(STORAGE_KEY_SETTINGS, JSON.stringify(settings));

    try {
        const database = getDatabase();
        if (database) {
            const id = getTargetId(uid);
            
            if (!uid && settings.sharedId && (!prevSettings || prevSettings.sharedId !== settings.sharedId)) {
                const cloudData = await syncFromCloud(undefined, settings.sharedId);
                
                if (!cloudData.deliveries || cloudData.deliveries.length === 0) {
                    const localDeliveries = await loadDeliveries();
                    if (localDeliveries.length > 0) {
                        const batch = writeBatch(database);
                        localDeliveries.forEach(d => {
                            const ref = doc(database, "users", settings.sharedId!, "deliveries", d.date);
                            batch.set(ref, { total: d.total });
                        });
                        await batch.commit();
                    }
                } else {
                    if (cloudData.settings) {
                        safeSet(STORAGE_KEY_SETTINGS, JSON.stringify(cloudData.settings));
                    }
                }
            } else {
                await setDoc(doc(database, "users", id), { settings }, { merge: true });
            }
        }
    } catch (e) {
        console.error("Cloud save failed:", e);
    }
}

export async function loadDeliveries(uid?: string): Promise<Delivery[]> {
    const settingsStr = safeGet(STORAGE_KEY_SETTINGS);
    const hasSharedId = settingsStr && JSON.parse(settingsStr).sharedId;
    
    if (uid || hasSharedId) {
        try {
            const { deliveries } = await syncFromCloud(uid);
            if (deliveries && deliveries.length > 0) {
                return deliveries.sort((a, b) => b.date.localeCompare(a.date));
            }
        } catch (e) {
            console.warn("Cloud sync failed in loadDeliveries, falling back to local:", e);
        }
    }

    const stored = safeGet(STORAGE_KEY_DELIVERIES);
    let localDeliveries: Delivery[] = [];

    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) localDeliveries = parsed;
        } catch { }
    }

    if (localDeliveries.length === 0 && !uid && !hasSharedId) {
        try {
            const { deliveries } = await syncFromCloud();
            if (deliveries) return deliveries.sort((a, b) => b.date.localeCompare(a.date));
        } catch (e) {
            console.warn("Cloud sync failed for anonymous user:", e);
        }
    }

    return localDeliveries.sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveDelivery(date: string, total: number, uid?: string): Promise<void> {
    const deliveries = await loadDeliveries(uid);
    const existing = deliveries.findIndex((d) => d.date === date);
    if (existing >= 0) {
        deliveries[existing].total = total;
    } else {
        deliveries.push({ date, total });
    }

    safeSet(STORAGE_KEY_DELIVERIES, JSON.stringify(deliveries));

    try {
        const database = getDatabase();
        if (database) {
            const id = getTargetId(uid);
            await setDoc(doc(database, "users", id, "deliveries", date), { total });
        }
    } catch (e) {
        console.error("Cloud save failed:", e);
    }
}

export async function deleteDelivery(date: string, uid?: string): Promise<void> {
    const deliveries = await loadDeliveries(uid);
    const filtered = deliveries.filter((d) => d.date !== date);
    safeSet(STORAGE_KEY_DELIVERIES, JSON.stringify(filtered));

    try {
        const database = getDatabase();
        if (database) {
            const id = getTargetId(uid);
            await deleteDoc(doc(database, "users", id, "deliveries", date));
        }
    } catch (e) {
        console.error("Cloud delete failed:", e);
    }
}

export async function loadTips(uid?: string): Promise<DeliveryTip[]> {
    const stored = safeGet(STORAGE_KEY_TIPS);
    let localTips: DeliveryTip[] = [];

    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) localTips = parsed;
        } catch { }
    }

    if (localTips.length === 0 || uid) {
        try {
            const { tips } = await syncFromCloud(uid);
            if (tips) return tips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch (e) {
            console.warn("Cloud sync failed in loadTips, falling back to local:", e);
        }
    }

    return localTips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveTip(tip: DeliveryTip, uid?: string): Promise<void> {
    const tips = await loadTips(uid);
    const existing = tips.findIndex((t) => t.id === tip.id);
    if (existing >= 0) {
        tips[existing] = tip;
    } else {
        tips.push(tip);
    }

    safeSet(STORAGE_KEY_TIPS, JSON.stringify(tips));

    try {
        const database = getDatabase();
        if (database) {
            const id = getTargetId(uid);
            await setDoc(doc(database, "users", id, "tips", tip.id), tip);
        }
    } catch (e) {
        console.error("Cloud save failed:", e);
    }
}

export async function deleteTip(tipId: string, uid?: string): Promise<void> {
    const tips = await loadTips(uid);
    const filtered = tips.filter((t) => t.id !== tipId);
    safeSet(STORAGE_KEY_TIPS, JSON.stringify(filtered));

    try {
        const database = getDatabase();
        if (database) {
            const id = getTargetId(uid);
            await deleteDoc(doc(database, "users", id, "tips", tipId));
        }
    } catch (e) {
        console.error("Cloud delete failed:", e);
    }
}

async function seedTestDeliveries(): Promise<void> {
    const stored = safeGet(STORAGE_KEY_DELIVERIES);
    if (!stored) {
        safeSet(STORAGE_KEY_DELIVERIES, JSON.stringify(TEST_DELIVERIES));
    }
}

export async function loadReceivedSettlements(uid?: string): Promise<ReceivedSettlementsMap> {
    const stored = safeGet(STORAGE_KEY_RECEIVED);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === "object") return parsed as ReceivedSettlementsMap;
        } catch { }
    }

    try {
        const database = getDatabase();
        const id = getTargetId(uid);
        const receivedDoc = await getDoc(doc(database, "users", id, "meta", "received_settlements"));
        if (receivedDoc.exists()) {
            const data = receivedDoc.data() as ReceivedSettlementsMap;
            safeSet(STORAGE_KEY_RECEIVED, JSON.stringify(data));
            return data;
        }
    } catch (e) {
        console.warn("수령 확인 데이터 클라우드 로딩 실패:", e);
    }

    return {};
}

export async function saveSettlementReceived(periodStart: string, isReceived: boolean, uid?: string): Promise<void> {
    const current = await loadReceivedSettlements(uid);
    const updated: ReceivedSettlementsMap = { ...current, [periodStart]: isReceived };

    safeSet(STORAGE_KEY_RECEIVED, JSON.stringify(updated));

    try {
        const database = getDatabase();
        const id = getTargetId(uid);
        await setDoc(
            doc(database, "users", id, "meta", "received_settlements"),
            updated,
            { merge: false }
        );
    } catch (e) {
        console.error("수령 확인 클라우드 저장 실패:", e);
    }
}
