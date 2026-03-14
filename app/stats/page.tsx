"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Delivery, Settings, DEFAULT_SETTINGS } from "@/lib/types";
import { loadSettings, loadDeliveries, saveSettings, saveDelivery, deleteDelivery } from "@/lib/store";
import MonthlyCalendar from "@/components/MonthlyCalendar";
import {
    calcMonthlyStats,
    calcDailyRevenue,
    formatWon,
    formatNumber,
} from "@/lib/calculations";

const ChartView = dynamic(() => import("@/components/ChartView"), {
    ssr: false,
    loading: () => <div className="h-48 bg-gray-900 animate-pulse rounded-xl" />,
});

export default function StatsPage() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState("");

    const loadData = useCallback(async () => {
        try {
            const [s, d] = await Promise.all([loadSettings(), loadDeliveries()]);
            setSettings(s);
            setDeliveries(d);
        } catch (err) {
            console.error("Failed to load:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setIsMounted(true);
        // Safely initialize selectedMonth locally
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        setSelectedMonth(`${y}-${m}`);
        loadData();
    }, [loadData]);

    if (!isMounted || loading || !selectedMonth) {
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
            await saveSettings(newSettings);
        } catch (err) {
            console.error("Failed to save rest date:", err);
            // 에러 시 롤백 (생략 가능)
        }
    };

    const handleSaveDelivery = async (dateStr: string, total: number) => {
        try {
            await saveDelivery(dateStr, total);
            await loadData();
        } catch (err) {
            console.error("Failed to save delivery:", err);
        }
    };

    const handleDeleteDelivery = async (dateStr: string) => {
        if (confirm("해당 날짜의 배송 기록을 삭제하시겠습니까?")) {
            try {
                await deleteDelivery(dateStr);
                await loadData();
            } catch (err) {
                console.error("Failed to delete delivery:", err);
            }
        }
    };

    const [year, month] = selectedMonth.split("-").map(Number);
    const { totalDeliveries, totalRevenue } = calcMonthlyStats(
        deliveries,
        settings.zones,
        year,
        month,
        settings
    );

    const monthDeliveries = (deliveries || []).filter((d) =>
        d && d.date && d.date.startsWith(selectedMonth)
    );

    const months = [...new Set((deliveries || []).map((d) => (d.date || "").slice(0, 7)))].sort(
        (a, b) => b.localeCompare(a)
    );

    // If current selected month is not in data, but data exists, ensure current month is still accessible
    if (months.length > 0 && !months.includes(selectedMonth)) {
        // Just adding it to the list if we want to show it even if empty
        if (!months.includes(selectedMonth)) {
            months.unshift(selectedMonth);
            months.sort((a, b) => b.localeCompare(a));
        }
    }

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

            <div id="guide-stats-summary" className="grid grid-cols-2 gap-4 select-none">
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">월간 배송건수</p>
                    <div className="flex items-baseline gap-1">
                        <p className="text-3xl font-black text-white">
                            {formatNumber(totalDeliveries)}
                        </p>
                        <span className="text-xs font-bold text-slate-500">건</span>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">월간 합산수익</p>
                    <p className="text-2xl font-black text-blue-400">
                        {formatWon(totalRevenue)}
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-slate-900/50 border border-slate-800 p-2 rounded-2xl overflow-hidden">
                <ChartView deliveries={deliveries} />
            </div>
            <MonthlyCalendar
                selectedMonth={selectedMonth}
                deliveries={monthDeliveries}
                restDaysOfWeek={settings.restDaysOfWeek || [0]}
                restDateOverrides={settings.restDateOverrides || {}}
                onToggleRestDate={handleToggleRestDate}
                onSaveDelivery={handleSaveDelivery}
                onDeleteDelivery={handleDeleteDelivery}
            />

        </div>
    );
}

