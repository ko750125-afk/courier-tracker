"use client";
import { useState } from "react";
import { Zone, DeliveryTip } from "@/lib/types";
import DeliveryTips from "./DeliveryTips";

interface ZoneManagerProps {
    zones: Zone[];
    onChange: (zones: Zone[]) => void;
}

export default function ZoneManager({ zones, onChange }: ZoneManagerProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tipsZoneId, setTipsZoneId] = useState<string | null>(null);

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

    const handleTipsUpdate = (zoneId: string, tips: DeliveryTip[]) => {
        onChange(zones.map((z) => (z.id === zoneId ? { ...z, tips } : z)));
    };

    const tipsZone = zones.find((z) => z.id === tipsZoneId);

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-200">배송 구역</h3>
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
                        className="bg-gray-900 border border-gray-800 rounded-xl p-4"
                    >
                        {editingId === zone.id ? (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={zone.name}
                                    onChange={(e) => updateZone(zone.id, "name", e.target.value)}
                                    placeholder="구역 이름"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5
                                               text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">
                                            단가 (원)
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={zone.price || ""}
                                            onChange={(e) =>
                                                updateZone(zone.id, "price", e.target.value.replace(/[^0-9]/g, ""))
                                            }
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5
                                                       text-white text-sm focus:outline-none focus:border-blue-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">
                                            비율 (%)
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={Math.round(zone.ratio * 100) || ""}
                                            onChange={(e) =>
                                                updateZone(zone.id, "ratio", e.target.value.replace(/[^0-9]/g, ""))
                                            }
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5
                                                       text-white text-sm focus:outline-none focus:border-blue-500/50"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium"
                                    >
                                        완료
                                    </button>
                                    <button
                                        onClick={() => removeZone(zone.id)}
                                        className="py-2 px-4 bg-gray-800 text-red-400 text-sm rounded-lg font-medium"
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
                                        <p className="text-gray-200 font-semibold">
                                            {zone.name || "이름 없음"}
                                        </p>
                                        <p className="text-gray-500 text-sm">
                                            단가 ₩{zone.price.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-bold text-gray-300">
                                            {Math.round(zone.ratio * 100)}%
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTipsZoneId(zone.id);
                                    }}
                                    className="w-full py-1.5 bg-gray-800 border border-gray-700 rounded-lg
                                               text-xs text-gray-400 font-medium hover:border-blue-500/40
                                               hover:text-blue-400 transition-colors flex items-center justify-center gap-1"
                                >
                                    💡 배송팁
                                    {(zone.tips?.length ?? 0) > 0 && (
                                        <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full text-[10px]">
                                            {zone.tips!.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button
                onClick={addZone}
                className="w-full mt-3 py-2.5 border border-dashed border-gray-700 rounded-xl
                   text-gray-500 font-medium text-sm hover:border-blue-500/50 hover:text-blue-400
                   transition-colors"
            >
                + 구역 추가
            </button>

            {!isValid && (
                <p className="text-red-400 text-xs mt-2 text-center">
                    ⚠️ 비율 합계가 100%가 되어야 합니다
                </p>
            )}

            {/* Delivery Tips Modal */}
            {tipsZone && (
                <DeliveryTips
                    zone={tipsZone}
                    onUpdate={(tips) => handleTipsUpdate(tipsZone.id, tips)}
                    onClose={() => setTipsZoneId(null)}
                />
            )}
        </div>
    );
}
