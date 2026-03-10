"use client";

import { Delivery } from "@/lib/types";
import { formatNumber } from "@/lib/calculations";

interface MonthlyCalendarProps {
    selectedMonth: string; // YYYY-MM
    deliveries: Delivery[];
    restDaysOfWeek: number[]; // 0~6
    restDateOverrides: Record<string, boolean>; // YYYY-MM-DD -> true(쉬는날)/false(일하는날)
    onToggleRestDate: (dateStr: string) => void;
}

export default function MonthlyCalendar({
    selectedMonth,
    deliveries,
    restDaysOfWeek,
    restDateOverrides,
    onToggleRestDate,
}: MonthlyCalendarProps) {
    if (!selectedMonth) return null;

    const [year, month] = selectedMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const startDayOfWeek = startDate.getDay(); // 0(Sun) ~ 6(Sat)
    const daysInMonth = new Date(year, month, 0).getDate();

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

    return (
        <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800/60 rounded-2xl p-4 shadow-xl shadow-black/20 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-200 tracking-tight">월 달력</h3>
                <span className="text-[10px] text-gray-500">날짜를 터치해 휴일/근무일을 수정하세요</span>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
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

            <div className="grid grid-cols-7 gap-1">
                {emptyCells.map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[56px] rounded-xl bg-gray-900/20"></div>
                ))}

                {days.map((day) => {
                    const currentDayOfWeek = (startDayOfWeek + day - 1) % 7;
                    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const delivery = deliveries.find((d) => d.date === dateStr);
                    const isRest = isRestDay(dateStr, currentDayOfWeek);
                    const hasDelivery = !!delivery;

                    return (
                        <div
                            key={day}
                            onClick={() => onToggleRestDate(dateStr)}
                            className={`relative min-h-[56px] rounded-xl flex flex-col items-center justify-between py-1.5 cursor-pointer transition-all active:scale-95 border ${isRest
                                ? "bg-red-500/5 hover:bg-red-500/10 border-red-500/10"
                                : hasDelivery
                                    ? "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 shadow-inner"
                                    : "bg-gray-800/40 hover:bg-gray-800/80 border-transparent hover:border-gray-700/50"
                                }`}
                        >
                            <span
                                className={`text-xs font-medium ${isRest
                                    ? "text-red-400/80"
                                    : currentDayOfWeek === 0
                                        ? "text-red-400"
                                        : currentDayOfWeek === 6
                                            ? "text-blue-400"
                                            : "text-gray-300"
                                    }`}
                            >
                                {day}
                            </span>
                            <div className="flex flex-col items-center justify-end h-full w-full">
                                {hasDelivery && (
                                    <span className={`text-[10px] font-bold leading-none ${isRest ? 'text-gray-500 line-through' : 'text-blue-300'}`}>
                                        {formatNumber(delivery.total)}
                                    </span>
                                )}
                                {isRest && !hasDelivery && (
                                    <span className="text-[9px] font-semibold text-red-500/60 leading-none mt-1">
                                        휴무
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-800/50">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded bg-blue-500/20 border border-blue-500/40"></div>
                    <span className="text-[10px] text-gray-400">배송일</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded bg-red-500/10 border border-red-500/20"></div>
                    <span className="text-[10px] text-gray-400">휴무일</span>
                </div>
            </div>
        </div>
    );
}
