"use client";
import { User } from "firebase/auth";

interface ProfileSectionProps {
    user: User | null;
    loginWithGoogle: () => void;
    logout: () => void;
    handleMigration: () => void;
    isMigrating: boolean;
}

export default function ProfileSection({ 
    user, 
    loginWithGoogle, 
    logout, 
    handleMigration, 
    isMigrating 
}: ProfileSectionProps) {
    return (
        <div className="mb-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-3xl shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl -mr-10 -mt-10 group-hover:bg-blue-600/20 transition-all" />
            
            {user ? (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full border-2 border-blue-500/50 shadow-lg" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                                {user.displayName?.charAt(0) || "U"}
                            </div>
                        )}
                        <div>
                            <h2 className="text-slate-100 font-bold mb-0.5">{user.displayName || "사용자"}</h2>
                            <p className="text-slate-500 text-xs">{user.email}</p>
                        </div>
                    </div>
                    <button 
                        onClick={logout}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-all"
                    >
                        로그아웃
                    </button>
                </div>
            ) : (
                <div className="text-center py-2">
                    <h2 className="text-slate-100 font-bold mb-2">데이터 클라우드 저장</h2>
                    <p className="text-slate-500 text-xs mb-6 px-4">
                        구글로 로그인하면 기기를 바꿔도 데이터가 안전하게 유지됩니다.
                    </p>
                    <button 
                        onClick={loginWithGoogle}
                        className="w-full py-4 bg-white text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-slate-100 shadow-xl"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        구글로 시작하기
                    </button>
                </div>
            )}

            {user && (
                <div className="mt-8 pt-6 border-t border-slate-800/50">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold text-blue-400">데이터 연동 내역</span>
                        <div className="h-px flex-1 bg-slate-800/50" />
                    </div>
                    <p className="text-[10px] text-slate-500 mb-4">
                        로그인 전 이 기기에 저장된 기록이 있다면 계정으로 옮겨보세요.
                    </p>
                    <button 
                        onClick={handleMigration}
                        disabled={isMigrating}
                        className={`w-full py-3 rounded-xl text-xs font-bold transition-all border ${
                            isMigrating 
                                ? "bg-slate-900 text-slate-600 border-slate-800" 
                                : "bg-blue-600/10 text-blue-400 border-blue-500/20 hover:bg-blue-600/20 active:scale-[0.98]"
                        }`}
                    >
                        {isMigrating ? "기록 옮기는 중..." : "지금 기기 기록을 계정으로 합치기"}
                    </button>
                </div>
            )}
        </div>
    );
}
