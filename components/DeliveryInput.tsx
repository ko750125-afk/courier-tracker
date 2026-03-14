"use client";
import { useState, useEffect } from "react";
import { Settings } from "@/lib/types";
import { useSound } from "@/lib/hooks/useSound";

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
        handleSave();
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


    return (
        <div id="guide-input-section" className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl relative">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">오늘 배송</h2>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">실시간 입력</span>
                </div>
            </div>
            
            <div className="relative">
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={value}
                    onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
                    onBlur={handleBlur}
                    className="w-full text-center text-4xl font-black bg-slate-950/50
                       border border-slate-800 rounded-xl py-4 px-4 text-white
                       placeholder-slate-700 focus:outline-none 
                       transition-all duration-300 focus:border-blue-500/50"
                    disabled={saving || loading}
                />
            </div>

            <button
                onClick={handleSave}
                disabled={saving || loading}
                className="w-full mt-4 py-3.5 bg-blue-600 text-white font-bold text-sm uppercase tracking-widest
                   rounded-xl active:scale-[0.97] transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed
                   hover:bg-blue-500"
            >
                {saving ? "처리 중..." : "기록 저장하기"}
            </button>
        </div>
    );
}

