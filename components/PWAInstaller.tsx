"use client";
import { useState, useEffect } from "react";

export default function PWAInstaller() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsInstalled(true);
        }

        const handleBeforeInstallPrompt = (e: any) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
            console.log('PWA was installed');
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            alert("이미 설치되어 있거나, 브라우저 메뉴에서 '홈 화면에 추가' 또는 '설치'를 선택해 주세요.");
            return;
        }
        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
    };

    if (isInstalled) return null;

    return (
        <div className="mt-8 pt-8 border-t border-white/5" id="guide-install-app">
            <h3 className="text-base font-black text-slate-200 uppercase tracking-tight mb-3">앱 설치</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed font-bold">
                스마트폰에 앱으로 설치하면 더 빠르고 편리하게 이용할 수 있습니다.
            </p>
            <button
                onClick={handleInstallClick}
                className="w-full py-4 glass-card bg-blue-500/10 border-blue-500/30 text-blue-400 font-black uppercase tracking-widest text-sm
                           active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/10"
            >
                <span className="text-xl">📱</span> 스마트폰에 앱 설치하기
            </button>
            <p className="mt-2 text-[10px] text-slate-600 text-center font-bold">
                * 설치가 안 될 경우 브라우저 메뉴의 '앱 설치'를 이용해 주세요.
            </p>
        </div>
    );
}
