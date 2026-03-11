"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { DeliveryTip, Settings, DEFAULT_SETTINGS } from "@/lib/types";
import { loadSettings, loadTips, saveTip, deleteTip } from "@/lib/store";

export default function TipsPage() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [tips, setTips] = useState<DeliveryTip[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedZone, setSelectedZone] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Add Tip State
    const [newZone, setNewZone] = useState<string>("");
    const [newAddress, setNewAddress] = useState("");
    const [newContent, setNewContent] = useState("");
    const [newPhotos, setNewPhotos] = useState<string[]>([]);

    // Detailed Tip Modal
    const [viewTipId, setViewTipId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [s, t] = await Promise.all([loadSettings(), loadTips()]);
            setSettings(s);
            setTips(t);
            if (s.tipZones && s.tipZones.length > 0 && !selectedZone) {
                setSelectedZone(s.tipZones[0]);
            }
        } catch (err) {
            console.error("Failed to load settings/tips:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedZone]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSaveTip = async () => {
        if (!newZone || !newAddress.trim() || !newContent.trim()) {
            alert("구역, 주소, 내용을 모두 입력해주세요.");
            return;
        }

        const tip: DeliveryTip = {
            id: Date.now().toString(),
            zone: newZone,
            address: newAddress.trim(),
            content: newContent.trim(),
            photos: newPhotos.length > 0 ? newPhotos : undefined,
            createdAt: new Date().toISOString(),
        };

        await saveTip(tip);
        setShowAddModal(false);
        setNewZone("");
        setNewAddress("");
        setNewContent("");
        setNewPhotos([]);
        await loadData();
    };

    const handleDeleteTip = async (id: string) => {
        if (confirm("이 배송팁을 삭제하시겠습니까?")) {
            await deleteTip(id);
            if (viewTipId === id) setViewTipId(null);
            await loadData();
        }
    };

    const handleCameraCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX = 800;
                let w = img.width;
                let h = img.height;
                if (w > MAX || h > MAX) {
                    if (w > h) {
                        h = Math.round((h * MAX) / w);
                        w = MAX;
                    } else {
                        w = Math.round((w * MAX) / h);
                        h = MAX;
                    }
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d")!;
                ctx.drawImage(img, 0, 0, w, h);
                setNewPhotos(prev => [...prev, canvas.toDataURL("image/jpeg", 0.6)]);
            };
            img.src = ev.target?.result as string;
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">로딩 중...</p>
                </div>
            </div>
        );
    }

    const filteredTips = tips.filter(t => t.zone === selectedZone);
    const viewTip = tips.find(t => t.id === viewTipId);

    // Group zones by first letter
    const groupedZones = (settings.tipZones || []).reduce((acc, zone) => {
        const firstLetter = zone.charAt(0).toUpperCase();
        if (!acc[firstLetter]) acc[firstLetter] = [];
        acc[firstLetter].push(zone);
        return acc;
    }, {} as Record<string, string[]>);
    const zoneGroups = Object.keys(groupedZones).sort();

    return (
        <div className="pb-24">
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-100">배송팁</h1>
                    <p className="text-gray-500 text-sm mt-0.5">상세 구역별 꿀팁 모음</p>
                </div>
                <button
                    onClick={() => {
                        setNewZone(selectedZone || (settings.tipZones?.[0] ?? ""));
                        setShowAddModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.4)] active:scale-95 transition-all text-sm flex items-center gap-1.5"
                >
                    <span className="text-lg leading-none">+</span> 작성
                </button>
            </div>

            {/* Zone Filter Buttons Grouped */}
            {zoneGroups.length > 0 ? (
                <div className="flex flex-col gap-2.5 mb-5">
                    {zoneGroups.map(group => (
                        <div key={group} className="flex gap-2 overflow-x-auto invisible-scrollbar pb-1">
                            <div className="flex-shrink-0 flex items-center justify-center w-[42px] rounded-2xl bg-gray-800/40 text-gray-500 font-black text-sm border border-gray-700/40">
                                {group}
                            </div>
                            {groupedZones[group].map(zone => (
                                <button
                                    key={zone}
                                    onClick={() => setSelectedZone(zone)}
                                    className={`px-5 py-2.5 rounded-2xl whitespace-nowrap font-bold text-sm transition-all duration-200 shadow-sm ${selectedZone === zone
                                        ? "bg-blue-600 text-white shadow-blue-500/30 scale-105"
                                        : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-gray-700"
                                        }`}
                                >
                                    {zone}
                                </button>
                            ))}
                        </div>
                    ))}
                    {/* All Zones Button */}
                    <div className="pt-2">
                        <button
                            onClick={() => setSelectedZone("ALLLIST")}
                            className={`w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 shadow-sm flex items-center justify-center gap-2 ${selectedZone === "ALLLIST"
                                ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-blue-500/20"
                                : "bg-gray-900/60 text-gray-400 border border-gray-800/80 hover:bg-gray-800"
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            전체 주소 검색 (가나다순)
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center mb-5">
                    <p className="text-gray-400 text-sm mb-2">설정에서 배송팁 구역을 먼저 추가해주세요.</p>
                </div>
            )}

            {/* Tips List */}
            {selectedZone && (
                <div className="space-y-3">
                    {(() => {
                        const list = selectedZone === "ALLLIST" 
                            ? [...tips].sort((a, b) => a.address.localeCompare(b.address, 'ko-KR'))
                            : tips.filter(t => t.zone === selectedZone);
                        
                        if (list.length === 0) {
                            return (
                                <div className="text-center py-12 bg-gray-900/40 rounded-2xl border border-gray-800/50 border-dashed">
                                    <p className="text-gray-500 text-sm">등록된 배송팁이 없습니다.</p>
                                </div>
                            );
                        }

                        return list.map(tip => (
                            <div
                                key={tip.id}
                                onClick={() => setViewTipId(tip.id)}
                                className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-blue-500/50 hover:bg-gray-800 transition-all shadow-sm active:scale-[0.98]"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        {selectedZone === "ALLLIST" && (
                                            <span className="text-[10px] font-bold bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded border border-gray-700">
                                                {tip.zone}
                                            </span>
                                        )}
                                        <p className="text-gray-100 font-bold text-base truncate">
                                            {tip.address}
                                        </p>
                                    </div>
                                    <p className="text-gray-500 text-xs truncate">
                                        {new Date(tip.createdAt).toLocaleDateString('ko-KR')}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    {tip.photos && tip.photos.length > 0 && (
                                        <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded-lg font-medium flex items-center gap-1 border border-blue-500/20">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                            </svg>
                                            사진
                                        </span>
                                    )}
                                    <span className="text-gray-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                        </svg>
                                    </span>
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            )}

            {/* Add Tip Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-end sm:items-center justify-center backdrop-blur-sm">
                    <div className="bg-gray-950 w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-2xl p-5 flex flex-col shadow-2xl overflow-y-auto mb-[env(safe-area-inset-bottom,0px)] border-t border-blue-500/30">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="bg-blue-600 p-1.5 rounded-lg">💡</span>
                                새로운 배송팁 작성
                            </h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 p-2 hover:text-white bg-gray-900 rounded-full">
                                ✕
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Step 1: Zone */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">1</span>
                                    구역 선택
                                </label>
                                <div className="space-y-3">
                                    {zoneGroups.length > 0 ? (
                                        zoneGroups.map(group => (
                                            <div key={group} className="space-y-1.5">
                                                <div className="text-[11px] font-bold text-gray-500 flex items-center gap-2">
                                                    <span>{group} 그룹</span>
                                                    <div className="h-px bg-gray-800 flex-1"></div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {groupedZones[group].map(zone => (
                                                        <button
                                                            key={zone}
                                                            onClick={() => setNewZone(zone)}
                                                            className={`py-2 rounded-xl font-bold text-sm transition-all border ${newZone === zone
                                                                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                                                                : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600"
                                                                }`}
                                                        >
                                                            {zone}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-red-400 py-2">설정에서 배송팁 구역을 먼저 추가해주세요.</p>
                                    )}
                                </div>
                            </div>

                            {/* Step 2: Address */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">2</span>
                                    주소 입력
                                </label>
                                <input
                                    type="text"
                                    value={newAddress}
                                    onChange={(e) => setNewAddress(e.target.value)}
                                    placeholder="상세 주소 (예: 103동)"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3.5
                                               text-white text-base focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                                />
                            </div>

                            {/* Step 3: Content & Photo */}
                            <div className="space-y-2 mb-4">
                                <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">3</span>
                                    꿀팁 내용 및 사진
                                </label>

                                <div className="flex gap-2 pb-1 overflow-x-auto invisible-scrollbar">
                                    {["종", "#", "*", "경열"].map((char) => (
                                        <button
                                            key={char}
                                            onClick={() => setNewContent(prev => prev + char)}
                                            className="px-4 py-1.5 bg-gray-800/80 hover:bg-gray-700 text-blue-400 font-bold rounded-lg text-sm border border-gray-700/50 active:scale-95 transition-all whitespace-nowrap"
                                        >
                                            {char}
                                        </button>
                                    ))}
                                </div>

                                <textarea
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    placeholder="비밀번호(예: #1234*)나 입구 위치 등 상세 내용을 적어주세요."
                                    rows={4}
                                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3.5
                                               text-white text-base focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 resize-none"
                                />

                                <div className="flex flex-wrap gap-2 pt-2">
                                    {newPhotos.map((photo, i) => (
                                        <div key={i} className="relative w-20 h-20 shrink-0">
                                            <img
                                                src={photo}
                                                alt={`사진 ${i + 1}`}
                                                className="w-full h-full object-cover rounded-xl border border-gray-700"
                                            />
                                            <button
                                                onClick={() => setNewPhotos(prev => prev.filter((_, j) => j !== i))}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-xs border-2 border-gray-950"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}

                                    <label className="w-20 h-20 bg-gray-900 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-800 hover:border-gray-500 transition-colors shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mb-1">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                        </svg>
                                        <span className="text-[10px] font-medium">사진 촬영</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={handleCameraCapture}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveTip}
                            className="w-full py-4 mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base"
                        >
                            배송팁 등록하기
                        </button>
                    </div>
                </div>
            )}

            {/* View Tip Detail Modal (Modal shows full detail including photos) */}
            {viewTip && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-end sm:items-center justify-center backdrop-blur-sm">
                    <div className="bg-gray-950 w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden mb-[env(safe-area-inset-bottom,0px)] border-t border-gray-800">
                        {/* Header */}
                        <div className="flex items-start justify-between p-5 border-b border-gray-800 bg-gray-900/50">
                            <div className="pr-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">
                                        {viewTip.zone}
                                    </span>
                                    <span className="text-gray-500 text-xs">
                                        {new Date(viewTip.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-white leading-tight">
                                    {viewTip.address}
                                </h3>
                            </div>
                            <button onClick={() => setViewTipId(null)} className="p-2 bg-gray-800 text-gray-400 hover:text-white rounded-full flex-shrink-0 mt-1">
                                ✕
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 overflow-y-auto space-y-6">
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-inner">
                                <p className="text-gray-200 text-base leading-relaxed whitespace-pre-wrap font-medium">
                                    {viewTip.content}
                                </p>
                            </div>

                            {viewTip.photos && viewTip.photos.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-gray-400 flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                        </svg>
                                        첨부된 사진
                                    </h4>
                                    <div className="space-y-4">
                                        {viewTip.photos.map((photo, i) => (
                                            <a href={photo} target="_blank" rel="noreferrer" key={i} className="block">
                                                <img
                                                    src={photo}
                                                    alt={`첨부사진 ${i + 1}`}
                                                    className="w-full h-auto max-h-[400px] object-cover rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-colors shadow-lg"
                                                />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex gap-2">
                            <button
                                onClick={() => handleDeleteTip(viewTip.id)}
                                className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl transition-colors text-sm border border-red-500/20"
                            >
                                삭제
                            </button>
                            <button
                                onClick={() => {
                                    const shareText = `[배송팁] ${viewTip.zone} ${viewTip.address}\n\n${viewTip.content}`;
                                    if (navigator.share) {
                                        navigator.share({
                                            title: `${viewTip.zone} ${viewTip.address} 배송팁`,
                                            text: shareText
                                        }).catch(() => {
                                            navigator.clipboard.writeText(shareText);
                                            alert("클립보드에 복사되었습니다.");
                                        });
                                    } else {
                                        navigator.clipboard.writeText(shareText);
                                        alert("클립보드에 복사되었습니다.");
                                    }
                                }}
                                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                                </svg>
                                공유하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
