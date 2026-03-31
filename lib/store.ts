import { Settings, Delivery, DEFAULT_SETTINGS, TEST_DELIVERIES, DeliveryTip } from "./types";
import { getDatabase, getDeviceId } from "./firebase";
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
    let database: Firestore;
    try {
        database = getDatabase();
    } catch (e: any) {
        console.error("Database connection failed:", e);
        throw e;
    }
    const id = (targetId || getTargetId()).trim();
    if (!id) throw new Error("유효한 공유 ID가 없습니다.");

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

        console.log(`✅ Sync Success: Found ${deliveries?.length || 0} deliveries, ${settings ? "with" : "no"} settings.`);
        return { settings, deliveries, tips };
    } catch (e: any) {
        console.error("❌ Cloud sync failed:", e);
        throw e; // throw error to handle in UI
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

    // 클라우드에도 데이터가 없는 최초 실행 시에만 로컬 시드 생성
    const defaultS = { ...DEFAULT_SETTINGS };
    safeSet(STORAGE_KEY_SETTINGS, JSON.stringify(defaultS));
    await seedTestDeliveries();
    return defaultS;
}

export async function saveSettings(settings: Settings): Promise<void> {
    const prevSettingsStr = safeGet(STORAGE_KEY_SETTINGS);
    const prevSettings = prevSettingsStr ? JSON.parse(prevSettingsStr) as Settings : null;

    safeSet(STORAGE_KEY_SETTINGS, JSON.stringify(settings));

    try {
        const database = getDatabase();
        if (database) {
            const id = settings.sharedId || getDeviceId();
            
            // 공유 ID가 새로 설정되었거나 변경된 경우
            if (settings.sharedId && (!prevSettings || prevSettings.sharedId !== settings.sharedId)) {
                // 1. 먼저 해당 공유 ID에 클라우드 데이터가 있는지 확인 (모바일 데이터 보호)
                const cloudData = await syncFromCloud(settings.sharedId);
                
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

export async function loadDeliveries(): Promise<Delivery[]> {
    const settingsStr = safeGet(STORAGE_KEY_SETTINGS);
    const hasSharedId = settingsStr && JSON.parse(settingsStr).sharedId;
    
    // 공유 ID가 설정되어 있으면 항상 클라우드와 먼저 동기화를 시도함
    if (hasSharedId) {
        const { deliveries } = await syncFromCloud();
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

    if (localDeliveries.length === 0 && !hasSharedId) {
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

    try {
        const database = getDatabase();
        if (database) {
            const id = getTargetId();
            await setDoc(doc(database, "users", id, "deliveries", date), { total });
        }
    } catch (e) {
        console.error("Cloud save failed:", e);
    }
}

export async function deleteDelivery(date: string): Promise<void> {
    const deliveries = await loadDeliveries();
    const filtered = deliveries.filter((d) => d.date !== date);
    safeSet(STORAGE_KEY_DELIVERIES, JSON.stringify(filtered));

    try {
        const database = getDatabase();
        if (database) {
            const id = getTargetId();
            await deleteDoc(doc(database, "users", id, "deliveries", date));
        }
    } catch (e) {
        console.error("Cloud delete failed:", e);
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

    try {
        const database = getDatabase();
        if (database) {
            const id = getTargetId();
            await setDoc(doc(database, "users", id, "tips", tip.id), tip);
        }
    } catch (e) {
        console.error("Cloud save failed:", e);
    }
}

export async function deleteTip(tipId: string): Promise<void> {
    const tips = await loadTips();
    const filtered = tips.filter((t) => t.id !== tipId);
    safeSet(STORAGE_KEY_TIPS, JSON.stringify(filtered));

    try {
        const database = getDatabase();
        if (database) {
            const id = getTargetId();
            await deleteDoc(doc(database, "users", id, "tips", tipId));
        }
    } catch (e) {
        console.error("Cloud delete failed:", e);
    }
}

async function seedTestDeliveries(): Promise<void> {
    const stored = safeGet(STORAGE_KEY_DELIVERIES);
    if (!stored) {
        // 시드 데이터는 로컬 스토리지에만 저장하고 클라우드에는 자동 업로드하지 않음
        // 사용자가 데이터를 추가하기 시작할 때 자연스럽게 업로드되도록 유도
        safeSet(STORAGE_KEY_DELIVERIES, JSON.stringify(TEST_DELIVERIES));
    }
}
