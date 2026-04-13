"use client";
import { Settings } from "@/lib/types";

interface SyncSectionProps {
    settings: Settings;
    onUpdate: (updates: Partial<Settings>) => void;
    handleManualSync: () => void;
    isSyncing: boolean;
    lastSyncTime: string | null;
}

export default function SyncSection({
    settings,
    onUpdate,
    handleManualSync,
    isSyncing,
    lastSyncTime
}: SyncSectionProps) {
    return (
        <div id="guide-settings-sharedid" className="mt-8 pt-8 border-t border-gray-800">
            <div className="flex items-center gap-2 mb-3">
                <h3 className="text-base font-bold text-gray-200">데이터 공유 (2인 1조)</h3>
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold rounded-full border border-indigo-500/20">
                    CLOUD
                </span>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                동일한 '공유 ID'를 입력하면 다른 기기와 실시간으로 데이터를 공유할 수 있습니다.
                <br />
                <span className="text-blue-400 font-medium block mt-1">
                    ✨ 모바일 기기의 데이터를 '원본'으로 사용하여 동기화됩니다.
                </span>
            </p>
            <div className="space-y-4">
                <input
                    type="text"
                    value={settings.sharedId ?? ""}
                    onChange={(e) => onUpdate({ sharedId: e.target.value.trim() || undefined })}
                    autoComplete="off"
                    spellCheck="false"
                    placeholder="공유할 이름을 입력하세요 (예: kopo75)"
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3
                     text-white text-base focus:outline-none focus:border-blue-500/50 transition-all duration-300"
                />

                {settings.sharedId && (
                    <div className="space-y-2">
                        <button
                            onClick={handleManualSync}
                            disabled={isSyncing}
                            className={`w-full py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
                                ${isSyncing 
                                    ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                                    : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg active:scale-[0.98] hover:shadow-blue-500/20"
                                }`}
                        >
                            {isSyncing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                                    <span>모바일 데이터 동기화 중...</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span>지금 동기화 (모바일 데이터 불러오기)</span>
                                </>
                            )}
                        </button>
                        {lastSyncTime && (
                            <p className="text-[10px] text-center text-gray-600">
                                마지막 동기화 시각: {lastSyncTime}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
