"use client";
import { SettlementBreakdown } from "@/lib/types";
import { formatWon, formatNumber } from "@/lib/calculations";

interface SettlementModalProps {
    isOpen: boolean;
    onClose: () => void;
    breakdown: SettlementBreakdown;
    paymentLabel: string;
    periodStart: string;
    periodEnd: string;
}

export default function SettlementModal({
    isOpen,
    onClose,
    breakdown,
    paymentLabel,
    periodStart,
    periodEnd,
}: SettlementModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
            <div 
                className="bg-slate-900 border border-slate-800 w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl rounded-2xl animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">{paymentLabel}</h2>
                        <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">
                            {periodStart} → {periodEnd}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-500 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                    {/* Summary Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">기본 배송비</p>
                            <p className="text-xl font-black text-slate-200 mt-1">{formatWon(breakdown.baseTotal)}</p>
                        </div>
                        <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl">
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">인센티브 합계</p>
                            <p className="text-xl font-black text-blue-400 mt-1">{formatWon(breakdown.incentiveTotal)}</p>
                        </div>
                    </div>

                    {/* Zone Breakdown */}
                    <div className="space-y-4">
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1 h-3 bg-blue-600 rounded-full" />
                            단가 산정 내역
                        </h3>
                        <div className="space-y-3">
                            {breakdown.zoneSummaries?.map((zone) => (
                                <div key={zone.zoneName} className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl transition-colors">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2 py-1 rounded-lg">{zone.zoneName}</span>
                                        <span className="text-lg font-black text-white">{formatWon(zone.subtotal)}</span>
                                    </div>
                                    <div className="flex items-center text-[11px] text-slate-500 font-medium">
                                        <span className="text-slate-400">단가 {formatNumber(zone.basePrice)}원</span>
                                        {zone.incentivePerUnit > 0 && (
                                            <span className="text-blue-500"> + 인센 {formatNumber(zone.incentivePerUnit)}원</span>
                                        )}
                                        <span className="mx-2 opacity-30">|</span>
                                        <span className="text-slate-300">
                                            {formatNumber(zone.totalCount)}건
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Daily Table */}
                    <div className="space-y-4">
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1 h-3 bg-slate-600 rounded-full" />
                            일자별 배송 건수
                        </h3>
                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-900/50 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                                    <tr>
                                        <th className="px-5 py-3">일자</th>
                                        <th className="px-5 py-3 text-right">배송 건수</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {breakdown.days.map((day) => (
                                        <tr key={day.date} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-5 py-2.5 text-slate-400">{day.date.slice(5)}</td>
                                            <td className="px-5 py-2.5 text-right text-slate-200 font-bold">{formatNumber(day.count)}건</td>
                                        </tr>
                                    ))}
                                    {breakdown.days.length === 0 && (
                                        <tr>
                                            <td colSpan={2} className="px-5 py-8 text-center text-slate-600 uppercase tracking-widest">배송 기록 없음</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-950 border-t border-slate-800 rounded-b-2xl">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">최종 정산 합계</span>
                        <div className="text-right">
                            <span className="text-3xl font-black text-white tracking-tighter">
                                {formatWon(breakdown.totalamount)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
