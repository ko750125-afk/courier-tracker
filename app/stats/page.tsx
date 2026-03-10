"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Delivery, Settings, DEFAULT_SETTINGS } from "@/lib/types";
import { loadSettings, loadDeliveries } from "@/lib/store";
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
            <div id="guide-month-selector" className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {months.map((m) => {
                    // Safari compatible date parsing
                    const [y, mm] = m.split("-");
                    const date = new Date(parseInt(y), parseInt(mm) - 1, 1);
                    return (
                        <button
                            key={m}
                            onClick={() => setSelectedMonth(m)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${selectedMonth === m
                                ? "bg-blue-600 text-white"
                                : "bg-gray-900 text-gray-400 border border-gray-800"
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
            <div id="guide-stats-summary" className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-500">월 총 배송</p>
                    <p className="text-xl font-bold text-gray-200 mt-0.5">
                        {formatNumber(totalDeliveries)}건
                    </p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-500">월 총 매출</p>
                    <p className="text-xl font-bold text-gray-200 mt-0.5">
                        {formatWon(totalRevenue)}
                    </p>
                </div>
            </div>

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
                                    className="flex items-center justify-between bg-gray-900/60
                             border border-gray-800/50 rounded-xl px-4 py-2.5"
                                >
                                    <span className="text-gray-400 text-sm">
                                        {(() => {
                                            const safeDate = (d.date || "").replace(/-/g, "/");
                                            return new Date(safeDate + " 00:00:00").toLocaleDateString(
                                                "ko-KR",
                                                { month: "short", day: "numeric", weekday: "short" }
                                            );
                                        })()}
                                    </span>
                                    <div className="text-right">
                                        <span className="text-gray-200 font-semibold text-sm">
                                            {formatNumber(d.total)}건
                                        </span>
                                        <span className="text-gray-500 text-xs ml-2">
                                            {formatWon(revenue)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    {monthDeliveries.length === 0 && (
                        <p className="text-gray-600 text-center py-6 text-sm">
                            이 달의 기록이 없습니다
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

