"use client";
import { useState, useRef, useCallback } from "react";
import { Zone, DeliveryTip } from "@/lib/types";

interface DeliveryTipsProps {
    zone: Zone;
    onUpdate: (tips: DeliveryTip[]) => void;
    onClose: () => void;
}

/**
 * Compress an image file to a smaller base64 JPEG (max 800px, quality 0.6)
 */
function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
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
                resolve(canvas.toDataURL("image/jpeg", 0.6));
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default function DeliveryTips({ zone, onUpdate, onClose }: DeliveryTipsProps) {
    const tips = zone.tips ?? [];
    const [search, setSearch] = useState("");
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newAddress, setNewAddress] = useState("");
    const [newContent, setNewContent] = useState("");
    const [newContentMode, setNewContentMode] = useState<"text" | "decimal" | "numeric">("text");
    const newContentRef = useRef<HTMLTextAreaElement>(null);
    const [newPhotos, setNewPhotos] = useState<string[]>([]);
    const [viewPhoto, setViewPhoto] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const filtered = search
        ? tips.filter(
            (t) =>
                t.address.toLowerCase().includes(search.toLowerCase()) ||
                t.content.toLowerCase().includes(search.toLowerCase())
        )
        : tips;

    const handleCameraCapture = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>, targetTipId?: string) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;

            const compressed = await compressImage(files[0]);

            if (targetTipId) {
                // Add photo to existing tip
                onUpdate(
                    tips.map((t) =>
                        t.id === targetTipId
                            ? { ...t, photos: [...(t.photos ?? []), compressed] }
                            : t
                    )
                );
            } else {
                // Add to new tip form
                setNewPhotos((prev) => [...prev, compressed]);
            }
            e.target.value = "";
        },
        [tips, onUpdate]
    );

    const handleAdd = () => {
        if (!newAddress.trim() || !newContent.trim()) return;
        const tip: DeliveryTip = {
            id: Date.now().toString(),
            address: newAddress.trim(),
            content: newContent.trim(),
            photos: newPhotos.length > 0 ? newPhotos : undefined,
            createdAt: new Date().toISOString(),
        };
        onUpdate([...tips, tip]);
        setNewAddress("");
        setNewContent("");
        setNewPhotos([]);
        setAdding(false);
    };

    const handleDelete = (id: string) => {
        onUpdate(tips.filter((t) => t.id !== id));
    };

    const handleDeletePhoto = (tipId: string, photoIndex: number) => {
        onUpdate(
            tips.map((t) => {
                if (t.id !== tipId) return t;
                const photos = [...(t.photos ?? [])];
                photos.splice(photoIndex, 1);
                return { ...t, photos: photos.length > 0 ? photos : undefined };
            })
        );
    };

    const handleEditSave = (id: string, address: string, content: string) => {
        onUpdate(
            tips.map((t) =>
                t.id === id ? { ...t, address: address.trim(), content: content.trim() } : t
            )
        );
        setEditingId(null);
    };

    const shareIndividualTip = async (tip: DeliveryTip) => {
        const text = `[배송팁] ${zone.name}\n📍주소: ${tip.address}\n💡내용: ${tip.content}`;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `${tip.address} 배송팁`,
                    text: text,
                });
            } else {
                await navigator.clipboard.writeText(text);
                alert("텍스트가 복사되었습니다. 카톡 등에 붙여넣기 하세요!");
            }
        } catch (err) {
            console.error("Share failed:", err);
        }
    };

    const shareAllAsText = async () => {
        if (tips.length === 0) return;

        let text = `📦 [배송팁 전체 공유] ${zone.name}\n`;
        text += `------------------------\n`;
        tips.forEach((t, idx) => {
            text += `${idx + 1}. ${t.address}\n💡 ${t.content}\n\n`;
        });
        text += `------------------------\n총 ${tips.length}개의 정보가 포함되었습니다.`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: `${zone.name} 배송팁 전체 공유`,
                    text: text,
                });
            } else {
                await navigator.clipboard.writeText(text);
                alert("전체 내용이 복사되었습니다! 카톡창에서 '붙여넣기' 하세요.");
            }
        } catch (err) {
            console.error("Multi-share failed:", err);
        }
    };

    const handleExport = async (includePhotos: boolean = true) => {
        try {
            const tipsToExport = includePhotos ? tips : tips.map(t => ({ ...t, photos: undefined }));
            const exportData = {
                zoneName: zone.name,
                exportedAt: new Date().toISOString(),
                format: includePhotos ? "full_backup" : "text_only",
                tips: tipsToExport,
            };
            const jsonString = JSON.stringify(exportData, null, 2);
            const fileName = `배송팁_${zone.name}_${includePhotos ? "전체" : "텍스트"}_${new Date().toISOString().slice(0, 10)}.json`;

            const sizeInMb = new Blob([jsonString]).size / (1024 * 1024);

            if (includePhotos && sizeInMb > 5) {
                if (!confirm(`사진이 포함되어 용량이 ${sizeInMb.toFixed(1)}MB로 큽니다. 전송 시 시간이 걸릴 수 있습니다. 계속할까요?`)) {
                    return;
                }
            }

            const file = new File([jsonString], fileName, { type: "application/json" });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: `${zone.name} 배송팁 ${includePhotos ? "백업본" : "파일"}`,
                        text: `${zone.name} 구역의 데이터입니다. 카톡 등으로 전달하세요!`,
                    });
                    return;
                } catch (shareErr) {
                    console.warn("Share failed, falling back to download:", shareErr);
                }
            }

            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            alert("공유창을 띄울 수 없어 파일로 저장했습니다. '다운로드' 폴더에서 파일을 찾아 전송해 주세요.");
        } catch (err) {
            console.error("Export error:", err);
            alert("내보내기 중 오류가 발생했습니다.");
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.name.endsWith('.json')) {
            alert("배송팁 백업 파일(.json)만 가져올 수 있습니다.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (data.tips && Array.isArray(data.tips)) {
                    // Filter out invalid items and re-generate IDs to avoid duplicates
                    const importedTips: DeliveryTip[] = data.tips
                        .filter((t: any) => t.address && t.content)
                        .map((t: DeliveryTip) => ({
                            ...t,
                            id: Date.now().toString() + Math.random().toString(36).slice(2),
                        }));

                    if (importedTips.length === 0) {
                        alert("가져올 수 있는 데이터가 없습니다.");
                        return;
                    }

                    onUpdate([...tips, ...importedTips]);
                    alert(`${importedTips.length}개의 배송팁을 가져왔습니다.`);
                } else {
                    alert("가져올 배송팁 데이터가 파일에 없습니다.");
                }
            } catch (err) {
                console.error("Import error:", err);
                alert("파일 읽기 중 오류가 발생했습니다. 올바른 배송팁 파일인지 확인하세요.");
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-end sm:items-center justify-center backdrop-blur-sm">
            <div className="bg-gray-950 w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden mb-[env(safe-area-inset-bottom,0px)] border-t border-gray-800 sm:border">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <div>
                        <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                            <span className="text-xl">💡</span> 배송팁 리스트
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {zone.name} · {tips.length}개
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-xl
                                   bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                {/* Search Bar (Now styled to look clearly like a SEARCH bar) */}
                <div className="px-4 py-3 bg-gray-900/50 border-b border-gray-800">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">🔍</span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="이미 저장된 주소를 검색하세요..."
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-3
                                       text-white text-sm placeholder-gray-600 focus:outline-none
                                       focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Tips List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {filtered.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-600 text-sm">
                                {search ? "검색 결과가 없습니다" : "아직 등록된 배송팁이 없습니다."}
                            </p>
                        </div>
                    )}
                    {filtered.map((tip) =>
                        editingId === tip.id ? (
                            <TipEditRow
                                key={tip.id}
                                tip={tip}
                                onSave={handleEditSave}
                                onCancel={() => setEditingId(null)}
                            />
                        ) : (
                            <div
                                key={tip.id}
                                className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-bold text-gray-100 mb-1">
                                            {tip.address}
                                        </p>
                                        <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                                            {tip.content}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => shareIndividualTip(tip)}
                                            title="카톡으로 내용 전달"
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors border border-blue-500/20"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                                            </svg>
                                        </button>
                                        <label className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800 text-blue-400 hover:bg-gray-700 cursor-pointer transition-colors border border-gray-700">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                            </svg>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="hidden"
                                                onChange={(e) => handleCameraCapture(e, tip.id)}
                                            />
                                        </label>
                                        <button
                                            onClick={() => setEditingId(tip.id)}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors border border-gray-700"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(tip.id)}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800 text-gray-500 hover:bg-red-500/10 hover:text-red-500 transition-colors border border-gray-700"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Photo thumbnails */}
                                {tip.photos && tip.photos.length > 0 && (
                                    <div className="flex gap-2.5 mt-4 overflow-x-auto pb-1 invisible-scrollbar">
                                        {tip.photos.map((photo, i) => (
                                            <div key={i} className="relative shrink-0">
                                                <img
                                                    src={photo}
                                                    alt={`사진 ${i + 1}`}
                                                    onClick={() => setViewPhoto(photo)}
                                                    className="w-20 h-20 object-cover rounded-xl border border-gray-800 cursor-pointer shadow-sm hover:ring-2 hover:ring-blue-500/50 transition-all"
                                                />
                                                <button
                                                    onClick={() => handleDeletePhoto(tip.id, i)}
                                                    className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500
                                                               text-white text-[10px] rounded-full flex items-center
                                                               justify-center font-bold shadow-lg ring-2 ring-gray-950"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>

                {/* New Tip Add Form (Specifically redesigned to look like an INPUT form) */}
                {adding && (
                    <div className="px-5 py-6 bg-gray-900 border-t-2 border-blue-600 space-y-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-blue-500 font-bold text-sm">새로운 배송팁 작성</h3>
                            <button
                                onClick={() => setAdding(false)}
                                className="text-xs text-gray-500 hover:text-white"
                            >
                                닫기 ✕
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold ml-1">주소</label>
                                <input
                                    type="text"
                                    value={newAddress}
                                    onChange={(e) => setNewAddress(e.target.value)}
                                    placeholder="예: 강남아파트 103동"
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3
                                               text-white text-base placeholder-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between ml-1 mb-1">
                                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">꿀팁 내용</label>
                                    <div className="flex gap-1.5 items-center">
                                        <div className="flex gap-1.5 mr-1">
                                            {[
                                                { label: "종", value: "종", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
                                                { label: "#", value: "#" },
                                                { label: "*", value: "*" },
                                                { label: "경열", value: "경열", icon: <div className="relative flex items-center justify-center"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg><svg className="w-2.5 h-2.5 absolute -right-1 -bottom-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg></div> }
                                            ].map((sym) => (
                                                <button
                                                    key={sym.label}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setNewContent(prev => prev + sym.value);
                                                        setNewContentMode("decimal");
                                                    }}
                                                    className="px-3 py-1.5 bg-gray-800 border-2 border-gray-700 rounded-lg text-sm text-blue-400 font-black active:bg-blue-600 active:text-white transition-all shadow-lg flex items-center justify-center min-w-[42px] h-[36px]"
                                                >
                                                    {sym.icon || sym.label}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setNewContentMode(prev => prev === "text" ? "decimal" : "text");
                                            }}
                                            className="px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-400 font-bold ml-1 min-w-[32px]"
                                        >
                                            {newContentMode === "text" ? "123" : "가"}
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    ref={newContentRef}
                                    key={newContentMode} // Force re-render to refresh inputMode on some OS
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    inputMode={newContentMode}
                                    onFocus={(e) => {
                                        // Move cursor to end when forced focus
                                        const val = e.target.value;
                                        e.target.value = "";
                                        e.target.value = val;
                                    }}
                                    placeholder="비밀번호(예: #1234*)나 입구 위치 등..."
                                    rows={3}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3
                                               text-white text-base placeholder-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 resize-none"
                                    autoFocus={newContentMode !== "text"} // Re-focus after key change if numeric
                                />
                            </div>
                        </div>

                        {/* Photo Previews */}
                        {newPhotos.length > 0 && (
                            <div className="flex gap-2.5 overflow-x-auto pb-1">
                                {newPhotos.map((photo, i) => (
                                    <div key={i} className="relative shrink-0">
                                        <img
                                            src={photo}
                                            alt={`사진 ${i + 1}`}
                                            className="w-16 h-16 object-cover rounded-xl border border-gray-800"
                                        />
                                        <button
                                            onClick={() => setNewPhotos((prev) => prev.filter((_, j) => j !== i))}
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500
                                                       text-white text-[10px] rounded-full flex items-center
                                                       justify-center font-bold"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <label className="flex-none w-14 h-14 bg-gray-800 border-2 border-gray-700 rounded-2xl flex items-center justify-center text-blue-400 cursor-pointer active:scale-95 transition-all shadow-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                </svg>
                                <input
                                    ref={cameraInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(e) => handleCameraCapture(e)}
                                />
                            </label>
                            <button
                                onClick={handleAdd}
                                className="flex-1 bg-blue-600 text-white font-bold rounded-2xl shadow-[0_4px_12px_rgba(37,99,235,0.4)] active:scale-95 transition-all"
                            >
                                배송팁 등록하기
                            </button>
                        </div>
                    </div>
                )}

                {/* Bottom Main Action */}
                {!adding && (
                    <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))] border-t border-gray-800 bg-gray-950 shadow-2xl">
                        <button
                            onClick={() => setAdding(true)}
                            className="w-full py-4 bg-blue-600 text-white text-base rounded-2xl
                                       font-bold shadow-[0_0_20px_rgba(37,99,235,0.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="text-xl">+</span> 새로운 배송팁 작성
                        </button>

                        <div className="grid grid-cols-3 gap-2 mt-4">
                            <button
                                onClick={() => handleExport(true)}
                                disabled={tips.length === 0}
                                className="py-3 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[10px] rounded-xl
                                           font-bold disabled:opacity-30 active:scale-95 transition-all"
                            >
                                📥 파일공유<br />(사진포함)
                            </button>
                            <button
                                onClick={() => handleExport(false)}
                                disabled={tips.length === 0}
                                className="py-3 bg-gray-900 border border-gray-800 text-gray-400 text-[10px] rounded-xl
                                           font-medium disabled:opacity-30 active:scale-95 transition-all"
                            >
                                📄 파일공유<br />(사진제외)
                            </button>
                            <button
                                onClick={shareAllAsText}
                                disabled={tips.length === 0}
                                className="py-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] rounded-xl
                                           font-bold disabled:opacity-30 active:scale-95 transition-all"
                            >
                                💬 카톡공유<br />(글로만)
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="col-span-3 py-3 bg-gray-900 border border-gray-800 text-gray-400 text-xs rounded-xl
                                           font-medium active:bg-gray-800 transition-colors"
                            >
                                📤 받은 파일 가져오기
                            </button>
                        </div>
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImport}
                />
            </div>

            {/* Full-screen Photo Viewer */}
            {viewPhoto && (
                <div
                    className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-4 backdrop-blur-md"
                    onClick={() => setViewPhoto(null)}
                >
                    <button
                        className="absolute top-6 right-6 w-12 h-12 bg-white/10 rounded-full
                                   text-white text-xl flex items-center justify-center backdrop-blur-md"
                        onClick={() => setViewPhoto(null)}
                    >
                        ✕
                    </button>
                    <img
                        src={viewPhoto}
                        alt="확대 보기"
                        className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                    />
                </div>
            )}
        </div>
    );
}

function TipEditRow({
    tip,
    onSave,
    onCancel,
}: {
    tip: DeliveryTip;
    onSave: (id: string, address: string, content: string) => void;
    onCancel: () => void;
}) {
    const [address, setAddress] = useState(tip.address);
    const [content, setContent] = useState(tip.content);
    const [contentMode, setContentMode] = useState<"text" | "decimal" | "numeric">("text");
    const contentRef = useRef<HTMLTextAreaElement>(null);

    return (
        <div className="bg-gray-900 border-2 border-blue-500/50 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="space-y-1">
                <label className="text-[10px] text-blue-400 font-bold ml-1">주소 수정</label>
                <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3
                               text-white text-base focus:outline-none focus:border-blue-500"
                />
            </div>
            <div className="space-y-1">
                <div className="flex items-center justify-between ml-1 mb-1">
                    <label className="text-[10px] text-blue-400 font-bold">내용 수정</label>
                    <div className="flex gap-1.5 items-center">
                        <div className="flex gap-1.5 mr-1">
                            {[
                                { label: "종", value: "종", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
                                { label: "#", value: "#" },
                                { label: "*", value: "*" },
                                { label: "경열", value: "경열", icon: <div className="relative flex items-center justify-center"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg><svg className="w-2.5 h-2.5 absolute -right-1 -bottom-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg></div> }
                            ].map((sym) => (
                                <button
                                    key={sym.label}
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setContent(prev => prev + sym.value);
                                        setContentMode("decimal");
                                    }}
                                    className="px-3 py-1.5 bg-gray-900 border-2 border-gray-700 rounded-lg text-sm text-blue-400 font-black active:bg-blue-600 active:text-white transition-all shadow-lg flex items-center justify-center min-w-[42px] h-[36px]"
                                >
                                    {sym.icon || sym.label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setContentMode(prev => prev === "text" ? "decimal" : "text");
                            }}
                            className="px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-400 font-bold ml-1 min-w-[32px]"
                        >
                            {contentMode === "text" ? "123" : "가"}
                        </button>
                    </div>
                </div>
                <textarea
                    ref={contentRef}
                    key={contentMode}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    inputMode={contentMode}
                    onFocus={(e) => {
                        const val = e.target.value;
                        e.target.value = "";
                        e.target.value = val;
                    }}
                    rows={3}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3
                               text-white text-base focus:outline-none focus:border-blue-500 resize-none"
                    autoFocus={contentMode !== "text"}
                />
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => onSave(tip.id, address, content)}
                    className="flex-1 py-3 bg-blue-600 text-white text-sm rounded-xl font-bold shadow-lg active:scale-95 transition-all"
                >
                    변경사항 저장
                </button>
                <button
                    onClick={onCancel}
                    className="py-3 px-6 bg-gray-800 text-gray-400 text-sm rounded-xl"
                >
                    취소
                </button>
            </div>
        </div>
    );
}
