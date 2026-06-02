export const STORAGE_KEY_SETTINGS = "courier-tracker-settings";
export const STORAGE_KEY_DELIVERIES = "courier-tracker-deliveries";
export const STORAGE_KEY_TIPS = "courier-tracker-tips";
export const STORAGE_KEY_RECEIVED = "courier-tracker-received"; // 정산 수령 확인 상태

export function isClient(): boolean {
    return typeof window !== "undefined";
}

export function safeGet(key: string): string | null {
    if (!isClient()) return null;
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.warn("Storage access denied:", e);
        return null;
    }
}

export function safeSet(key: string, value: string): void {
    if (!isClient()) return;
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn("Storage write failed:", e);
    }
}
