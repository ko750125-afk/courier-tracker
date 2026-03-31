"use client";
import { useState, useEffect, useCallback } from "react";
import { Delivery, Settings, DEFAULT_SETTINGS } from "@/lib/types";
import { loadSettings, loadDeliveries } from "@/lib/store";
import { listRecentSettlements, formatWon } from "@/lib/calculations";
import SettlementModal from "@/components/SettlementModal";
import Link from "next/link";

export default function SettlementsPage() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSettlement, setSelectedSettlement] = useState<any>(null);

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
        loadData();
    }, [loadData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-full animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    const settlements = listRecentSettlements(deliveries, settings.zones, settings, 12);

    return (
        <div className="max-w-xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex items-end justify-between px-1">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
                        배송비 <span className="text-blue-500 underline decoration-blue-500/30 underline-offset-8">정산 기록</span>
                    </h1>
                    <p className="text-sm text-slate-500 font-bold tracking-wide">누락 없이 보관되는 과거 정산 데이터</p>
                </div>
                <Link 
                    href="/" 
                    className="mb-1 group flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-full text-xs font-black text-slate-400 hover:text-white hover:border-slate-700 transition-all active:scale-95"
                >
                    <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    홈으로
                </Link>
            </div>

            {/* Info Banner */}
            <div className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors" />
                <div className="relative border border-blue-500/20 rounded-2xl p-5 flex gap-4 items-start">
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-xs text-slate-300 font-medium leading-[1.6] select-none">
                        대표님, <span className="text-blue-400 font-bold">최근 12개월간의 정산 주기</span>가 자동으로 기록됩니다. 
                        설정하신 정산일({settings.settlementDay}일) 기준 데이터가 사라지지 않고 안전하게 보관 중입니다. 
                    </p>
                </div>
            </div>

            {/* History List */}
            <div className="space-y-4">
                {settlements.map((s, idx) => (
                    <button
                        key={s.periodStart}
                        onClick={() => setSelectedSettlement(s)}
                        className={`w-full relative overflow-hidden transition-all active:scale-[0.98] group rounded-[2rem] text-left border ${
                            idx === 0 
                            ? "bg-blue-600/10 border-blue-500/30 hover:bg-blue-600/15" 
                            : "bg-slate-900/40 border-slate-800 hover:bg-slate-800/40"
                        }`}
                    >
                        {/* Glow Effect for Active */}
                        {idx === 0 && (
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] -z-10" />
                        )}

                        <div className="p-6 flex items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                        idx === 0 ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-slate-800 text-slate-500"
                                    }`}>
                                        {idx === 0 ? "현재 진행 중" : "정산 완료"}
                                    </span>
                                    {idx === 1 && (
                                        <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md animate-pulse">
                                            최근 완료
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-xl font-black text-white tracking-tight">{s.paymentLabel}</h2>
                                <div className="flex items-center gap-2 text-slate-500">
                                    <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-xs font-bold">{s.periodStart.slice(2).replace(/-/g, '.')} — {s.periodEnd.slice(2).replace(/-/g, '.')}</span>
                                </div>
                            </div>

                            <div className="text-right space-y-1">
                                <p className={`text-2xl font-black tracking-tight ${idx === 0 ? "text-blue-400" : "text-slate-300"}`}>
                                    {formatWon(s.amount)}
                                </p>
                                <div className="flex items-center gap-1 justify-end text-slate-500 group-hover:text-blue-400 transition-colors">
                                    <span className="text-[10px] font-black uppercase tracking-widest">내역 확인</span>
                                    <svg className="w-3 h-3 translate-y-[0.5px] transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </button>
                ))}

                {settlements.length === 0 && (
                    <div className="py-24 text-center space-y-4 bg-slate-900/30 rounded-[3rem] border border-dashed border-slate-800">
                        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto opacity-50">
                            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <p className="text-slate-500 text-sm font-bold tracking-tight">아직 기록된 정산 내역이 없습니다.</p>
                    </div>
                )}
            </div>

            {/* Modal remains same but integrated with state */}
            {selectedSettlement && (
                <SettlementModal
                    isOpen={!!selectedSettlement}
                    onClose={() => setSelectedSettlement(null)}
                    breakdown={selectedSettlement.breakdown}
                    paymentLabel={selectedSettlement.paymentLabel}
                    periodStart={selectedSettlement.periodStart}
                    periodEnd={selectedSettlement.periodEnd}
                />
            )}
        </div>
    );
}
