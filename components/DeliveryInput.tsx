"use client";
import { useState, useEffect } from "react";

interface DeliveryInputProps {
    initialValue?: number;
    onSave: (total: number) => Promise<void>;
    loading?: boolean;
}

export default function DeliveryInput({
    initialValue,
    onSave,
    loading,
}: DeliveryInputProps) {
    const [value, setValue] = useState<string>(
        initialValue !== undefined ? String(initialValue) : "0"
    );
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (initialValue !== undefined) {
            setValue(String(initialValue));
        }
    }, [initialValue]);

    const handleFocus = () => {
        if (value === "0") setValue("");
    };

    const handleBlur = () => {
        if (value === "") setValue("0");
    };

    const handleSave = async () => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) return;
        setSaving(true);
        try {
            await onSave(num);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div id="guide-input-section" className="bg-gray-900/80 backdrop-blur-md border border-gray-800/60 rounded-2xl p-5 shadow-xl shadow-black/40">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-200">오늘 배송</h2>
                <span className="text-xs text-gray-500 font-medium">수량을 입력하세요</span>
            </div>
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className="w-full text-center text-4xl font-extrabold bg-gray-950/50
                   border border-gray-700/50 rounded-xl py-4 px-4 text-white tracking-tight
                   placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10
                   transition-all duration-300 shadow-inner"
                disabled={saving || loading}
            />
            <button
                onClick={handleSave}
                disabled={saving || loading}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-base
                   rounded-xl active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-500/20
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                   hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
                {saving ? "저장 중..." : "저장 완료"}
            </button>
        </div>
    );
}
