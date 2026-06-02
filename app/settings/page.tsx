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

import Accordion from "@/components/Accordion";
import { User, CalendarClock, Map, Wallet, Cloud, Settings2, Download, Volume2 } from "lucide-react";

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
                <h1 className="text-2xl font-black text-white tracking-tight">설정</h1>
                <div className="flex items-center gap-2">
                    {saving ? (
                        <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400 animate-pulse">자동 저장 중</span>
                    ) : saved ? (
                        <span className="text-[10px] font-bold tracking-widest uppercase text-green-400">✓ 저장됨</span>
                    ) : (
                        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">자동 저장</span>
                    )}
                </div>
            </div>

            <Accordion title="기본 정보 및 백업" icon={User} defaultOpen={true}>
                <div className="space-y-4">
                    <ProfileSection 
                        user={user} 
                        loginWithGoogle={loginWithGoogle} 
                        logout={logout} 
                        handleMigration={handleMigration} 
                        isMigrating={isMigrating} 
                    />
                    <SyncSection 
                        settings={settings} 
                        onUpdate={handleUpdate} 
                        handleManualSync={handleManualSync} 
                        isSyncing={isSyncing} 
                        lastSyncTime={lastSyncTime} 
                    />
                </div>
            </Accordion>

            <Accordion title="근무 및 정산일 설정" icon={CalendarClock}>
                <div className="space-y-4">
                    <WorkPatternSection 
                        settings={settings} 
                        onUpdate={handleUpdate} 
                        handleRestDayToggle={handleRestDayToggle} 
                    />
                    <SettlementSection 
                        settings={settings} 
                        onUpdate={handleUpdate} 
                    />
                </div>
            </Accordion>

            <Accordion title="구역 및 단가 설정" icon={Map}>
                <ZoneManager 
                    zones={settings.zones} 
                    onChange={(zones) => handleUpdate({ zones })} 
                />
            </Accordion>

            <Accordion title="수수료 및 인센티브" icon={Wallet}>
                <CommissionSection 
                    commissionRateInput={commissionRateInput} 
                    onInputChange={handleCommissionInputChange} 
                />
            </Accordion>

            <Accordion title="앱 설정" icon={Settings2}>
                <div className="space-y-4">
                    {/* Sound Switch */}
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                            <Volume2 className="w-5 h-5 text-slate-400" />
                            <div className="flex flex-col gap-0.5">
                                <h3 className="text-sm font-bold text-slate-200">버튼 사운드</h3>
                                <p className="text-[10px] text-gray-500 font-medium">버튼 터치 시 가벼운 효과음 재생</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleUpdate({ useSoundEffects: !settings.useSoundEffects })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                settings.useSoundEffects ? 'bg-blue-500' : 'bg-slate-700'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    settings.useSoundEffects ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>

                    <PWAInstaller />
                </div>
            </Accordion>

            <div className="mt-12 text-center space-y-4 pb-8">
                <div className="text-slate-600 text-[10px] font-bold tracking-widest uppercase space-y-1">
                    <p>Courier Tracker v2</p>
                    <p>Cloud Sync Enabled</p>
                </div>
            </div>
        </div>
    );
}
