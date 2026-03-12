"use client";
import { useState } from "react";
import { Zone, DeliveryTip } from "@/lib/types";
interface ZoneManagerProps {
    zones: Zone[];
    onChange: (zones: Zone[]) => void;
}

export default function ZoneManager({ zones, onChange }: ZoneManagerProps) {
    const [editingId, setEditingId] = useState<string | null>(null);

    const totalRatio = zones.reduce((s, z) => s + z.ratio, 0);
    const isValid = Math.abs(totalRatio - 1) < 0.001;

    const updateZone = (id: string, field: keyof Zone, value: string) => {
        onChange(
            zones.map((z) => {
                if (z.id !== id) return z;
                if (field === "price") return { ...z, price: parseInt(value) || 0 };
                if (field === "ratio")
                    return { ...z, ratio: (parseInt(value) || 0) / 100 };
                return { ...z, [field]: value };
            })
        );
    };

    const addZone = () => {
        const newZone: Zone = {
            id: Date.now().toString(),
            name: "",
            price: 850,
            ratio: 0,
            tips: [],
        };
        onChange([...zones, newZone]);
        setEditingId(newZone.id);
    };

    const removeZone = (id: string) => {
        onChange(zones.filter((z) => z.id !== id));
    };

    return (
        <div>
            <div id="guide-settings-zones" className="flex items-center justify-between mb-3">
                <h3 className="text-base font-black text-slate-200 uppercase tracking-tight">배송 구역</h3>
                <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${isValid
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-red-500/10 text-red-400"
                        }`}
                >
                    비율 합계: {Math.round(totalRatio * 100)}%
                </span>
            </div>

            <div className="space-y-2">
                {zones.map((zone) => (
                    <div
                        key={zone.id}
                        className="glass-card bg-white/5 border-white/5 p-4 hover:bg-white/10 transition-colors"
                    >
                        {editingId === zone.id ? (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={zone.name}
                                    onChange={(e) => updateZone(zone.id, "name", e.target.value)}
                                    placeholder="구역 이름"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5
                                               text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 block">
                                            단가 (원)
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={zone.price || ""}
                                            onChange={(e) =>
                                                updateZone(zone.id, "price", e.target.value.replace(/[^0-9]/g, ""))
                                            }
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5
                                                       text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 block">
                                            비율 (%)
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={Math.round(zone.ratio * 100) || ""}
                                            onChange={(e) =>
                                                updateZone(zone.id, "ratio", e.target.value.replace(/[^0-9]/g, ""))
                                            }
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5
                                                       text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="flex-1 py-3 bg-blue-600 text-white text-sm rounded-xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-500/25"
                                    >
                                        완료
                                    </button>
                                    <button
                                        onClick={() => removeZone(zone.id)}
                                        className="py-3 px-5 bg-white/5 text-red-400 text-sm rounded-xl font-black uppercase tracking-widest hover:bg-red-500/10 transition-all active:scale-95 border border-red-500/20"
                                    >
                                        삭제
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div
                                    onClick={() => setEditingId(zone.id)}
                                    className="flex items-center justify-between cursor-pointer"
                                >
                                    <div>
                                        <p className="text-slate-100 font-black tracking-tight">
                                            {zone.name || "이름 없음"}
                                        </p>
                                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">
                                            단가 ₩{zone.price.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-white tracking-tighter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                                            {Math.round(zone.ratio * 100)}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button
                onClick={addZone}
                className="w-full mt-3 py-3.5 border border-dashed border-white/10 rounded-2xl
                   text-slate-500 font-black uppercase tracking-widest text-xs hover:border-blue-500/30 hover:text-blue-400
                   hover:bg-blue-500/5 transition-all active:scale-95"
            >
                + 구역 추가
            </button>

            {!isValid && (
                <p className="text-red-400 text-xs mt-2 text-center">
                    ⚠️ 비율 합계가 100%가 되어야 합니다
                </p>
            )}
        </div>
    );
}
