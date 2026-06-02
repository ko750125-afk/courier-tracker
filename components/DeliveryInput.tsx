"use client";
import { useState, useEffect } from "react";
import { Settings } from "@/lib/types";
import { useSound } from "@/lib/hooks/useSound";
import { Plus, Minus, Check } from "lucide-react";

interface DeliveryInputProps {
    initialValue?: number;
    onSave: (total: number) => Promise<void>;
    loading?: boolean;
    settings?: Settings;
}

export default function DeliveryInput({
    initialValue,
    onSave,
    loading,
    settings,
}: DeliveryInputProps) {
    const [value, setValue] = useState<string>(
        initialValue !== undefined ? String(initialValue) : "0"
    );
    const [saving, setSaving] = useState(false);
    const { play } = useSound(settings?.useSoundEffects);

    useEffect(() => {
        if (initialValue !== undefined) {
            setValue(String(initialValue));
        }
    }, [initialValue]);

    const handleBlur = () => {
        if (value === "") setValue("0");
    };

    const handleSave = async () => {
        const num = parseInt(value || "0", 10);
        if (isNaN(num) || num < 0) return;
        setSaving(true);
        try {
            play();
            await onSave(num);
        } finally {
            setSaving(false);
        }
    };

    const adjustValue = (amount: number) => {
        setValue(prev => {
            const current = parseInt(prev || "0", 10);
            const next = Math.max(0, current + amount);
            return String(next);
        });
    };

    return (
        <div id="guide-input-section" className="bg-slate-900/60 backdrop-blur-md border border-white/5 p-6 rounded-3xl relative shadow-2xl">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">오늘 배송 건수</h2>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">실시간</span>
                </div>
            </div>
            
            <div className="flex items-center justify-center gap-4 mb-8">
                <div className="flex flex-col gap-2">
                    <button onClick={() => adjustValue(-10)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-800/50 text-slate-400 active:scale-95 transition-all">-10</button>
                    <button onClick={() => adjustValue(-1)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-800/50 text-slate-400 active:scale-95 transition-all"><Minus size={20} /></button>
                </div>
                
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={value}
                    onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
                    onBlur={handleBlur}
                    className="w-32 text-center text-6xl font-black bg-transparent text-white focus:outline-none transition-all duration-300"
                    disabled={saving || loading}
                />

                <div className="flex flex-col gap-2">
                    <button onClick={() => adjustValue(10)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 active:scale-95 transition-all font-bold">+10</button>
                    <button onClick={() => adjustValue(1)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 active:scale-95 transition-all"><Plus size={20} /></button>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={saving || loading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-lg uppercase tracking-widest
                   rounded-2xl active:scale-[0.98] transition-all duration-200 shadow-[0_4px_20px_rgba(59,130,246,0.3)]
                   disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {saving ? "저장 중..." : <><Check size={24} /> 완료</>}
            </button>
        </div>
    );
}

