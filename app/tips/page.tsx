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
        <div className="pb-24 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">배송팁</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-70">Knowledge Base</p>
                </div>
                <button
                    onClick={() => {
                        setNewZone(selectedZone || (settings.tipZones?.[0] ?? ""));
                        setShowAddModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-6 rounded-2xl shadow-lg active:scale-95 transition-all text-sm"
                >
                    팁 작성
                </button>
            </div>

            {/* Zone Filter Buttons Grouped */}
            {zoneGroups.length > 0 ? (
                <div className="flex flex-col gap-3">
                    {zoneGroups.map(group => (
                        <div key={group} className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900/50 border border-slate-800 text-blue-400 font-black text-xs">
                                {group}
                            </div>
                            {groupedZones[group].map(zone => (
                                <button
                                    key={zone}
                                    onClick={() => setSelectedZone(zone)}
                                    className={`px-5 py-2.5 rounded-xl whitespace-nowrap font-black text-sm transition-all duration-300 ${selectedZone === zone
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105"
                                        : "bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-slate-200"
                                        }`}
                                >
                                    {zone}
                                </button>
                            ))}
                        </div>
                    ))}
                    <button
                        onClick={() => setSelectedZone("ALLLIST")}
                        className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 group ${selectedZone === "ALLLIST"
                            ? "bg-white text-slate-900 shadow-xl shadow-white/5"
                            : "bg-slate-900/50 border border-slate-800 text-gray-400 hover:text-gray-200"
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={`w-4 h-4 transition-transform ${selectedZone === "ALLLIST" ? "scale-110" : "group-hover:scale-110"}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                        전체 주소 검색
                    </button>
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
                                className="bg-slate-900/50 border border-slate-800 p-5 flex items-center justify-between cursor-pointer group active:scale-[0.98] rounded-2xl overflow-hidden"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        {selectedZone === "ALLLIST" && (
                                            <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/20 uppercase">
                                                {tip.zone}
                                            </span>
                                        )}
                                        <p className="text-white font-black text-lg tracking-tight truncate group-hover:text-blue-400 transition-colors">
                                            {tip.address}
                                        </p>
                                    </div>
                                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest opacity-60">
                                        {new Date(tip.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    {tip.photos && tip.photos.length > 0 && (
                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10 border border-blue-500/20">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            )}

            {/* Add Tip Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-end sm:items-center justify-center backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-slate-900 w-full max-w-lg max-h-[90vh] rounded-t-[2.5rem] sm:rounded-[2rem] p-8 flex flex-col shadow-2xl border-t border-slate-800 overflow-y-auto mb-[env(safe-area-inset-bottom,0px)]">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">배송팁 작성</h2>
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">Share your knowledge</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                                ✕
                            </button>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-blue-400 uppercase tracking-widest px-1">Selected Zone</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(settings.tipZones || []).map(zone => (
                                        <button
                                            key={zone}
                                            onClick={() => setNewZone(zone)}
                                            className={`py-2.5 rounded-xl font-black text-sm transition-all border ${newZone === zone
                                                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25"
                                                : "bg-slate-950/50 border-slate-800 text-gray-500 opacity-60"
                                                }`}
                                        >
                                            {zone}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-blue-400 uppercase tracking-widest px-1">Address Detail</label>
                                <input
                                    type="text"
                                    value={newAddress}
                                    onChange={(e) => setNewAddress(e.target.value)}
                                    placeholder="e.g. 103동 입구"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4
                                               text-white text-lg font-bold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-gray-700"
                                />
                            </div>

                            <div className="space-y-3 mb-6">
                                <label className="text-[11px] font-black text-blue-400 uppercase tracking-widest px-1">Content & Photo</label>
                                <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide">
                                    {["종", "#", "*", "경열"].map((char) => (
                                        <button
                                            key={char}
                                            onClick={() => setNewContent(prev => prev + char)}
                                            className="px-4 py-2 bg-slate-950/50 border border-slate-800 text-blue-400 font-black rounded-xl text-xs active:scale-95"
                                        >
                                            {char}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    placeholder="현관 비번이나 상세 설명을 남겨주세요."
                                    rows={4}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4
                                               text-white text-base font-bold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none placeholder:text-gray-700"
                                />

                                <div className="flex flex-wrap gap-3 pt-2">
                                    {newPhotos.map((photo, i) => (
                                        <div key={i} className="relative w-24 h-24 group">
                                            <img
                                                src={photo}
                                                alt={`Preview ${i}`}
                                                className="w-full h-full object-cover rounded-2xl border border-white/10 shadow-xl"
                                            />
                                            <button
                                                onClick={() => setNewPhotos(prev => prev.filter((_, j) => j !== i))}
                                                className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center font-black text-xs border-2 border-slate-950 shadow-lg"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}

                                    <label className="w-24 h-24 glass-card border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group active:scale-95">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 mb-1 group-hover:text-blue-400">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                        </svg>
                                        <span className="text-[10px] font-black uppercase tracking-tight">Camera</span>
                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveTip}
                            className="w-full py-5 mt-8 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-lg"
                        >
                            배송팁 등록
                        </button>
                    </div>
                </div>
            )}

            {/* View Tip Detail Modal (Modal shows full detail including photos) */}
            {viewTip && (
                <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-end sm:items-center justify-center backdrop-blur-sm animate-in slide-in-from-bottom-10 duration-500">
                    <div className="bg-slate-900 w-full max-w-lg max-h-[90vh] rounded-t-[2.5rem] sm:rounded-[2rem] flex flex-col shadow-2xl overflow-hidden mb-[env(safe-area-inset-bottom,0px)] border-t border-slate-800">
                        {/* Header */}
                        <div className="p-8 pb-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                            <div className="flex items-start justify-between relative z-10">
                                <div className="pr-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-lg shadow-blue-500/20">
                                            {viewTip.zone}
                                        </span>
                                        <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest opacity-60">
                                            {new Date(viewTip.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <h3 className="text-3xl font-black text-white leading-tight tracking-tighter">
                                        {viewTip.address}
                                    </h3>
                                </div>
                                <button onClick={() => setViewTipId(null)} className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-colors">
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-8 pb-8 overflow-y-auto space-y-8 scrollbar-hide">
                            <div className="relative">
                                <div className="absolute -left-4 top-0 w-1 h-full bg-blue-500/30 rounded-full" />
                                <p className="text-gray-200 text-xl leading-relaxed whitespace-pre-wrap font-bold tracking-tight px-2">
                                    {viewTip.content}
                                </p>
                            </div>

                            {viewTip.photos && viewTip.photos.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-px bg-white/10 flex-1" />
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Visual Evidence</h4>
                                        <div className="h-px bg-white/10 flex-1" />
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        {viewTip.photos.map((photo, i) => (
                                            <a href={photo} target="_blank" rel="noreferrer" key={i} className="block group">
                                                <img
                                                    src={photo}
                                                    alt={`Tip ${i}`}
                                                    className="w-full h-auto rounded-3xl border border-white/10 group-hover:border-blue-500/50 transition-all duration-500 shadow-2xl group-hover:scale-[1.01]"
                                                />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-6 bg-white/5 border-t border-white/10 grid grid-cols-[100px_1fr] gap-3">
                            <button
                                onClick={() => handleDeleteTip(viewTip.id)}
                                className="py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-extrabold rounded-2xl transition-all text-sm border border-red-500/20 active:scale-95"
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
                                className="py-4 bg-white text-slate-950 font-black rounded-2xl transition-all text-sm flex items-center justify-center gap-2 active:scale-95 shadow-xl"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                                </svg>
                                꿀팁 공유하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
