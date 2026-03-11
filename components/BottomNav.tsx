"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
    {
        href: "/",
        label: "홈",
        icon: (active: boolean) => (
            <svg
                className={`w-6 h-6 ${active ? "text-blue-400" : "text-gray-500"}`}
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
                className={`w-6 h-6 ${active ? "text-blue-400" : "text-gray-500"}`}
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
        href: "/tips",
        label: "배송팁",
        icon: (active: boolean) => (
            <svg
                className={`w-6 h-6 ${active ? "text-blue-400" : "text-gray-500"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
            </svg>
        ),
    },
    {
        href: "/settings",
        label: "설정",
        icon: (active: boolean) => (
            <svg
                className={`w-6 h-6 ${active ? "text-blue-400" : "text-gray-500"}`}
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

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl border-t border-gray-800">
            <div className="max-w-lg mx-auto flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                {tabs.map((tab) => {
                    const active = pathname === tab.href;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            id={`guide-nav-${tab.href === "/" ? "home" : tab.href.replace("/", "")}`}
                            className={`relative flex flex-col items-center gap-1 min-w-[64px] px-3 py-2 rounded-2xl transition-all duration-300 ${active ? "text-blue-400 bg-blue-500/10" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                                }`}
                        >
                            <div className="relative z-10 transition-transform duration-300">
                                {tab.icon(active)}
                            </div>
                            <span className={`text-[10px] sm:text-xs font-semibold tracking-wide z-10 ${active ? "text-blue-400" : "text-gray-500"}`}>{tab.label}</span>
                            {active && (
                                <div className="absolute inset-0 bg-blue-500/5 blur-md rounded-2xl -z-0"></div>
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
