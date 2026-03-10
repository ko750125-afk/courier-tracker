"use client";
import { Delivery, Settings } from "@/lib/types";
import {
    calcDailyRevenue,
    calcEstimatedEarnings,
    formatWon,
    formatNumber,
} from "@/lib/calculations";

interface DashboardProps {
    deliveries: Delivery[];
    settings: Settings;
    todayTotal: number | null;
}

export default function Dashboard({
    deliveries,
    settings,
    todayTotal,
}: DashboardProps) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const todayRevenue =
        todayTotal !== null ? calcDailyRevenue(todayTotal, settings.zones) : 0;

    const { estimatedRevenue, dailyAvg } = calcEstimatedEarnings(
        deliveries,
        settings.zones,
        settings.workType,
        year,
        month,
        settings.customWorkDays
    );

    return (
        <div className="mt-5 space-y-4">
            {/* Main: 오늘 매출 — prominent */}
            <div id="guide-today-revenue" className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <p className="text-sm text-gray-500 font-medium">오늘 매출</p>
                <p className="text-4xl font-extrabold text-white mt-1 tracking-tight">
                    {todayTotal !== null ? formatWon(todayRevenue) : "₩0"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                    {todayTotal !== null && todayTotal > 0
                        ? `${formatNumber(todayTotal)}건 배송`
                        : "배송 기록 없음"}
                </p>
            </div>

            {/* Secondary: 2 reference cards */}
            <div className="grid grid-cols-2 gap-3">
                {/* 일 평균 배송 */}
                <div id="guide-daily-avg" className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                    <p className="text-[11px] text-gray-500 font-medium">일 평균</p>
                    <p className="text-lg font-bold text-gray-200 mt-0.5">
                        {formatNumber(dailyAvg)}
                        <span className="text-sm font-normal text-gray-500">건</span>
                    </p>
                </div>

                {/* 예상 매출 */}
                <div id="guide-monthly-prediction" className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                    <p className="text-[11px] text-gray-500 font-medium">{month}월 예상매출</p>
                    <p className="text-lg font-bold text-gray-200 mt-0.5 truncate">
                        {formatWon(estimatedRevenue)}
                    </p>
                </div>
            </div>
        </div>
    );
}
