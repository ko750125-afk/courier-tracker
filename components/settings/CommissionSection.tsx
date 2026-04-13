"use client";
import { Settings } from "@/lib/types";

interface CommissionSectionProps {
    commissionRateInput: string;
    onInputChange: (val: string) => void;
}

export default function CommissionSection({ commissionRateInput, onInputChange }: CommissionSectionProps) {
    return (
        <div className="mt-8 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-base font-bold text-slate-200 mb-4 uppercase tracking-widest text-xs">회사 수수료율</h3>
            <div className="space-y-4">
                <div className="relative">
                    <input
                        type="text"
                        id="commission-rate-input"
                        inputMode="decimal"
                        value={commissionRateInput}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, "");
                            if (val.split('.').length > 2) return;
                            onInputChange(val);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-base focus:outline-none focus:border-blue-500/50"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                </div>
                <p className="text-[10px] text-gray-600 leading-relaxed italic">
                    * 배송 총 매출에서 위 설정된 비율만큼 공제한 금액이 최종 정산액에 반영됩니다.
                </p>
            </div>
        </div>
    );
}
