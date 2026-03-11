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
        <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/80 rounded-3xl p-5 shadow-2xl shadow-black/40 mb-8 ring-1 ring-white/5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-200 tracking-tight">월 달력</h3>
                <span className="text-[10px] text-gray-500">날짜를 터치해 기록/휴무 수정</span>
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

            <div className="grid grid-cols-7 gap-1.5">
                {emptyCells.map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[64px] rounded-2xl bg-gray-900/30"></div>
                ))}

                {days.map((day) => {
                    const currentDayOfWeek = (startDayOfWeek + day - 1) % 7;
                    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const delivery = deliveries.find((d) => d.date === dateStr);
                    const isRest = isRestDay(dateStr, currentDayOfWeek);
                    const hasDelivery = !!delivery;
                    const isToday = year === todayYear && month === todayMonth && day === todayDay;

                    return (
                        <div
                            key={day}
                            onClick={() => handleDateClick(dateStr)}
                            className={`relative min-h-[64px] rounded-2xl flex flex-col items-center justify-between py-2 cursor-pointer transition-all duration-200 active:scale-95 border ${isRest
                                ? "bg-red-500/20 hover:bg-red-500/30 border-red-500/40 shadow-[inset_0_0_12px_rgba(239,68,68,0.15)]"
                                : hasDelivery
                                    ? "bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/40 shadow-[inset_0_0_12px_rgba(59,130,246,0.2)]"
                                    : "bg-gray-800/30 hover:bg-gray-800/60 border-gray-700/30 hover:border-gray-600/50"
                                } ${isToday ? "ring-2 ring-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)] z-10" : ""} ${selectedDate === dateStr ? "ring-2 ring-white z-10 transform scale-105" : ""}`}
                        >
                            <span
                                className={`text-xs ${isRest
                                    ? "text-red-300 font-bold"
                                    : currentDayOfWeek === 0
                                        ? "text-red-400 font-medium"
                                        : currentDayOfWeek === 6
                                            ? "text-blue-400 font-medium"
                                            : "text-gray-300 font-medium"
                                    }`}
                            >
                                {day}
                            </span>
                            <div className="flex flex-col items-center justify-end h-full w-full">
                                {hasDelivery && (
                                    <span className={`text-[11px] font-extrabold tracking-tight leading-none ${isRest ? 'text-gray-400 line-through' : 'text-blue-200 drop-shadow-[0_0_4px_rgba(59,130,246,0.6)]'}`}>
                                        {formatNumber(delivery.total)}
                                    </span>
                                )}
                                {isRest && !hasDelivery && (
                                    <span className="text-[10px] font-black text-red-400 leading-none mt-1 tracking-widest drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">
                                        휴무
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
                <div className="mt-4 p-4 bg-gray-950/80 border border-gray-700/80 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-200 font-bold text-sm">
                            {(() => {
                                const [y, m, d] = selectedDate.split("-");
                                return `${y}년 ${m}월 ${d}일`;
                            })()}
                        </span>
                        <button onClick={() => setSelectedDate(null)} className="text-gray-500 hover:text-white p-1">
                            ✕
                        </button>
                    </div>
                    <div className="flex gap-2 items-center mb-3">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={editTotal}
                            onChange={(e) => setEditTotal(e.target.value.replace(/[^0-9]/g, ""))}
                            placeholder="배송 건수"
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                        />
                        <button
                            onClick={handleSave}
                            disabled={!editTotal}
                            className="shrink-0 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-2 px-4 rounded-xl transition-colors text-sm"
                        >
                            저장
                        </button>
                        <button
                            onClick={handleDelete}
                            className="shrink-0 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2 px-3 rounded-xl transition-colors border border-red-500/20 text-sm"
                        >
                            삭제
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            onToggleRestDate(selectedDate);
                            setSelectedDate(null);
                        }}
                        className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2 px-4 rounded-xl transition-colors text-sm border border-gray-700"
                    >
                        휴무일로 설정 / 해제
                    </button>
                </div>
            )}
        </div>
    );
}
