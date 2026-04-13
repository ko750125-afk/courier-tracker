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

    const { estimatedNetRevenue, dailyAvg } = calcEstimatedEarnings(
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
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">오늘 정산 수령액</p>
                <div className="flex items-baseline gap-2 mt-2 select-none">
                    <p className="text-5xl font-black text-white tracking-tight">
                        {todayTotal !== null ? formatWon(Math.round(todayRevenue * (1 - (settings.commissionRate || 0) / 100))) : "₩0"}
                    </p>
                </div>
                <div className="mt-4 flex items-center gap-2 select-none">
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <p className="text-xs text-slate-400 font-medium">
                        {todayTotal !== null && todayTotal > 0
                            ? <span className="text-blue-400 font-bold">{formatNumber(todayTotal)}건</span>
                            : "기록 대기 중"}
                        <span className="ml-1 opacity-60">수수료 제외됨</span>
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
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{month}월 예상수령액</p>
                    <p className="text-xl font-black text-slate-100 mt-1 tracking-tight select-none">
                        {formatWon(estimatedNetRevenue)}
                    </p>
                </div>
            </div>

            {/* Subtle: Scheduled Payment (Settlement Period based) */}
            <div className="bg-slate-900/50 border border-slate-800 py-5 px-5 rounded-3xl flex items-center justify-between group relative overflow-hidden transition-all hover:bg-slate-800/60">
                {/* Glow Effect */}
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full" />
                
                <div className="flex flex-col relative z-10">
                    <span className="text-[10px] text-blue-500/80 font-black uppercase tracking-[0.15em] flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        현재 정산 진행 중
                    </span>
                    <span className="text-xs text-slate-500 font-bold mb-1">
                        ({nextPayment.periodStart.slice(5).replace('-', '.')} — {nextPayment.periodEnd.slice(5).replace('-', '.')})
                    </span>
                    <span className="text-sm text-slate-200 font-black tracking-tight">{nextPayment.paymentLabel}</span>
                    <Link 
                        href="/settlements" 
                        className="text-[10px] text-slate-500 hover:text-blue-400 font-bold mt-4 transition-colors uppercase tracking-[0.2em] flex items-center gap-1.5"
                    >
                        정산 히스토리
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
                <div className="flex flex-col items-end relative z-10">
                    <div className="text-right mb-2">
                        <span className="text-2xl font-black text-blue-400 tracking-tight block">
                            {formatWon(nextPayment.amount)}
                        </span>
                        <span className="text-[11px] font-black text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-md mt-1 inline-block">
                            총 {formatNumber(nextPayment.breakdown.totalCount)}건
                        </span>
                    </div>
                    <button 
                        onClick={() => {
                            setIsModalOpen(true);
                            play();
                        }}
                        className="bg-blue-600/10 text-[10px] text-blue-400 font-black px-3 py-2 rounded-xl border border-blue-500/20 hover:bg-blue-600/20 hover:scale-105 transition-all uppercase tracking-widest flex items-center gap-1.5"
                    >
                        상세 내역
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
