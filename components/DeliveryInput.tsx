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
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-300">오늘 배송</h2>
                <span className="text-xs text-gray-500">수량을 입력하세요</span>
            </div>
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className="w-full text-center text-4xl font-bold bg-gray-800/60
                   border border-gray-700 rounded-xl py-4 px-4 text-white
                   placeholder-gray-600 focus:outline-none focus:border-blue-500/50
                   transition-colors"
                disabled={saving || loading}
            />
            <button
                onClick={handleSave}
                disabled={saving || loading}
                className="w-full mt-3 py-3 bg-blue-600 text-white font-bold text-base
                   rounded-xl active:scale-[0.97] transition-all
                   disabled:opacity-40 disabled:cursor-not-allowed
                   hover:bg-blue-500"
            >
                {saving ? "저장 중..." : "저장"}
            </button>
        </div>
    );
}
