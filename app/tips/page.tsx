"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { DeliveryTip, Settings, DEFAULT_SETTINGS } from "@/lib/types";
import { loadSettings, loadTips, saveTip, deleteTip } from "@/lib/store";
import { useAuth } from "@/lib/contexts/AuthContext";

// Components
import FullScreenImageViewer from "@/components/tips/FullScreenImageViewer";
import AddTipModal from "@/components/tips/AddTipModal";
import TipDetailModal from "@/components/tips/TipDetailModal";

export default function TipsPage() {
    const { user, loading: authLoading } = useAuth();
    // --- State ---
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [tips, setTips] = useState<DeliveryTip[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Navigation & Filtering
    const [selectedZone, setSelectedZone] = useState<string | null>(null);
    
    // Modals visibility
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [viewingTipId, setViewingTipId] = useState<string | null>(null);
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

    // Form State: Add Tip
    const [newZone, setNewZone] = useState<string>("");
    const [newAddress, setNewAddress] = useState("");
    const [newContent, setNewContent] = useState("");
    const [newPhotos, setNewPhotos] = useState<string[]>([]);
    const [isSpeechLoading, setIsSpeechLoading] = useState(false);

    // Form State: Edit Tip
    const [editZone, setEditZone] = useState("");
    const [editAddress, setEditAddress] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editPhotos, setEditPhotos] = useState<string[]>([]);
    
    // Persistent Annotations & Original Images
    const [photoData, setPhotoData] = useState<Record<string, { original: string, annotations: any[] }>>({});

    // --- Helpers ---
    const loadAppData = useCallback(async () => {
        try {
            const [settingsData, tipsData] = await Promise.all([
                loadSettings(user?.uid), 
                loadTips(user?.uid)
            ]);
            setSettings(settingsData);
            setTips(tipsData);
            
            // Set initial zone filter
            if (settingsData.tipZones && settingsData.tipZones.length > 0 && !selectedZone) {
                setSelectedZone(settingsData.tipZones[0]);
            }
        } catch (err) {
            console.error("Failed to load app data:", err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedZone, user?.uid]);

    // Initial Load
    useEffect(() => {
        loadAppData();
    }, [loadAppData]);

    // Sync edit form with selected tip
    useEffect(() => {
        const tip = tips.find(t => t.id === viewingTipId);
        if (tip) {
            setEditZone(tip.zone || "미분류");
            setEditAddress(tip.address);
            setEditContent(tip.content);
            setEditPhotos(tip.photos || []);
        }
    }, [viewingTipId, tips]);

    // --- Actions ---
    const handleSaveNewTip = async () => {
        if (!newContent.trim() && newPhotos.length === 0) {
            alert("메모 내용이나 사진을 추가해주세요.");
            return;
        }

        const tip: DeliveryTip = {
            id: Date.now().toString(),
            zone: newZone || "미분류",
            address: newAddress.trim() || "미지정 주소 (정의 필요)",
            content: newContent.trim() || "(메모 없음)",
            photos: newPhotos.length > 0 ? newPhotos : undefined,
            createdAt: new Date().toISOString(),
        };

        await saveTip(tip, user?.uid);
        setIsAddModalOpen(false);
        resetAddForm();
        await loadAppData();
    };

    const handleUpdateExistingTip = async () => {
        if (!viewingTipId) return;
        const currentTip = tips.find(t => t.id === viewingTipId);
        if (!currentTip) return;

        const updatedTip: DeliveryTip = {
            ...currentTip,
            zone: editZone || "미분류",
            address: editAddress.trim() || "미지정 주소 (정의 필요)",
            content: editContent.trim() || "(메모 없음)",
            photos: editPhotos.length > 0 ? editPhotos : undefined,
        };

        await saveTip(updatedTip, user?.uid);
        setViewingTipId(null);
        await loadAppData();
    };

    const handleDeleteExistingTip = async (id: string) => {
        if (confirm("정말 이 팁을 삭제하시겠습니까?")) {
            await deleteTip(id, user?.uid);
            setViewingTipId(null);
            await loadAppData();
        }
    };

    const resetAddForm = () => {
        setNewZone("");
        setNewAddress("");
        setNewContent("");
        setNewPhotos([]);
    };

    const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            if (isAddModalOpen) {
                setNewPhotos(prev => [...prev, base64]);
            } else {
                setEditPhotos(prev => [...prev, base64]);
            }
            // Store original for re-editing
            setPhotoData(prev => ({
                ...prev,
                [base64]: { original: base64, annotations: [] }
            }));
        };
        reader.readAsDataURL(file);
    };

    const startSpeechRecognition = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsSpeechLoading(true);
        recognition.onend = () => setIsSpeechLoading(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setNewContent(prev => prev + (prev ? " " : "") + transcript);
        };
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error);
            setIsSpeechLoading(false);
        };

        recognition.start();
    };

    // --- Data processing for rendering ---
    if (isLoading || authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">로딩 중...</p>
                </div>
            </div>
        );
    }

    const viewingTip = tips.find(t => t.id === viewingTipId);
    
    const allAvailableZones = Array.from(new Set([
        ...(settings.tipZones || []), 
        ...tips.map(t => t.zone)
    ])).filter((z): z is string => !!z);
    
    const groupedZones = allAvailableZones.reduce((acc, zone: string) => {
        const firstLetter = zone === "미분류" ? "!" : zone.charAt(0).toUpperCase();
        if (!acc[firstLetter]) acc[firstLetter] = [];
        acc[firstLetter].push(zone);
        return acc;
    }, {} as Record<string, string[]>);
    
    const zoneGroups = Object.keys(groupedZones).sort();

    const currentFilteredTips = selectedZone === "SEARCH_ALL" 
        ? [...tips].sort((a, b) => a.address.localeCompare(b.address, 'ko-KR'))
        : tips.filter(t => t.zone === selectedZone);

    return (
        <div className="pb-24 space-y-6">
            {/* Header Area */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">배송팁</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-70">배송 지식 데이터베이스</p>
                </div>
                <button
                    onClick={() => {
                        resetAddForm();
                        setIsAddModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-6 rounded-2xl shadow-lg active:scale-95 transition-all text-sm"
                >
                    팁 작성
                </button>
            </div>

            {/* Zone Filter Navigation */}
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
                                        : "bg-slate-950/50 border border-slate-800 text-slate-400 hover:text-slate-200"
                                        }`}
                                >
                                    {zone}
                                </button>
                            ))}
                        </div>
                    ))}
                    <button
                        onClick={() => setSelectedZone("SEARCH_ALL")}
                        className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 group ${selectedZone === "SEARCH_ALL"
                            ? "bg-white text-slate-900 shadow-xl shadow-white/5"
                            : "bg-slate-900/50 border border-slate-800 text-gray-400 hover:text-gray-200"
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={`w-4 h-4 transition-transform ${selectedZone === "SEARCH_ALL" ? "scale-110" : "group-hover:scale-110"}`}>
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

            {/* Tips List Display */}
            {selectedZone && (
                <div className="space-y-3">
                    {currentFilteredTips.length === 0 ? (
                        <div className="text-center py-12 bg-gray-900/40 rounded-2xl border border-gray-800/50 border-dashed">
                            <p className="text-gray-500 text-sm">등록된 배송팁이 없습니다.</p>
                        </div>
                    ) : (
                        currentFilteredTips.map(tip => (
                            <div
                                key={tip.id}
                                onClick={() => setViewingTipId(tip.id)}
                                className="bg-slate-900/50 border border-slate-800 p-5 flex items-center justify-between cursor-pointer group active:scale-[0.98] rounded-2xl overflow-hidden"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        {selectedZone === "SEARCH_ALL" && (
                                            <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/20 uppercase">
                                                {tip.zone}
                                            </span>
                                        )}
                                        <p className="text-white font-black text-lg tracking-tight truncate group-hover:text-blue-400 transition-colors select-none">
                                            {tip.address}
                                        </p>
                                    </div>
                                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest opacity-60">
                                        {new Date(tip.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                                {tip.photos && tip.photos.length > 0 && (
                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10 border border-blue-500/20">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modals */}
            <AddTipModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                settings={settings}
                newZone={newZone}
                setNewZone={setNewZone}
                newAddress={newAddress}
                setNewAddress={setNewAddress}
                newContent={newContent}
                setNewContent={setNewContent}
                newPhotos={newPhotos}
                setNewPhotos={setNewPhotos}
                onSave={handleSaveNewTip}
                onCameraCapture={handleCameraCapture}
                loadingSpeech={isSpeechLoading}
                onSpeechIconClick={startSpeechRecognition}
                onFullscreenImage={setFullscreenImage}
            />

            {viewingTip && (
                <TipDetailModal 
                    isOpen={!!viewingTipId}
                    onClose={() => setViewingTipId(null)}
                    tip={viewingTip}
                    settings={settings}
                    editZone={editZone}
                    setEditZone={setEditZone}
                    editAddress={editAddress}
                    setEditAddress={setEditAddress}
                    editContent={editContent}
                    setEditContent={setEditContent}
                    editPhotos={editPhotos}
                    onDelete={handleDeleteExistingTip}
                    onUpdate={handleUpdateExistingTip}
                    onFullscreenImage={setFullscreenImage}
                />
            )}

            {fullscreenImage && (
                <FullScreenImageViewer 
                    src={fullscreenImage} 
                    originalSrc={photoData[fullscreenImage]?.original || fullscreenImage}
                    initialAnnotations={photoData[fullscreenImage]?.annotations || []}
                    onClose={() => setFullscreenImage(null)} 
                    onSave={(newUrl, annotations) => {
                        if (isAddModalOpen) {
                            setNewPhotos(prev => prev.map(p => p === fullscreenImage ? newUrl : p));
                        } else {
                            setEditPhotos(prev => prev.map(p => p === fullscreenImage ? newUrl : p));
                        }
                        
                        // Update photo data mapping
                        setPhotoData(prev => {
                            const next = { ...prev };
                            const original = prev[fullscreenImage]?.original || fullscreenImage;
                            // Clean up old key to prevent memory leak
                            delete next[fullscreenImage];
                            // Link new edited URL to original and annotations
                            next[newUrl] = { original, annotations };
                            return next;
                        });
                        
                        setFullscreenImage(newUrl);
                    }}
                />
            )}
        </div>
    );
}
