"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSound } from "@/lib/hooks/useSound";
import { loadSettings } from "@/lib/store";

const tabs = [
    {
        href: "/",
        label: "홈",
        icon: (active: boolean) => (
            <svg
                className={`w-6 h-6 ${active ? "text-blue-400" : "text-slate-500"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"
                />
            </svg>
        ),
    },
    {
        href: "/stats",
        label: "통계",
        icon: (active: boolean) => (
            <svg
                className={`w-6 h-6 ${active ? "text-blue-400" : "text-slate-500"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m6 0h6m-6 0V9a2 2 0 012-2h2a2 2 0 012 2v10m6 0v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4"
                />
            </svg>
        ),
    },
    {
        href: "/settlements",
        label: "정산",
        icon: (active: boolean) => (
            <svg
                className={`w-6 h-6 ${active ? "text-blue-400" : "text-slate-500"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
            </svg>
        ),
    },
    {
        href: "/settings",
        label: "설정",
        icon: (active: boolean) => (
            <svg
                className={`w-6 h-6 ${active ? "text-blue-400" : "text-slate-500"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
            </svg>
        ),
    },
];

export default function BottomNav() {
    const pathname = usePathname();
    const [soundEnabled, setSoundEnabled] = useState(false);
    const { play } = useSound(soundEnabled);

    useEffect(() => {
        loadSettings().then(s => setSoundEnabled(!!s.useSoundEffects));
    }, [pathname]); // Refresh on navigation just in case

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/40 backdrop-blur-2xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
            <div className="max-w-lg mx-auto flex justify-around py-3">
                {tabs.map((tab) => {
                    const active = pathname === tab.href;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            id={`guide-nav-${tab.href === "/" ? "home" : tab.href.replace("/", "")}`}
                            onClick={() => play()}
                            className="relative flex flex-col items-center gap-1.5 min-w-[70px] px-1 py-1 rounded-2xl transition-all duration-500"
                        >
                            {/* Active background glow */}
                            {active && (
                                <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full scale-110 animate-pulse"></div>
                            )}
                            
                            <div className={`relative z-10 transition-all duration-500 ${active ? "scale-110 -translate-y-1" : "scale-100 translate-y-0"}`}>
                                <div className={`relative ${active ? "drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" : ""}`}>
                                    {tab.icon(active)}
                                </div>
                            </div>
                            
                            <span className={`text-[10px] font-black uppercase tracking-widest z-10 transition-colors duration-500 ${active ? "text-blue-400" : "text-slate-500"}`}>
                                {tab.label}
                            </span>

                            {/* Active indicator dot */}
                            {active && (
                                <div className="absolute -bottom-1 w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,1)]"></div>
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
