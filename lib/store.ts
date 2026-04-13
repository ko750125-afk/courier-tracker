import { Settings, Delivery, DEFAULT_SETTINGS, TEST_DELIVERIES, DeliveryTip, ReceivedSettlementsMap } from "./types";
import { getDatabase, getDeviceId } from "./firebase";
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, writeBatch, Firestore, onSnapshot } from "firebase/firestore";

const STORAGE_KEY_SETTINGS = "courier-tracker-settings";
const STORAGE_KEY_DELIVERIES = "courier-tracker-deliveries";
const STORAGE_KEY_TIPS = "courier-tracker-tips";
const STORAGE_KEY_RECEIVED = "courier-tracker-received"; // 정산 수령 확인 상태

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
 * Returns either uid (if logged in), sharedId from settings, or unique deviceId
 */
function getTargetId(uid?: string): string {
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

    const isShared = !!targetIdOverride || (!uid && !!(safeGet(STORAGE_KEY_SETTINGS) && JSON.parse(safeGet(STORAGE_KEY_SETTINGS)!).sharedId));

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

        // MERGE LOGIC: Don't overwrite local if cloud is empty or different
        const storedDeliveriesRaw = safeGet(STORAGE_KEY_DELIVERIES);
        let localDeliveries: Delivery[] = [];
        if (storedDeliveriesRaw) {
            try { localDeliveries = JSON.parse(storedDeliveriesRaw); } catch { }
        }

        // Merge: prefer cloud for specific dates if cloud has them, but keep local for dates NOT in cloud
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

            // AUTO-BACKUP: If cloud was empty but we have local data, upload it now
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
        // 1. Load settings from deviceId
        const deviceDoc = await getDoc(doc(database, "users", deviceId));
        if (deviceDoc.exists()) {
            const settings = deviceDoc.data().settings;
            await setDoc(doc(database, "users", uid), { settings }, { merge: true });
        }

        // 2. Load deliveries
        const deliverySnap = await getDocs(collection(database, "users", deviceId, "deliveries"));
        if (!deliverySnap.empty) {
            const batch = writeBatch(database);
            deliverySnap.docs.forEach(d => {
                const ref = doc(database, "users", uid, "deliveries", d.id);
                batch.set(ref, d.data());
            });
            await batch.commit();
        }

        // 3. Load tips
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
                // Only update and callback if actually different to prevent loops
                const current = safeGet(STORAGE_KEY_SETTINGS);
                if (current !== JSON.stringify(settings)) {
                    safeSet(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
                    callback(settings);
                }
            }
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
            
            // Merge with local to be safe (though usually cloud is source of truth after login/sharedId)
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
        });
    } catch (e) {
        console.warn("Real-time deliveries subscription failed:", e);
        return () => {};
    }
}

export async function loadSettings(uid?: string): Promise<Settings> {
    const stored = safeGet(STORAGE_KEY_SETTINGS);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') return parsed as Settings;
        } catch { }
    }

    const { settings } = await syncFromCloud(uid);
    if (settings) return settings;

    // 클라우드에도 데이터가 없는 최초 실행 시에만 로컬 시드 생성
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
            
            // 공유 ID가 새로 설정되었거나 변경된 경우 (비로그인 상태에서만 동작하거나 혹은 로그인 상태에서도 공유 ID 지원)
            if (!uid && settings.sharedId && (!prevSettings || prevSettings.sharedId !== settings.sharedId)) {
                // 1. 먼저 해당 공유 ID에 클라우드 데이터가 있는지 확인 (모바일 데이터 보호)
                const cloudData = await syncFromCloud(undefined, settings.sharedId);
                
                if (!cloudData.deliveries || cloudData.deliveries.length === 0) {
                    // 클라우드가 비어있을 때만 현재 로컬 데이터를 클라우드에 업로드 (마이그레이션)
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
                    // 클라우드에 이미 데이터가 있다면 업로드하지 않고 클라우드 데이터를 로컬에 덮어씀 (동기화)
                    if (cloudData.settings) {
                        safeSet(STORAGE_KEY_SETTINGS, JSON.stringify(cloudData.settings));
                    }
                }
            } else {
                // 일반적인 설정 저장
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
    
    // 로그인이 되어있거나 공유 ID가 설정되어 있으면 항상 클라우드와 먼저 동기화를 시도함
    if (uid || hasSharedId) {
        const { deliveries } = await syncFromCloud(uid);
        if (deliveries && deliveries.length > 0) {
            return deliveries.sort((a, b) => b.date.localeCompare(a.date));
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
        const { deliveries } = await syncFromCloud();
        if (deliveries) return deliveries.sort((a, b) => b.date.localeCompare(a.date));
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
        const { tips } = await syncFromCloud(uid);
        if (tips) return tips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

/**
 * 정산 수령 확인 상태를 불러옴
 */
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

/**
 * 특정 정산 기간의 수령 확인 상태를 저장
 */
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

