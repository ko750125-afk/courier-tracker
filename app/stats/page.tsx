"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Delivery, Settings, DEFAULT_SETTINGS } from "@/lib/types";
import { loadSettings, loadDeliveries, saveSettings } from "@/lib/store";
import MonthlyCalendar from "@/components/MonthlyCalendar";
import {
    calcMonthlyStats,
    calcDailyRevenue,
    formatWon,
    formatNumber,
} from "@/lib/calculations";

// Dynamically import ChartView with no SSR to prevent hydration/rendering crashes
const ChartView = dynamic(() => import("@/components/ChartView"), {
    ssr: false,
    loading: () => <div className="h-56 bg-gray-900 animate-pulse rounded-xl" />
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

    const [year, month] = selectedMonth.split("-").map(Number);
    const { totalDeliveries, totalRevenue } = calcMonthlyStats(
        deliveries,
        settings.zones,
        year,
        month
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
        <div>
            <h1 className="text-xl font-bold text-gray-100 mb-5">통계</h1>

            {/* Month Selector */}
            <div id="guide-month-selector" className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {months.map((m) => {
                    // Safari compatible date parsing
                    const [y, mm] = m.split("-");
                    const date = new Date(parseInt(y), parseInt(mm) - 1, 1);
                    return (
                        <button
                            key={m}
                            onClick={() => setSelectedMonth(m)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 active:scale-95 ${selectedMonth === m
                                ? "bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-lg shadow-blue-500/20 border border-transparent"
                                : "bg-gray-900/50 hover:bg-gray-800 text-gray-400 border border-gray-800/80"
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

            {/* Monthly Summary */}
            <div id="guide-stats-summary" className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800/60 rounded-2xl p-4 shadow-xl shadow-black/20 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    <p className="text-xs text-blue-300/80 font-medium mb-1 relative z-10">월 총 배송</p>
                    <p className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight relative z-10">
                        {formatNumber(totalDeliveries)}건
                    </p>
                </div>
                <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800/60 rounded-2xl p-4 shadow-xl shadow-black/20 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    <p className="text-xs text-indigo-300/80 font-medium mb-1 relative z-10">월 총 매출</p>
                    <p className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300 tracking-tight relative z-10">
                        {formatWon(totalRevenue)}
                    </p>
                </div>
            </div>

            {/* Monthly Calendar */}
            <MonthlyCalendar
                selectedMonth={selectedMonth}
                deliveries={monthDeliveries}
                restDaysOfWeek={settings.restDaysOfWeek || [0]}
                restDateOverrides={settings.restDateOverrides || {}}
                onToggleRestDate={handleToggleRestDate}
            />

            {/* Chart */}
            <ChartView deliveries={monthDeliveries} />

            {/* Day-by-day List */}
            <div className="mt-5">
                <h3 className="text-base font-bold text-gray-200 mb-3">일별 기록</h3>
                <div className="space-y-1.5">
                    {monthDeliveries
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((d) => {
                            const revenue = calcDailyRevenue(d.total, settings.zones);
                            return (
                                <div
                                    key={d.date}
                                    className="flex items-center justify-between bg-gray-900/40 hover:bg-gray-800/80
                             border border-gray-800/50 rounded-xl px-4 py-3 transition-colors duration-200"
                                >
                                    <span className="text-gray-400 text-sm font-medium">
                                        {(() => {
                                            const safeDate = (d.date || "").replace(/-/g, "/");
                                            return new Date(safeDate + " 00:00:00").toLocaleDateString(
                                                "ko-KR",
                                                { month: "short", day: "numeric", weekday: "short" }
                                            );
                                        })()}
                                    </span>
                                    <div className="text-right">
                                        <span className="text-gray-200 font-bold text-sm tracking-tight">
                                            {formatNumber(d.total)}건
                                        </span>
                                        <span className="text-gray-500 text-xs ml-2 font-medium">
                                            {formatWon(revenue)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    {monthDeliveries.length === 0 && (
                        <div className="text-center py-10 bg-gray-900/20 rounded-2xl border border-gray-800/30 border-dashed">
                            <svg className="w-8 h-8 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-gray-500 text-sm font-medium">
                                이 달의 배송 기록이 없습니다
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

