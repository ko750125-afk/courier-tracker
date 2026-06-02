"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Delivery, Settings, DEFAULT_SETTINGS } from "@/lib/types";
import { loadSettings, loadDeliveries, saveSettings, saveDelivery, deleteDelivery, subscribeToSettings, subscribeToDeliveries } from "@/lib/store";
import MonthlyCalendar from "@/components/MonthlyCalendar";
import {
    formatWon,
    formatNumber,
    listRecentSettlements,
} from "@/lib/calculations";
import { useDeliveryStats } from "@/lib/hooks/useDeliveryStats";
import { useAuth } from "@/lib/contexts/AuthContext";

const ChartView = dynamic(() => import("@/components/ChartView"), {
    ssr: false,
    loading: () => <div className="h-48 bg-gray-900 animate-pulse rounded-xl" />,
});

export default function StatsPage() {
    const { user, loading: authLoading } = useAuth();
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState("");

    const loadData = useCallback(async () => {
        try {
            const [s, d] = await Promise.all([
                loadSettings(user?.uid), 
                loadDeliveries(user?.uid)
            ]);
            setSettings(s);
            setDeliveries(d);
        } catch (err) {
            console.error("Failed to load:", err);
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    useEffect(() => {
        setIsMounted(true);
        // Safely initialize selectedMonth locally
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        setSelectedMonth(`${y}-${m}`);
        loadData();

        // Subscribe to real-time updates
        const unsubSettings = subscribeToSettings(user?.uid, (newS) => {
            setSettings(newS);
        });

        const unsubDeliveries = subscribeToDeliveries(user?.uid, (newD) => {
            setDeliveries(newD);
        });

        return () => {
            unsubSettings();
            unsubDeliveries();
        };
    }, [loadData, user?.uid]);

    // Calculate target date safely
    const targetDate = selectedMonth 
        ? new Date(parseInt(selectedMonth.split("-")[0]), parseInt(selectedMonth.split("-")[1]) - 1, 1)
        : new Date();

    // Call hook BEFORE early return
    const { monthlyStats } = useDeliveryStats(deliveries, settings, targetDate);
    const { totalDeliveries, totalRevenue, netRevenue } = monthlyStats;

    if (!isMounted || loading || authLoading || !selectedMonth) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    const handleToggleRestDate = async (dateStr: string) => {
        const currentOverrides = settings.restDateOverrides || {};
        // 현재 해당 날짜가 휴일 목록에 해당하는지 판단
        const dayOfWeek = new Date(dateStr).getDay();
        const isCurrentlyRestDay =
            currentOverrides[dateStr] !== undefined
                ? currentOverrides[dateStr]
                : (settings.restDaysOfWeek || []).includes(dayOfWeek);

        const newOverrides = {
            ...currentOverrides,
            [dateStr]: !isCurrentlyRestDay,
        };

        const newSettings = { ...settings, restDateOverrides: newOverrides };
        setSettings(newSettings); // 즉시 UI 반영
        try {
            await saveSettings(newSettings, user?.uid);
        } catch (err) {
            console.error("Failed to save rest date:", err);
        }
    };

    const handleSaveDelivery = async (dateStr: string, total: number) => {
        try {
            await saveDelivery(dateStr, total, user?.uid);
        } catch (err) {
            console.error("Failed to save delivery:", err);
        }
    };

    const handleDeleteDelivery = async (dateStr: string) => {
        if (confirm("해당 날짜의 배송 기록을 삭제하시겠습니까?")) {
            try {
                await deleteDelivery(dateStr, user?.uid);
            } catch (err) {
                console.error("Failed to delete delivery:", err);
            }
        }
    };

    const monthDeliveries = (deliveries || []).filter((d) =>
        d && d.date && d.date.startsWith(selectedMonth)
    );

    const month = targetDate.getMonth() + 1;

    // 엑셀 탭처럼 고정된 월 목록 생성 (최근 12개월 + 데이터가 있는 월)
    const generateMonthList = () => {
        const list = new Set<string>();
        
        // 1. 현재 달 + 2(다음 다음 달)부터 과거 12개월 추가
        const now = new Date();
        for (let i = -2; i < 10; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            list.add(`${y}-${m}`);
        }

        // 2. 실제 데이터가 있는 월 추가
        (deliveries || []).forEach(d => {
            if (d.date) list.add(d.date.slice(0, 7));
        });

        // 3. 현재 선택된 월도 반드시 포함
        if (selectedMonth) list.add(selectedMonth);

        return Array.from(list).sort((a, b) => b.localeCompare(a));
    };

    const months = generateMonthList();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-black text-white px-1 tracking-tight">통계</h1>

            {/* Month Selector */}
            <div id="guide-month-selector" className="flex gap-2 mb-2 overflow-x-auto pb-4 scrollbar-hide">
                {months.map((m) => {
                    const [y, mm] = m.split("-");
                    const date = new Date(parseInt(y), parseInt(mm) - 1, 1);
                    const isActive = selectedMonth === m;
                    return (
                        <button
                            key={m}
                            onClick={() => setSelectedMonth(m)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 active:scale-95 ${isActive
                                ? "bg-blue-600 text-white shadow-lg"
                                : "bg-slate-900/50 text-slate-400 border border-slate-800"
                                }`}
                        >
                            {date.toLocaleDateString("ko-KR", {
                                year: "numeric",
                                month: "long",
                            })}
                        </button>
                    );
                })}
            </div>

            {/* Settlement Periods (Actual Payment View) */}
            <div className="space-y-3">
                <h2 className="text-lg font-bold text-slate-300 px-1">정산 내역 (수령일 기준)</h2>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {listRecentSettlements(deliveries, settings.zones, settings, 6).map((s, idx) => (
                        <div key={idx} className="min-w-[280px] bg-slate-900 border border-slate-800 p-4 rounded-2xl flex-shrink-0">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="text-blue-400 font-black text-lg">{s.paymentLabel.replace(" 예상 수령액", "")}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.periodStart} ~ {s.periodEnd}</p>
                                </div>
                                <div className="bg-blue-600/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    {s.paymentDate} 지급
                                </div>
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-slate-500 font-bold">합계 배송</p>
                                    <p className="text-xl font-black text-white">{formatNumber(s.breakdown.totalCount)} <span className="text-xs text-slate-500">건</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-bold">수령 예정액</p>
                                    <p className="text-xl font-black text-white">{formatWon(s.amount)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div id="guide-stats-summary" className="grid grid-cols-2 gap-4 select-none">
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">월간 배송건수 ({month}월)</p>
                    <div className="flex items-baseline gap-1">
                        <p className="text-3xl font-black text-white">
                            {formatNumber(totalDeliveries)}
                        </p>
                        <span className="text-xs font-bold text-slate-500">건</span>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">월간 예상수령액 ({month}월)</p>
                    <p className="text-2xl font-black text-blue-400">
                        {formatWon(netRevenue)}
                    </p>
                </div>
            </div>

            {/* Chart — 선택된 월의 데이터만 전달하여 요일별 평균 계산 */}
            <div className="bg-slate-900/50 border border-slate-800 p-2 rounded-2xl overflow-hidden">
                <ChartView deliveries={monthDeliveries} selectedMonth={selectedMonth} />
            </div>

            <MonthlyCalendar
                selectedMonth={selectedMonth}
                deliveries={monthDeliveries}
                workShift={settings.workShift}
                restDaysOfWeek={settings.restDaysOfWeek || [0]}
                restDateOverrides={settings.restDateOverrides || {}}
                onToggleRestDate={handleToggleRestDate}
                onSaveDelivery={handleSaveDelivery}
                onDeleteDelivery={handleDeleteDelivery}
            />

        </div>
    );
}
