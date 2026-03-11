"use client";
import { Delivery, Settings } from "@/lib/types";
import {
    calcDailyRevenue,
    calcEstimatedEarnings,
    calcNextPayment,
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

    const nextPayment = calcNextPayment(
        deliveries,
        settings.zones,
        now,
        settings.settlementDay || 25,
        settings.payDay || 20
    );

    return (
        <div className="mt-5 space-y-4">
            {/* Main: 오늘 매출 — prominent */}
            <div id="guide-today-revenue" className="bg-gray-900/80 backdrop-blur-md border border-gray-800/60 rounded-2xl p-5 shadow-xl shadow-black/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
                <p className="text-sm text-gray-400 font-medium relative">오늘 매출</p>
                <p className="text-4xl font-extrabold mt-1 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400 relative">
                    {todayTotal !== null ? formatWon(todayRevenue) : "₩0"}
                </p>
                <p className="text-sm text-gray-500 mt-2 relative font-medium">
                    {todayTotal !== null && todayTotal > 0
                        ? <span className="text-blue-400">{formatNumber(todayTotal)}건</span>
                        : "배송 기록 없음"}
                    {todayTotal !== null && todayTotal > 0 && " 배송"}
                </p>
            </div>

            {/* Secondary: 2 reference cards */}
            <div className="grid grid-cols-2 gap-3">
                {/* 일 평균 배송 */}
                <div id="guide-daily-avg" className="bg-gray-900/80 backdrop-blur-md border border-gray-800/60 rounded-xl p-3.5 shadow-lg shadow-black/20">
                    <p className="text-xs text-gray-400 font-medium">일 평균</p>
                    <p className="text-xl font-bold text-gray-100 mt-1 tracking-tight">
                        {formatNumber(dailyAvg)}
                        <span className="text-sm font-medium text-gray-500 ml-1">건</span>
                    </p>
                </div>

                {/* 예상 매출 */}
                <div id="guide-monthly-prediction" className="bg-gray-900/80 backdrop-blur-md border border-gray-800/60 rounded-xl p-3.5 shadow-lg shadow-black/20">
                    <p className="text-xs text-gray-400 font-medium">{month}월 예상매출</p>
                    <p className="text-xl font-bold mt-1 truncate tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
                        {formatWon(estimatedRevenue)}
                    </p>
                </div>
            </div>

            {/* Subtle: Scheduled Payment (Settlement Period based) */}
            <div className="mx-1 px-4 py-2.5 bg-gray-900/40 border border-gray-800/40 rounded-xl flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 font-medium">정산 기간 ({nextPayment.periodStart.slice(5)}~{nextPayment.periodEnd.slice(5)})</span>
                    <span className="text-xs text-gray-400 font-bold">{nextPayment.paymentLabel}</span>
                </div>
                <span className="text-sm font-extrabold text-blue-400/80">
                    {formatWon(nextPayment.amount)}
                </span>
            </div>
        </div>
    );
}
