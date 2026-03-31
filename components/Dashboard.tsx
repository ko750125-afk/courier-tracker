"use client";
import { useState } from "react";
import Link from "next/link";
import { Delivery, Settings } from "@/lib/types";
import {
    calcDailyRevenue,
    calcEstimatedEarnings,
    calcNextPayment,
    formatWon,
    formatNumber,
} from "@/lib/calculations";
import SettlementModal from "./SettlementModal";
import { useSound } from "@/lib/hooks/useSound";

interface DashboardProps {
    deliveries: Delivery[];
    settings: Settings;
    todayTotal: number | null;
    onUpdateSettings?: (newSettings: Settings) => void;
}

export default function Dashboard({
    deliveries,
    settings,
    todayTotal,
    onUpdateSettings,
}: DashboardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { play } = useSound(settings.useSoundEffects);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const todayRevenue =
        todayTotal !== null ? calcDailyRevenue(todayTotal, settings.zones, settings) : 0;

    const { estimatedRevenue, dailyAvg } = calcEstimatedEarnings(
        deliveries,
        settings.zones,
        settings.workType,
        year,
        month,
        settings
    );

    const nextPayment = calcNextPayment(
        deliveries,
        settings.zones,
        now,
        settings
    );

    const toggleIncentive = (type: 'linked' | 'solo') => {
        if (!onUpdateSettings) return;
        const newSettings = { ...settings };
        if (type === 'linked') {
            newSettings.useLinkedIncentive = !settings.useLinkedIncentive;
        } else {
            newSettings.useSoloIncentive = !settings.useSoloIncentive;
        }
        onUpdateSettings(newSettings);
        play();
    };

    return (
        <div className="mt-6 space-y-4">
            {/* Main: 오늘 매출 — prominent */}
            <div id="guide-today-revenue" className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">오늘 정산 매출</p>
                <div className="flex items-baseline gap-2 mt-2 select-none">
                    <p className="text-5xl font-black text-white tracking-tight">
                        {todayTotal !== null ? formatWon(todayRevenue) : "₩0"}
                    </p>
                </div>
                <div className="mt-4 flex items-center gap-2 select-none">
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <p className="text-xs text-slate-400 font-medium">
                        {todayTotal !== null && todayTotal > 0
                            ? <span className="text-blue-400 font-bold">{formatNumber(todayTotal)}건</span>
                            : "기록 대기 중"}
                        <span className="ml-1 opacity-60">실적 반영됨</span>
                    </p>
                </div>
            </div>

            {/* Secondary: 2 reference cards */}
            <div className="grid grid-cols-2 gap-3">
                {/* 일 평균 배송 */}
                <div id="guide-daily-avg" className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">일 평균</p>
                    <p className="text-xl font-black text-slate-100 mt-1 tracking-tight select-none">
                        {formatNumber(dailyAvg)}
                        <span className="text-xs font-bold text-slate-500 ml-1">건</span>
                    </p>
                </div>

                {/* 예상 매출 */}
                <div id="guide-monthly-prediction" className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{month}월 예상매출</p>
                    <p className="text-xl font-black text-slate-100 mt-1 tracking-tight select-none">
                        {formatWon(estimatedRevenue)}
                    </p>
                </div>
            </div>

            {/* Subtle: Scheduled Payment (Settlement Period based) */}
            <div className="bg-slate-900/50 border border-slate-800 py-4 px-5 rounded-xl flex items-center justify-between group relative overflow-hidden">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider opacity-80 flex items-center gap-2">
                        <span className="w-1 h-2 bg-blue-500 rounded-full" />
                        정산 예정 ({nextPayment.periodStart.slice(5)}~{nextPayment.periodEnd.slice(5)})
                    </span>
                    <span className="text-sm text-slate-300 font-bold mt-0.5">{nextPayment.paymentLabel}</span>
                    <Link 
                        href="/settlements" 
                        className="text-[10px] text-slate-500 hover:text-blue-400 font-bold mt-2 transition-colors uppercase tracking-widest flex items-center gap-1.5"
                    >
                        전체 내역 보기
                        <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-xl font-black text-blue-400 select-none">
                        {formatWon(nextPayment.amount)}
                    </span>
                    <button 
                        onClick={() => {
                            setIsModalOpen(true);
                            play();
                        }}
                        className="bg-blue-600/10 text-[10px] text-blue-400 font-black px-2.5 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-600/20 hover:text-blue-300 transition-all mt-2 uppercase tracking-widest flex items-center gap-1"
                    >
                        내역 {nextPayment.breakdown.days.length}건
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Coupang Incentives - Positioned below Expected Payout card */}
            {settings.isCoupangMode && (
                <div className="flex gap-3">
                    <button
                        onClick={() => toggleIncentive('linked')}
                        className={`flex-1 py-3 rounded-xl text-[11px] font-black tracking-widest uppercase border transition-all duration-300 ${
                            settings.useLinkedIncentive
                                ? "glass-card bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                                : "bg-white/5 border-white/5 text-slate-600 grayscale opacity-60"
                        }`}
                    >
                        연계 {settings.linkedIncentive && settings.linkedIncentive > 0 ? `(+${settings.linkedIncentive}원)` : ""}
                    </button>
                    <button
                        onClick={() => toggleIncentive('solo')}
                        className={`flex-1 py-3 rounded-xl text-[11px] font-black tracking-widest uppercase border transition-all duration-300 ${
                            settings.useSoloIncentive
                                ? "glass-card bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                : "bg-white/5 border-white/5 text-slate-600 grayscale opacity-60"
                        }`}
                    >
                        단독 {settings.soloIncentive && settings.soloIncentive > 0 ? `(+${settings.soloIncentive}원)` : ""}
                    </button>
                </div>
            )}

            {/* Settlement Modal */}
            <SettlementModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                breakdown={nextPayment.breakdown}
                paymentLabel={nextPayment.paymentLabel}
                periodStart={nextPayment.periodStart}
                periodEnd={nextPayment.periodEnd}
            />
        </div>
    );
}
