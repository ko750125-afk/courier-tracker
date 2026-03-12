"use client";

import { useState } from "react";
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
                                    <span className={`text-[12px] font-black tracking-widest leading-none ${isRest ? 'text-gray-600 line-through' : 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'}`}>
                                        {formatNumber(delivery.total)}
                                    </span>
                                )}
                                {isRest && !hasDelivery && (
                                    <span className="text-[9px] font-black text-red-500 leading-none mt-1 tracking-widest drop-shadow-[0_0_5px_rgba(239,68,68,0.4)]">
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
                <div className="mt-6 p-5 bg-white/5 border border-white/10 rounded-2xl animate-in zoom-in-95 fade-in duration-300 relative z-10 overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <span className="text-white font-black text-base tracking-tight">
                            {(() => {
                                const [y, m, d] = selectedDate.split("-");
                                return `${y}년 ${m}월 ${d}일`;
                            })()}
                        </span>
                        <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-white p-2 bg-white/5 rounded-full transition-colors">
                            ✕
                        </button>
                    </div>
                    <div className="flex gap-3 items-center mb-4 relative z-10">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={editTotal}
                            onChange={(e) => setEditTotal(e.target.value.replace(/[^0-9]/g, ""))}
                            placeholder="배송 건수"
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base font-bold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-gray-600"
                        />
                        <button
                            onClick={handleSave}
                            disabled={!editTotal}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black py-3 px-6 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/25"
                        >
                            저장
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 relative z-10">
                        <button
                            onClick={() => {
                                onToggleRestDate(selectedDate);
                                setSelectedDate(null);
                            }}
                            className="bg-white/5 hover:bg-white/10 text-gray-300 font-bold py-3.5 px-4 rounded-xl transition-all border border-white/5 text-sm active:scale-95"
                        >
                            휴무일 토글
                        </button>
                        <button
                            onClick={handleDelete}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3.5 px-4 rounded-xl transition-all border border-red-500/20 text-sm active:scale-95"
                        >
                            내역 삭제
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
