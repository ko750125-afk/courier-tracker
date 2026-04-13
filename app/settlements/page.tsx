"use client";
import { useState, useEffect, useCallback } from "react";
import { Delivery, Settings, DEFAULT_SETTINGS, ReceivedSettlementsMap } from "@/lib/types";
import {
    loadSettings,
    loadDeliveries,
    loadReceivedSettlements,
    saveSettlementReceived,
} from "@/lib/store";
import { listRecentSettlements, formatWon, formatNumber } from "@/lib/calculations";
import SettlementModal from "@/components/SettlementModal";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";

export default function SettlementsPage() {
    const { user, loading: authLoading } = useAuth();
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSettlement, setSelectedSettlement] = useState<any>(null);
    // 수령 확인 상태 맵: key = periodStart, value = 수령 완료 여부
    const [receivedMap, setReceivedMap] = useState<ReceivedSettlementsMap>({});
    // 저장 중인 항목 ID (로딩 스피너 표시용)
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // 데이터 로딩: 설정, 배송 기록, 수령 확인 상태 동시 로드
    const loadData = useCallback(async () => {
        try {
            const [s, d, r] = await Promise.all([
                loadSettings(user?.uid),
                loadDeliveries(user?.uid),
                loadReceivedSettlements(user?.uid),
            ]);
            setSettings(s);
            setDeliveries(d);
            setReceivedMap(r);
        } catch (err) {
            console.error("Failed to load:", err);
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    if (loading || authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">로딩 중...</p>
                </div>
            </div>
        );
    }

    useEffect(() => {
        loadData();
    }, [loadData]);

    // 수령 확인 토글 핸들러
    const handleToggleReceived = async (e: React.MouseEvent, periodStart: string) => {
        e.stopPropagation(); // 카드 클릭(모달)과 이벤트 충돌 방지
        const current = !!receivedMap[periodStart];
        const next = !current;

        // 낙관적 UI 업데이트 (클릭 즉시 화면 반영)
        setReceivedMap(prev => ({ ...prev, [periodStart]: next }));
        setTogglingId(periodStart);

        try {
            await saveSettlementReceived(periodStart, next, user?.uid);
        } catch (e) {
            // 저장 실패 시 이전 상태로 롤백
            setReceivedMap(prev => ({ ...prev, [periodStart]: current }));
            console.error("수령 확인 저장 실패:", e);
        } finally {
            setTogglingId(null);
        }
    };

    // 로딩 스피너
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

    // 최근 12개월간의 정산 목록 계산
    const settlements = listRecentSettlements(deliveries, settings.zones, settings, 12);

    return (
        <div className="max-w-xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 헤더 */}
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

            {/* 안내 배너 */}
            <div className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors" />
                <div className="relative border border-blue-500/20 rounded-2xl p-5 flex gap-4 items-start">
                    <div className="bg-blue-500/20 p-2 rounded-lg shrink-0">
                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-xs text-slate-300 font-medium leading-[1.6] select-none">
                        대표님, <span className="text-blue-400 font-bold">최근 12개월간의 정산 주기</span>가 자동으로 기록됩니다.
                        설정하신 정산일({settings.settlementDay}일) 기준으로 데이터가 안전하게 보관 중입니다.{" "}
                        <span className="text-emerald-400 font-bold">✓ 수령 확인 버튼으로 수령 여부를 직접 체크하세요.</span>
                    </p>
                </div>
            </div>

            {/* 정산 목록 */}
            <div className="space-y-4">
                {settlements.map((s, idx) => {
                    const isReceived = !!receivedMap[s.periodStart];
                    const isCurrentPeriod = idx === 0; // 첫 번째 = 현재 진행 중인 기간
                    const isSaving = togglingId === s.periodStart;

                    return (
                        <div key={s.periodStart} className="relative">
                            {/* 정산 카드 (클릭 시 상세 모달 오픈) */}
                            <button
                                onClick={() => setSelectedSettlement(s)}
                                className={`w-full relative overflow-hidden transition-all active:scale-[0.98] group rounded-[2rem] text-left border ${
                                    isCurrentPeriod
                                        ? "bg-blue-600/10 border-blue-500/30 hover:bg-blue-600/15"
                                        : isReceived
                                        ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10"
                                        : "bg-slate-900/40 border-slate-800 hover:bg-slate-800/40"
                                }`}
                            >
                                {/* 현재 기간 글로우 */}
                                {isCurrentPeriod && (
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] -z-10" />
                                )}
                                {/* 수령 완료 글로우 */}
                                {isReceived && !isCurrentPeriod && (
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] -z-10" />
                                )}

                                <div className="p-6 flex items-center justify-between gap-4">
                                    {/* 왼쪽: 뱃지, 날짜 */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {/* 상태 뱃지 */}
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                isCurrentPeriod
                                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                                    : isReceived
                                                    ? "bg-emerald-600/80 text-white"
                                                    : "bg-slate-800 text-slate-500"
                                            }`}>
                                                {isCurrentPeriod ? "현재 진행 중" : isReceived ? "수령 완료 ✓" : "정산 완료"}
                                            </span>
                                            {/* 최근 완료 뱃지 (수령 미확인 시) */}
                                            {idx === 1 && !isReceived && (
                                                <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md animate-pulse">
                                                    수령 확인 필요
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-xl font-black text-white tracking-tight">{s.paymentLabel}</h2>
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-xs font-bold">
                                                {s.periodStart.slice(2).replace(/-/g, '.')} — {s.periodEnd.slice(2).replace(/-/g, '.')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 오른쪽: 금액, 건수 */}
                                    <div className="text-right space-y-1">
                                        <p className={`text-2xl font-black tracking-tight ${
                                            isCurrentPeriod ? "text-blue-400" : isReceived ? "text-emerald-400" : "text-slate-300"
                                        }`}>
                                            {formatWon(s.amount)}
                                        </p>
                                        <div className="flex items-center gap-2 justify-end">
                                            <span className="text-[11px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                                                총 {formatNumber(s.breakdown.totalCount)}건
                                            </span>
                                            <div className="flex items-center gap-1 text-slate-500 group-hover:text-blue-400 transition-colors">
                                                <span className="text-[10px] font-black uppercase tracking-widest">내역 확인</span>
                                                <svg className="w-3 h-3 translate-y-[0.5px] transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>

                            {/* ─── 수령 확인 버튼 ───
                                현재 진행 중인 정산 기간은 숨김 (아직 수령 불가)
                                카드 우하단에 겹쳐서 표시 */}
                            {!isCurrentPeriod && (
                                <button
                                    onClick={(e) => handleToggleReceived(e, s.periodStart)}
                                    disabled={isSaving}
                                    className={`absolute bottom-4 right-6 transition-all duration-300 text-[10px] font-black px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                                        isSaving
                                            ? "opacity-50 cursor-not-allowed bg-slate-800 border-slate-700 text-slate-500"
                                            : isReceived
                                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 active:scale-95"
                                            : "bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white active:scale-95"
                                    }`}
                                >
                                    {isSaving ? (
                                        // 저장 중 스피너
                                        <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                                    ) : isReceived ? (
                                        // 수령 완료 상태
                                        <>
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                            수령 완료
                                        </>
                                    ) : (
                                        // 미수령 상태
                                        <>
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            수령 확인
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* 데이터 없을 때 빈 상태 */}
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

            {/* 정산 상세 모달 */}
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
