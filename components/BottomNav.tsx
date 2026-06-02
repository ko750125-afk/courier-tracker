"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSound } from "@/lib/hooks/useSound";
import { loadSettings } from "@/lib/store";
import { Home, BarChart2, Settings as SettingsIcon } from "lucide-react";

const tabs = [
    {
        href: "/",
        label: "홈",
        icon: (active: boolean) => (
            <Home className={`w-6 h-6 ${active ? "text-blue-400" : "text-slate-500"}`} strokeWidth={active ? 2.5 : 2} />
        ),
    },
    {
        href: "/stats",
        label: "통계",
        icon: (active: boolean) => (
            <BarChart2 className={`w-6 h-6 ${active ? "text-blue-400" : "text-slate-500"}`} strokeWidth={active ? 2.5 : 2} />
        ),
    },
    {
        href: "/settings",
        label: "설정",
        icon: (active: boolean) => (
            <SettingsIcon className={`w-6 h-6 ${active ? "text-blue-400" : "text-slate-500"}`} strokeWidth={active ? 2.5 : 2} />
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
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/60 backdrop-blur-2xl border-t border-white/5 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
            <div className="max-w-lg mx-auto flex justify-around py-2">
                {tabs.map((tab) => {
                    // Consider "/settlements" as part of stats active state if user navigates there directly before we remove it
                    const active = pathname === tab.href || (tab.href === "/stats" && pathname === "/settlements");
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            id={`guide-nav-${tab.href === "/" ? "home" : tab.href.replace("/", "")}`}
                            onClick={() => play()}
                            className="relative flex flex-col items-center gap-1 min-w-[70px] px-1 py-1 rounded-2xl transition-all duration-300"
                        >
                            {/* Active background glow */}
                            {active && (
                                <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full scale-110 animate-pulse"></div>
                            )}
                            
                            <div className={`relative z-10 transition-all duration-300 ${active ? "scale-110 -translate-y-1" : "scale-100 translate-y-0"}`}>
                                <div className={`relative ${active ? "drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]" : ""}`}>
                                    {tab.icon(active)}
                                </div>
                            </div>
                            
                            <span className={`text-[10px] font-bold tracking-widest z-10 transition-colors duration-300 ${active ? "text-blue-400" : "text-slate-500"}`}>
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
