"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import ZoneManager from "@/components/ZoneManager";
import {
    Settings,
    Zone,
    WorkType,
    WorkShift,
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

    const handleRestDayToggle = (dayIndex: number) => {
        setSettings((prev) => {
            const current = prev.restDaysOfWeek || [];
            let updated: number[];
            if (current.includes(dayIndex)) {
                updated = current.filter((d: number) => d !== dayIndex);
            } else {
                updated = [...current, dayIndex].sort((a, b) => a - b);
            }
            return { ...prev, restDaysOfWeek: updated };
        });
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

            {/* Work Shift */}
            <div className="mt-8 pt-8 border-t border-gray-800">
                <h3 className="text-base font-bold text-gray-200 mb-3">근무 시간 (주간/야간)</h3>
                <div className="grid grid-cols-2 gap-2">
                    {(["day", "night"] as WorkShift[]).map((shift) => (
                        <button
                            key={shift}
                            onClick={() => setSettings(prev => ({ ...prev, workShift: shift }))}
                            className={`py-2.5 px-4 rounded-xl text-center text-sm font-medium transition-all ${settings.workShift === shift
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700"
                                }`}
                        >
                            <div className="flex flex-col items-center gap-1">
                                <span className="font-bold">{shift === "day" ? "주간 배송" : "야간 배송"}</span>
                                <span className="text-[10px] opacity-70">{shift === "day" ? "당일 기록" : "전날 기록"}</span>
                            </div>
                        </button>
                    ))}
                </div>
                <p className="mt-3 text-[10px] text-gray-500 leading-relaxed italic">
                    * 야간 배송(밤 10시~다음날 오전)의 경우, 새벽에 입력한 실적이 배송을 시작한 전날 날짜로 자동 기록됩니다.
                </p>
            </div>

            {/* Rest Days Of Week */}
            <div className="mt-8 pt-8 border-t border-gray-800">
                    <h3 className="text-base font-bold text-gray-200 mb-2">정기 쉬는 요일</h3>
                    <p className="text-xs text-gray-500 mb-4 bg-gray-900/50 p-3 rounded-xl border border-gray-800 leading-relaxed">
                        선택된 요일은 통계 달력에 자동 휴무 표시됩니다. 다중 선택이 가능합니다.
                    </p>
                    <div className="flex gap-2 justify-between">
                        {["일", "월", "화", "수", "목", "금", "토"].map((label, idx) => {
                            const isSelected = (settings.restDaysOfWeek || []).includes(idx);
                            return (
                                <button
                                    key={label}
                                    onClick={() => handleRestDayToggle(idx)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 active:scale-90 ${isSelected
                                        ? "bg-red-500/20 text-red-400 border border-red-500/30 shadow-inner"
                                        : "bg-gray-900 text-gray-500 border border-gray-800 hover:bg-gray-800"
                                        }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Settlement Settings */}
                <div className="mt-8 pt-8 border-t border-gray-800">
                    <h3 className="text-base font-bold text-gray-200 mb-3">정산 및 급여 주기</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1.5">정산 시작일</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={settings.settlementDay}
                                    onChange={(e) => setSettings(prev => ({ ...prev, settlementDay: parseInt(e.target.value) || 25 }))}
                                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-base focus:outline-none focus:border-blue-500/50"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">일</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1.5">정산일 (월급날)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={settings.payDay}
                                    onChange={(e) => setSettings(prev => ({ ...prev, payDay: parseInt(e.target.value) || 20 }))}
                                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-base focus:outline-none focus:border-blue-500/50"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">일</span>
                            </div>
                        </div>
                    </div>
                    <p className="mt-3 text-[10px] text-gray-600 leading-relaxed italic">
                        * 예: 시작일 25일 시, [전월 25일 ~ 당월 24일] 성과가 정산됩니다.
                    </p>
                </div>

            {/* Delivery Tip Zones */}
            <div id="guide-settings-tipzones" className="mt-8 pt-8 border-t border-gray-800">
                <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-base font-bold text-gray-200">배송팁 상세 구역 관리</h3>
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-full border border-blue-500/20">
                        NEW
                    </span>
                </div>
                <p className="text-xs text-gray-500 mb-4 bg-gray-900/50 p-3 rounded-xl border border-gray-800 leading-relaxed">
                    배송팁 작성 시 선택할 상세 구역(예: B01, C02 등)을 추가할 수 있습니다. 추가된 구역은 배송팁 목록의 필터와 입력 버튼으로 자동 반영됩니다.
                </p>
                <div className="space-y-3">
                    {/* List of existing tipZones */}
                    {settings.tipZones && settings.tipZones.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {settings.tipZones.map((zone, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-xl text-sm font-bold text-gray-300">
                                    <span>{zone}</span>
                                    <button
                                        onClick={() => {
                                            setSettings(prev => ({
                                                ...prev,
                                                tipZones: (prev.tipZones || []).filter((_, i) => i !== idx)
                                            }));
                                        }}
                                        className="w-5 h-5 flex items-center justify-center rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors active:scale-[0.98]"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Input for new tipZone */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            id="newTipZoneInput"
                            placeholder="새 구역 추가 (예: B01)"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    const input = e.target as HTMLInputElement;
                                    const val = input.value.trim();
                                    if (val && !(settings.tipZones || []).includes(val)) {
                                        setSettings(prev => ({ ...prev, tipZones: [...(prev.tipZones || []), val] }));
                                        input.value = "";
                                    }
                                }
                            }}
                            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50"
                        />
                        <button
                            onClick={() => {
                                const input = document.getElementById("newTipZoneInput") as HTMLInputElement;
                                const val = input.value.trim();
                                if (val && !(settings.tipZones || []).includes(val)) {
                                    setSettings(prev => ({ ...prev, tipZones: [...(prev.tipZones || []), val] }));
                                    input.value = "";
                                }
                            }}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all active:scale-[0.98]"
                        >
                            추가
                        </button>
                    </div>
                </div>
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
