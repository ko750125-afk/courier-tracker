"use client";
import { Settings } from "@/lib/types";

interface SettlementSectionProps {
    settings: Settings;
    onUpdate: (updates: Partial<Settings>) => void;
}

export default function SettlementSection({ settings, onUpdate }: SettlementSectionProps) {
    const handleChange = (field: "settlementDay" | "payDay", val: string) => {
        const cleanVal = val.replace(/[^0-9]/g, "");
        const num = cleanVal === "" ? 0 : parseInt(cleanVal);
        onUpdate({ [field]: num });
    };

    const handleBlur = (field: "settlementDay" | "payDay", defaultVal: number) => {
        const val = settings[field];
        if (!val || val < 1 || val > 31) {
            onUpdate({ [field]: defaultVal });
        }
    };

    return (
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl mt-8">
            <h3 className="text-base font-bold text-slate-200 mb-4 uppercase tracking-widest text-xs">정산 및 급여 주기</h3>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-gray-500 block mb-1.5">정산 시작일</label>
                    <div className="relative">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={settings.settlementDay || ""}
                            onChange={(e) => handleChange("settlementDay", e.target.value)}
                            onBlur={() => handleBlur("settlementDay", 25)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-base focus:outline-none focus:border-blue-500/50"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">일</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs text-gray-500 block mb-1.5">정산일 (월급날)</label>
                    <div className="relative">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={settings.payDay || ""}
                            onChange={(e) => handleChange("payDay", e.target.value)}
                            onBlur={() => handleBlur("payDay", 20)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-base focus:outline-none focus:border-blue-500/50"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">일</span>
                    </div>
                </div>
            </div>
            <p className="mt-3 text-[10px] text-gray-600 leading-relaxed italic">
                * 예: 시작일 25일 시, [전월 25일 ~ 당월 24일] 성과가 정산됩니다.
            </p>
        </div>
    );
}
