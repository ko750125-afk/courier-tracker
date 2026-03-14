"use client";
import React from "react";
import { DeliveryTip, Settings } from "@/lib/types";

interface TipDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    tip: DeliveryTip;
    settings: Settings;
    editZone: string;
    setEditZone: (zone: string) => void;
    editAddress: string;
    setEditAddress: (address: string) => void;
    editContent: string;
    setEditContent: (content: string) => void;
    editPhotos: string[];
    onDelete: (id: string) => void;
    onUpdate: () => void;
    onFullscreenImage: (src: string) => void;
}

export default function TipDetailModal({
    isOpen,
    onClose,
    tip,
    settings,
    editZone,
    setEditZone,
    editAddress,
    setEditAddress,
    editContent,
    setEditContent,
    editPhotos,
    onDelete,
    onUpdate,
    onFullscreenImage
}: TipDetailModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-end sm:items-center justify-center backdrop-blur-sm animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-slate-900 w-full max-w-lg max-h-[90vh] rounded-t-[2.5rem] sm:rounded-[2rem] flex flex-col shadow-2xl overflow-hidden mb-[env(safe-area-inset-bottom,0px)] border-t border-slate-800">
                {/* Header */}
                <div className="p-8 pb-4 relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                    <div className="flex items-start justify-between relative z-10">
                        <div className="pr-6 w-full">
                            <h2 className="text-2xl font-black text-white tracking-tight mb-1">배송팁 정리</h2>
                            <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest opacity-60">
                                {new Date(tip.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                        <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-colors shrink-0">
                            ✕
                        </button>
                    </div>
                </div>

                <div className="px-8 pb-8 overflow-y-auto space-y-6 scrollbar-hide flex-1">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">배송 구역</label>
                        <div className="grid grid-cols-4 gap-2">
                            {(settings.tipZones || []).map((zone: string) => (
                                <button
                                    key={zone}
                                    onClick={() => setEditZone(zone)}
                                    className={`py-2 rounded-lg font-black text-[11px] transition-all border ${editZone === zone
                                        ? "bg-blue-600 border-blue-500 text-white shadow-lg"
                                        : "bg-slate-950/50 border-slate-800 text-gray-500"
                                        }`}
                                >
                                    {zone}
                                </button>
                            ))}
                            <button
                                onClick={() => setEditZone("미분류")}
                                className={`py-2 rounded-lg font-black text-[11px] transition-all border ${editZone === "미분류"
                                    ? "bg-blue-600 border-blue-500 text-white shadow-lg"
                                    : "bg-slate-950/50 border-slate-800 text-gray-500"
                                    }`}
                            >
                                미분류
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">상세 주소</label>
                        <input
                            type="text"
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            autoComplete="off"
                            spellCheck="false"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-black focus:outline-none focus:border-blue-500 transition-all"
                            placeholder="상세 주소를 입력하세요"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">꿀팁 메모 (수정 가능)</label>
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={5}
                            autoComplete="off"
                            spellCheck="false"
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-gray-200 text-lg leading-relaxed font-bold focus:outline-none focus:border-blue-500 transition-all resize-none"
                            placeholder="꿀팁 내용을 입력하세요"
                        />
                    </div>

                    {editPhotos.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">참고 사진</label>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {editPhotos.slice(0, 3).map((photo, i) => (
                                    <div 
                                        key={i} 
                                        className="relative w-24 h-24 shrink-0 active:scale-95 transition-transform cursor-pointer"
                                        onClick={() => onFullscreenImage(photo)}
                                    >
                                        <img 
                                            src={photo} 
                                            alt={`참고사진 ${i}`} 
                                            className="w-full h-full object-cover rounded-xl border border-white/5 shadow-md" 
                                        />
                                        <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                                            </svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-6 bg-white/5 border-t border-white/10 grid grid-cols-[100px_1fr] gap-3">
                    <button
                        onClick={() => onDelete(tip.id)}
                        className="py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-extrabold rounded-2xl transition-all text-sm border border-red-500/20 active:scale-95"
                    >
                        삭제
                    </button>
                    <button
                        onClick={onUpdate}
                        className="py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all text-sm flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-blue-500/10"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        배송팁 업데이트
                    </button>
                </div>
            </div>
        </div>
    );
}
