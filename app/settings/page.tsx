"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import ZoneManager from "@/components/ZoneManager";
import {
    Settings,
    DEFAULT_SETTINGS,
} from "@/lib/types";
import { loadSettings, saveSettings, syncFromCloud, migrateFromDeviceToUser, subscribeToSettings } from "@/lib/store";
import { useAuth } from "@/lib/contexts/AuthContext";
import PWAInstaller from "@/components/PWAInstaller";
import ProfileSection from "@/components/settings/ProfileSection";
import WorkPatternSection from "@/components/settings/WorkPatternSection";
import SettlementSection from "@/components/settings/SettlementSection";
import CommissionSection from "@/components/settings/CommissionSection";
import SyncSection from "@/components/settings/SyncSection";

export default function SettingsPage() {
    const { user, loginWithGoogle, logout, loading: authLoading } = useAuth();
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [isMigrating, setIsMigrating] = useState(false);
    const [commissionRateInput, setCommissionRateInput] = useState("");

    // Track if settings changed through user interaction
    const isInitialMount = useRef(true);

    const loadData = useCallback(async () => {
        try {
            const s = await loadSettings(user?.uid);
            setSettings(s);
            setCommissionRateInput(s.commissionRate?.toString() || "");
        } catch (err) {
            console.error("Failed to load settings:", err);
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    useEffect(() => {
        setIsMounted(true);
        loadData();

        const unsubscribe = subscribeToSettings(user?.uid, (newSettings) => {
            setSettings(newSettings);
            if (document.activeElement?.id !== "commission-rate-input") {
                setCommissionRateInput(newSettings.commissionRate?.toString() || "");
            }
        });

        return () => unsubscribe();
    }, [loadData, user?.uid]);

    // Auto-save effect
    useEffect(() => {
        if (isInitialMount.current) {
            if (!loading) isInitialMount.current = false;
            return;
        }

        const timer = setTimeout(async () => {
            setSaving(true);
            try {
                await saveSettings(settings, user?.uid);
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } catch (err) {
                console.error("Auto-save failed:", err);
            } finally {
                setSaving(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [settings, loading, user?.uid]);

    const handleUpdate = (updates: Partial<Settings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    };

    const handleRestDayToggle = (dayIndex: number) => {
        const current = settings.restDaysOfWeek || [];
        let updated: number[];
        if (current.includes(dayIndex)) {
            updated = current.filter((d: number) => d !== dayIndex);
        } else {
            updated = [...current, dayIndex].sort((a, b) => b - a);
        }
        handleUpdate({ restDaysOfWeek: updated });
    };

    const handleCommissionInputChange = (val: string) => {
        setCommissionRateInput(val);
        const parsed = parseFloat(val);
        if (!isNaN(parsed) || val === "") {
            handleUpdate({ commissionRate: val === "" ? 0 : parsed });
        }
    };

    const handleManualSync = async () => {
        if (isSyncing || (!settings.sharedId && !user)) return;
        setIsSyncing(true);
        try {
            const result = await syncFromCloud(user?.uid, settings.sharedId);
            if (result.settings) setSettings(result.settings);
            setLastSyncTime(new Date().toLocaleTimeString());
            alert(`✅ 동기화 완료! 클라우드에서 ${(result.deliveries || []).length}개의 기록을 가져왔습니다.`);
        } catch (e: any) {
            alert(`❌ 동기화 실패: ${e.message || "알 수 없는 오류"}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleMigration = async () => {
        if (!user || isMigrating) return;
        if (!confirm("현재 기기에 저장된 기록을 계정으로 옮기시겠습니까?")) return;

        setIsMigrating(true);
        try {
            await migrateFromDeviceToUser(user.uid);
            alert("✅ 모든 데이터가 계정으로 이전되었습니다!");
            loadData();
        } catch (e) {
            alert("❌ 데이터 이전 중 오류가 발생했습니다.");
        } finally {
            setIsMigrating(false);
        }
    };

    if (!isMounted || loading || authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="pb-20">
            <div className="flex items-center justify-between mb-6 px-1">
                <h1 className="text-xl font-bold text-gray-100">설정</h1>
                <div className="flex items-center gap-2">
                    {saving ? (
                        <span className="text-[10px] text-blue-400 animate-pulse">자동 저장 중...</span>
                    ) : saved ? (
                        <span className="text-[10px] text-green-400">✓ 저장됨</span>
                    ) : (
                        <span className="text-[10px] text-slate-500">모든 변경사항 자동 저장</span>
                    )}
                </div>
            </div>

            <ProfileSection 
                user={user} 
                loginWithGoogle={loginWithGoogle} 
                logout={logout} 
                handleMigration={handleMigration} 
                isMigrating={isMigrating} 
            />

            <ZoneManager 
                zones={settings.zones} 
                onChange={(zones) => handleUpdate({ zones })} 
            />

            <WorkPatternSection 
                settings={settings} 
                onUpdate={handleUpdate} 
                handleRestDayToggle={handleRestDayToggle} 
            />

            <SettlementSection 
                settings={settings} 
                onUpdate={handleUpdate} 
            />

            <CommissionSection 
                commissionRateInput={commissionRateInput} 
                onInputChange={handleCommissionInputChange} 
            />

            <SyncSection 
                settings={settings} 
                onUpdate={handleUpdate} 
                handleManualSync={handleManualSync} 
                isSyncing={isSyncing} 
                lastSyncTime={lastSyncTime} 
            />

            <PWAInstaller />

            {/* Sound Switch */}
            <div className="mt-8 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-base font-bold text-slate-200 uppercase tracking-widest text-xs">버튼 사운드</h3>
                        <p className="text-[10px] text-gray-500 italic">버튼 클릭 시 가벼운 효과음을 재생합니다.</p>
                    </div>
                    <button
                        onClick={() => handleUpdate({ useSoundEffects: !settings.useSoundEffects })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            settings.useSoundEffects ? 'bg-blue-600' : 'bg-gray-700'
                        }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.useSoundEffects ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                    </button>
                </div>
            </div>

            <div className="mt-12 text-center space-y-4">
                <button
                    onClick={() => {
                        localStorage.removeItem("functional_guide_v1");
                        localStorage.removeItem("onboarding_v1");
                        window.location.href = "/";
                    }}
                    className="text-xs text-blue-500 hover:text-blue-400 font-medium px-4 py-2 bg-blue-500/5 rounded-lg border border-blue-500/20"
                >
                    사용 가이드 다시보기
                </button>
                <div className="text-gray-700 text-[10px] space-y-1">
                    <p className="font-medium">택배 정산 v1.3</p>
                    <p>클라우드 실시간 백업 활성화됨</p>
                </div>
            </div>
        </div>
    );
}
