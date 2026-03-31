"use client";

import { useState, useRef, useEffect } from "react";
import { Delivery } from "@/lib/types";
import { formatNumber } from "@/lib/calculations";

interface MonthlyCalendarProps {
    selectedMonth: string; // YYYY-MM
    deliveries: Delivery[];
    restDaysOfWeek: number[]; // 0~6
    restDateOverrides: Record<string, boolean>; // YYYY-MM-DD -> true(쉬는날)/false(일하는날)
    onToggleRestDate: (dateStr: string) => void;
    onSaveDelivery: (dateStr: string, total: number) => Promise<void>;
    onDeleteDelivery: (dateStr: string) => Promise<void>;
}

export default function MonthlyCalendar({
    selectedMonth,
    deliveries,
    restDaysOfWeek,
    restDateOverrides,
    onToggleRestDate,
    onSaveDelivery,
    onDeleteDelivery,
}: MonthlyCalendarProps) {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [editTotal, setEditTotal] = useState<string>("");
    const panelRef = useRef<HTMLDivElement>(null);

    // 선택된 날짜 패널로 자동 스크롤 (모바일 가시성 개선)
    useEffect(() => {
        if (selectedDate && panelRef.current) {
            setTimeout(() => {
                panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [selectedDate]);

    if (!selectedMonth) return null;

    const [year, month] = selectedMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const startDayOfWeek = startDate.getDay(); // 0(Sun) ~ 6(Sat)
    const daysInMonth = new Date(year, month, 0).getDate();

    // 오늘 날짜 계산
    const todayDate = new Date();
    const todayYear = todayDate.getFullYear();
    const todayMonth = todayDate.getMonth() + 1;
    const todayDay = todayDate.getDate();

    const daysOfWeekLabels = ["일", "월", "화", "수", "목", "금", "토"];

    // 빈 날짜 배열 (시작일 이전)
    const emptyCells = Array.from({ length: startDayOfWeek }).fill(null);
    // 실제 날짜 배열
    const days = Array.from({ length: daysInMonth }).map((_, i) => i + 1);

    const isRestDay = (dateStr: string, dayOfWeek: number) => {
        // 수동 설정이 있으면 우선
        if (restDateOverrides && restDateOverrides[dateStr] !== undefined) {
            return restDateOverrides[dateStr];
        }
        // 없으면 정기 휴일 여부
        return (restDaysOfWeek || []).includes(dayOfWeek);
    };

    const handleDateClick = (dateStr: string) => {
        setSelectedDate(dateStr);
        const delivery = deliveries.find(d => d.date === dateStr);
        setEditTotal(delivery ? String(delivery.total) : "");
    };

    const handleSave = async () => {
        if (!selectedDate) return;
        const total = parseInt(editTotal || "0", 10);
        if (isNaN(total) || total < 0) return;
        await onSaveDelivery(selectedDate, total);
        setSelectedDate(null);
    };

    const handleDelete = async () => {
        if (!selectedDate) return;
        await onDeleteDelivery(selectedDate);
        setSelectedDate(null);
    };

    return (
        <div className="glass-card p-6 mb-8 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500" />
            <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-blue-400 tracking-tight">월 달력</h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-60">Tap to edit or set rest day</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 mb-3">
                {daysOfWeekLabels.map((label, idx) => (
                    <div
                        key={label}
                        className={`text-center text-xs font-semibold py-1 ${idx === 0 ? "text-red-400" : idx === 6 ? "text-blue-400" : "text-gray-400"
                            }`}
                    >
                        {label}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2 relative z-10">
                {emptyCells.map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[70px] rounded-2xl bg-white/5 border border-white/5 opacity-30"></div>
                ))}

                {days.map((day) => {
                    const currentDayOfWeek = (startDayOfWeek + day - 1) % 7;
                    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const delivery = deliveries.find((d) => d.date === dateStr);
                    const isRest = isRestDay(dateStr, currentDayOfWeek);
                    const hasDelivery = !!delivery;
                    const isToday = year === todayYear && month === todayMonth && day === todayDay;
                    const isSelected = selectedDate === dateStr;

                    return (
                        <div
                            key={day}
                            onClick={() => handleDateClick(dateStr)}
                            className={`relative min-h-[70px] rounded-2xl flex flex-col items-center justify-between py-2 cursor-pointer transition-all duration-300 active:scale-90 border shadow-md group/day ${isRest
                                ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/20"
                                : hasDelivery
                                    ? "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 shadow-blue-500/5"
                                    : "bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10"
                                } ${isToday ? "ring-2 ring-blue-500/80 bg-blue-500/20 border-blue-400/50 scale-[1.02] shadow-[0_0_20px_rgba(59,130,246,0.3)]" : ""} ${isSelected ? "ring-2 ring-white scale-105 z-20 shadow-2xl" : ""}`}
                        >
                            <span
                                className={`text-xs font-black tracking-tighter ${isRest
                                    ? "text-red-400"
                                    : currentDayOfWeek === 0
                                        ? "text-red-500"
                                        : currentDayOfWeek === 6
                                            ? "text-blue-400"
                                            : "text-gray-400"
                                    } ${isSelected ? "text-white" : ""}`}
                            >
                                {day}
                            </span>
                            <div className="flex flex-col items-center justify-end h-full w-full">
                                {hasDelivery && (
                                    <span className={`text-[12px] font-black tracking-widest leading-none select-none ${isRest ? 'text-gray-600 line-through' : 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'}`}>
                                        {formatNumber(delivery.total)}
                                    </span>
                                )}
                                {isRest && !hasDelivery && (
                                    <span className="text-[9px] font-black text-red-500 leading-none mt-1 tracking-widest drop-shadow-[0_0_5px_rgba(239,68,68,0.4)] select-none">
                                        REST
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-700/60">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.6)]"></div>
                    <span className="text-[10px] font-bold text-blue-200">배송일</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.6)]"></div>
                    <span className="text-[10px] font-bold text-red-200">휴무일</span>
                </div>
            </div>

            {/* Action Panel for Selected Date */}
            {selectedDate && (
                <div 
                    ref={panelRef}
                    className="mt-6 p-6 bg-slate-900 border border-blue-500/30 rounded-3xl animate-in zoom-in-95 fade-in duration-300 relative z-10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent pointer-events-none" />
                    <div className="flex items-center justify-between mb-5 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                            <span className="text-white font-black text-lg tracking-tight">
                                {(() => {
                                    const [y, m, d] = selectedDate.split("-");
                                    return `${y}년 ${m}월 ${d}일 실적`;
                                })()}
                            </span>
                        </div>
                        <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-white p-2.5 bg-white/5 rounded-full transition-colors active:scale-90">
                            ✕
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-5 relative z-10">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                inputMode="numeric"
                                value={editTotal}
                                onChange={(e) => setEditTotal(e.target.value.replace(/[^0-9]/g, ""))}
                                placeholder="배송 건수 입력"
                                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-white text-xl font-black focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-slate-700 shadow-inner"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">건</div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={!editTotal}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black py-4 px-10 rounded-2xl transition-all active:scale-95 shadow-xl shadow-blue-500/30 text-lg flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            저장하기
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 relative z-10">
                        <button
                            onClick={() => {
                                onToggleRestDate(selectedDate);
                                setSelectedDate(null);
                            }}
                            className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-4 px-4 rounded-xl transition-all border border-white/5 text-sm active:scale-95 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                            휴무일 토글
                        </button>
                        <button
                            onClick={handleDelete}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-4 px-4 rounded-xl transition-all border border-red-500/20 text-sm active:scale-95 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            내역 삭제
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
