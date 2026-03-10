"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import ZoneManager from "@/components/ZoneManager";
import {
    Settings,
    Zone,
    WorkType,
    WORK_TYPE_LABELS,
    DEFAULT_SETTINGS,
} from "@/lib/types";
import { loadSettings, saveSettings } from "@/lib/store";

import PWAInstaller from "@/components/PWAInstaller";

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Track if settings changed through user interaction
    const isInitialMount = useRef(true);

    const loadData = useCallback(async () => {
        try {
            const s = await loadSettings();
            setSettings(s);
        } catch (err) {
            console.error("Failed to load settings:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setIsMounted(true);
        loadData();
    }, [loadData]);

    // Auto-save effect
    useEffect(() => {
        if (isInitialMount.current) {
            if (!loading) isInitialMount.current = false;
            return;
        }

        const timer = setTimeout(async () => {
            setSaving(true);
            try {
                await saveSettings(settings);
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } catch (err) {
                console.error("Auto-save failed:", err);
            } finally {
                setSaving(false);
            }
        }, 800); // Wait for 800ms of inactivity before saving

        return () => clearTimeout(timer);
    }, [settings, loading]);

    const handleZonesChange = (zones: Zone[]) => {
        setSettings((prev) => ({ ...prev, zones }));
    };

    const handleWorkTypeChange = (workType: WorkType) => {
        setSettings((prev) => ({ ...prev, workType }));
    };

    if (!isMounted || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold text-gray-100">설정</h1>
                <div className="flex items-center gap-2">
                    {saving ? (
                        <span className="text-[10px] text-blue-400 animate-pulse">자동 저장 중...</span>
                    ) : saved ? (
                        <span className="text-[10px] text-green-400">✓ 저장됨</span>
                    ) : (
                        <span className="text-[10px] text-gray-600">모든 변경사항 자동 저장</span>
                    )}
                </div>
            </div>

            {/* Zone Manager */}
            <ZoneManager zones={settings.zones} onChange={handleZonesChange} />

            {/* Work Pattern */}
            <div id="guide-settings-worktype" className="mt-8">
                <h3 className="text-base font-bold text-gray-200 mb-3">근무 패턴</h3>
                <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => handleWorkTypeChange(type)}
                            className={`py-2.5 px-4 rounded-xl text-center text-sm font-medium transition-all ${settings.workType === type
                                ? "bg-blue-600 text-white"
                                : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700"
                                }`}
                        >
                            {WORK_TYPE_LABELS[type]}
                        </button>
                    ))}
                </div>

                {settings.workType === "custom" && (
                    <div className="mt-3">
                        <label className="text-xs text-gray-500 block mb-1.5">
                            월 근무일수
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={settings.customWorkDays ?? ""}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    customWorkDays: parseInt(e.target.value) || undefined,
                                }))
                            }
                            placeholder="예: 20"
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5
                         text-white text-base focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                )}
            </div>

            {/* Shared ID */}
            <div id="guide-settings-sharedid" className="mt-8 pt-8 border-t border-gray-800">
                <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-base font-bold text-gray-200">데이터 공유 (2인 1조)</h3>
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-full border border-blue-500/20">
                        NEW
                    </span>
                </div>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    동일한 '공유 ID'를 입력하면 다른 기기와 실시간으로 데이터를 공유할 수 있습니다.
                </p>
                <div className="space-y-3">
                    <input
                        type="text"
                        value={settings.sharedId ?? ""}
                        onChange={(e) =>
                            setSettings((prev) => ({
                                ...prev,
                                sharedId: e.target.value || undefined,
                            }))
                        }
                        placeholder="공유할 이름을 입력하세요 (예: kopo75)"
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3
                         text-white text-base focus:outline-none focus:border-blue-500/50"
                    />
                </div>
            </div>

            {/* PWA Install */}
            <PWAInstaller />


            {/* App Info & Reset Guide */}
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
                    <p className="font-medium">택배 정산 v1.2</p>
                    <p>클라우드 실시간 백업 및 자동 저장 활성화됨</p>
                </div>
            </div>
        </div>
    );
}
