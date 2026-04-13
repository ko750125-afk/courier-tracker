"use client";
import { Settings, WORK_TYPE_LABELS, WorkType, WorkShift } from "@/lib/types";

interface WorkPatternSectionProps {
    settings: Settings;
    onUpdate: (updates: Partial<Settings>) => void;
    handleRestDayToggle: (dayIndex: number) => void;
}

export default function WorkPatternSection({
    settings,
    onUpdate,
    handleRestDayToggle
}: WorkPatternSectionProps) {
    return (
        <div className="space-y-8">
            {/* Work Pattern Selection */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-base font-bold text-slate-200 mb-4 uppercase tracking-widest text-xs">근무 패턴</h3>
                <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => onUpdate({ workType: type })}
                            className={`py-2.5 px-4 rounded-xl text-center text-sm font-medium transition-all ${settings.workType === type
                                ? "bg-blue-600 text-white shadow-lg"
                                : "bg-slate-950/50 text-slate-400 border border-slate-800"
                                }`}
                        >
                            {WORK_TYPE_LABELS[type]}
                        </button>
                    ))}
                </div>

                {settings.workType === "custom" && (
                    <div className="mt-3">
                        <label className="text-xs text-gray-500 block mb-1.5">월 근무일수</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={settings.customWorkDays ?? ""}
                            onChange={(e) => onUpdate({ customWorkDays: parseInt(e.target.value) || undefined })}
                            placeholder="예: 20"
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-base focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                )}
            </div>

            {/* Work Shift */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-base font-bold text-slate-200 mb-4 uppercase tracking-widest text-xs">근무 시간 (주간/야간)</h3>
                <div className="grid grid-cols-2 gap-2">
                    {(["day", "night"] as WorkShift[]).map((shift) => (
                        <button
                            key={shift}
                            onClick={() => onUpdate({ workShift: shift })}
                            className={`py-2.5 px-4 rounded-xl text-center text-sm font-medium transition-all ${settings.workShift === shift
                                ? "bg-blue-600 text-white shadow-lg"
                                : "bg-slate-950/50 text-slate-400 border border-slate-800"
                                }`}
                        >
                            <div className="flex flex-col items-center gap-1">
                                <span className="font-bold">{shift === "day" ? "주간 배송" : "야간 배송"}</span>
                                <span className="text-[10px] opacity-70">{shift === "day" ? "당일 기록" : "전날 기록"}</span>
                            </div>
                        </button>
                    ))}
                </div>
                <p className="mt-3 text-[10px] text-gray-500 leading-relaxed italic">
                    * 야간 배송(밤 10시~다음날 오전)의 경우, 새벽에 입력한 실적이 배송을 시작한 전날 날짜로 자동 기록됩니다.
                </p>
            </div>

            {/* Rest Days Of Week */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-base font-bold text-slate-200 mb-2 uppercase tracking-widest text-xs">정기 쉬는 요일</h3>
                <p className="text-xs text-gray-500 mb-4 bg-gray-900/50 p-3 rounded-xl border border-gray-800 leading-relaxed">
                    선택된 요일은 통계 달력에 자동 휴무 표시됩니다. 다중 선택이 가능합니다.
                </p>
                <div className="flex gap-2 justify-between">
                    {["일", "월", "화", "수", "목", "금", "토"].map((label, idx) => {
                        const isSelected = (settings.restDaysOfWeek || []).includes(idx);
                        return (
                            <button
                                key={label}
                                onClick={() => handleRestDayToggle(idx)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 active:scale-90 ${isSelected
                                    ? "bg-red-600 text-white shadow-lg"
                                    : "bg-slate-950/50 text-slate-500 border border-slate-800"
                                    }`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
