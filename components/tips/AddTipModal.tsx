"use client";
import React from "react";
import { Settings } from "@/lib/types";

interface AddTipModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Settings;
    newZone: string;
    setNewZone: (zone: string) => void;
    newAddress: string;
    setNewAddress: (address: string) => void;
    newContent: string;
    setNewContent: (content: string | ((prev: string) => string)) => void;
    newPhotos: string[];
    setNewPhotos: (photos: string[] | ((prev: string[]) => string[])) => void;
    onSave: () => void;
    onCameraCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
    loadingSpeech: boolean;
    onSpeechIconClick: () => void;
    onFullscreenImage: (src: string) => void;
}

export default function AddTipModal({
    isOpen,
    onClose,
    settings,
    newZone,
    setNewZone,
    newAddress,
    setNewAddress,
    newContent,
    setNewContent,
    newPhotos,
    setNewPhotos,
    onSave,
    onCameraCapture,
    loadingSpeech,
    onSpeechIconClick,
    onFullscreenImage
}: AddTipModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-end sm:items-center justify-center backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-900 w-full max-w-lg max-h-[90vh] rounded-t-[2.5rem] sm:rounded-[2rem] p-8 flex flex-col shadow-2xl border-t border-slate-800 overflow-y-auto mb-[env(safe-area-inset-bottom,0px)]">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">배송팁 작성</h2>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">현장에서 얻은 꿀팁을 기록하세요</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                        ✕
                    </button>
                </div>

                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="text-[11px] font-black text-blue-400 uppercase tracking-widest px-1">배송 구역 선택</label>
                        <div className="grid grid-cols-4 gap-2">
                            {(settings.tipZones || []).map((zone: string) => (
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
                        <label className="text-[11px] font-black text-blue-400 uppercase tracking-widest px-1">상세 주소</label>
                        <input
                            type="text"
                            value={newAddress}
                            onChange={(e) => setNewAddress(e.target.value)}
                            placeholder="예: 103동 입구"
                            autoComplete="off"
                            spellCheck="false"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4
                                       text-white text-lg font-bold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-gray-700"
                        />
                    </div>

                    <div className="space-y-3 mb-6">
                        <label className="text-[11px] font-black text-blue-400 uppercase tracking-widest px-1">꿀팁 메모 및 사진</label>
                        <div className="flex items-center gap-2 pb-2 overflow-x-auto scrollbar-hide">
                            <button
                                onClick={onSpeechIconClick}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                                    loadingSpeech 
                                    ? "bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" 
                                    : "bg-blue-500/10 border-blue-500/30 text-blue-400 active:scale-95"
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                                </svg>
                                <span>{loadingSpeech ? "듣는 중..." : "음성 메모"}</span>
                            </button>

                            <div className="w-px h-6 bg-white/10 mx-1" />

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
                            autoComplete="off"
                            spellCheck="false"
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4
                                       text-white text-base font-bold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none placeholder:text-gray-700"
                        />

                        <div className="flex flex-wrap gap-3 pt-2">
                            {newPhotos.map((photo, i) => (
                                <div 
                                    key={i} 
                                    className="relative w-24 h-24 group cursor-pointer active:scale-95 transition-transform"
                                    onClick={() => onFullscreenImage(photo)}
                                >
                                    <img
                                        src={photo}
                                        alt={`미리보기 ${i}`}
                                        className="w-full h-full object-cover rounded-2xl border border-white/10 shadow-xl"
                                    />
                                    <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                                        </svg>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setNewPhotos(prev => prev.filter((_, j) => j !== i));
                                        }}
                                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center font-black text-xs border-2 border-slate-950 shadow-lg"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}

                            <label className="w-24 h-24 bg-slate-900/80 backdrop-blur-md border border-white/5 border-dashed rounded-2xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group active:scale-95">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 mb-1 group-hover:text-blue-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                </svg>
                                <span className="text-[10px] font-black uppercase tracking-tight">카메라</span>
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onCameraCapture} />
                            </label>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onSave}
                    className="w-full py-5 mt-8 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-lg"
                >
                    배송팁 등록
                </button>
            </div>
        </div>
    );
}
