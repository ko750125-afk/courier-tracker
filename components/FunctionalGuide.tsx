"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

const GUIDE_STEPS = [
    {
        id: "guide-input-section",
        title: "배송 수량 입력",
        text: "오늘 배송하신 '총 수량'을 여기에 입력하세요. 설정하신 구역별 단가와 비율에 따라 매출이 자동 계산됩니다.",
        position: "bottom",
        path: "/"
    },
    {
        id: "guide-today-revenue",
        title: "오늘의 수입",
        text: "수량을 입력하면 즉시 계산되는 오늘 하루의 실시간 매출입니다.",
        position: "top",
        path: "/"
    },
    {
        id: "guide-monthly-prediction",
        title: "월 예상 매출",
        text: "현재까지의 평균 배송량과 남은 근무일을 계산해, 이번 달 총 수입이 얼마가 될지 예측해 드립니다.",
        position: "top",
        path: "/"
    },
    {
        id: "guide-nav-stats",
        title: "통계 메뉴",
        text: "이 버튼을 눌러 상세한 매출 통계 페이지로 이동해 볼까요?",
        position: "top",
        path: "/"
    },
    {
        id: "guide-month-selector",
        title: "월별 기록 확인",
        text: "이전 달의 배송 기록과 수입도 여기서 간편하게 선택해서 확인할 수 있습니다.",
        position: "bottom",
        path: "/stats"
    },
    {
        id: "guide-stats-summary",
        title: "월간 합계",
        text: "이번 달 총 배송 건수와 총 매출액을 한눈에 확인하세요.",
        position: "bottom",
        path: "/stats"
    },
    {
        id: "guide-nav-settings",
        title: "환경 설정",
        text: "이제 구역 단가나 근무 방식을 설정하는 페이지로 가보겠습니다.",
        position: "top",
        path: "/stats"
    },
    {
        id: "guide-settings-zones",
        title: "구역 및 단가 설정",
        text: "배송 구역별로 다른 단가와 배정 비율(%)을 입력하세요. 비율 합계는 꼭 100%가 되어야 합니다.",
        position: "bottom",
        path: "/settings"
    },
    {
        id: "guide-settings-worktype",
        title: "근무 패턴 설정",
        text: "주 5일, 주 6일 또는 사용자 지정 근무 일수를 설정해 정확한 월 매출 예측을 도와줍니다.",
        position: "top",
        path: "/settings"
    },
    {
        id: "guide-settings-sharedid",
        title: "실시간 데이터 공유",
        text: "2인 1조로 근무하신다면 동일한 '공유 ID'를 입력해 보세요. 다른 폰과 데이터가 실시간으로 동기화됩니다.",
        position: "top",
        path: "/settings"
    }
];

export default function FunctionalGuide() {
    const router = useRouter();
    const pathname = usePathname();
    const [active, setActive] = useState(false);
    const [step, setStep] = useState(0);
    const [box, setBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

    const updateBox = useCallback(() => {
        const current = GUIDE_STEPS[step];
        // If element is not on current page, we'll wait for navigation to complete
        if (current.path && pathname !== current.path) {
            setBox(null);
            return;
        }

        const el = document.getElementById(current.id);
        if (el) {
            const rect = el.getBoundingClientRect();
            setBox(prev => {
                if (prev && prev.top === rect.top && prev.left === rect.left && prev.width === rect.width && prev.height === rect.height) {
                    return prev;
                }
                return {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                };
            });
        } else {
            setBox(null);
        }
    }, [step, pathname]);

    useEffect(() => {
        let timer: NodeJS.Timeout;

        const checkAndStart = () => {
            const hasSeen = localStorage.getItem("functional_guide_v1");
            const onboardingDone = localStorage.getItem("onboarding_v1");

            if (onboardingDone && !hasSeen && !active) {
                // Give a small delay for page to settle
                timer = setTimeout(() => {
                    setActive(true);
                    updateBox();
                }, 500);
            }
        };

        // Check initially on mount or deps change
        checkAndStart();

        // Listen for event from OnboardingGuide completion
        window.addEventListener("start_functional_guide", checkAndStart);

        return () => {
            window.removeEventListener("start_functional_guide", checkAndStart);
            if (timer) clearTimeout(timer);
        };
    }, [updateBox, active]);

    // 1. 박스 추적 및 업데이트
    useEffect(() => {
        if (active) {
            updateBox();
            const interval = setInterval(updateBox, 100);
            window.addEventListener("resize", updateBox);
            window.addEventListener("scroll", updateBox);
            return () => {
                clearInterval(interval);
                window.removeEventListener("resize", updateBox);
                window.removeEventListener("scroll", updateBox);
            };
        }
    }, [active, updateBox]);

    // 2. 요소 위치로 스크롤 (스텝 이동 시에만)
    useEffect(() => {
        if (!active) return;
        const timer = setTimeout(() => {
            const current = GUIDE_STEPS[step];
            const el = document.getElementById(current.id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [active, step]);

    // 3. 만약 라우팅이 변경된 경우 현재 페이지에 맞는 첫 번째 스텝으로 자동 동기화
    useEffect(() => {
        if (!active) return;
        const current = GUIDE_STEPS[step];

        if (current.path && pathname !== current.path) {
            const firstStepForPath = GUIDE_STEPS.findIndex(s => s.path === pathname);
            if (firstStepForPath !== -1) {
                setStep(firstStepForPath);
            }
        }
    }, [pathname, step, active]);

    const next = () => {
        if (step < GUIDE_STEPS.length - 1) {
            const nextStep = step + 1;
            const nextConfig = GUIDE_STEPS[nextStep];

            if (nextConfig.path && nextConfig.path !== pathname) {
                // 페이지 이동만 시킴. 스텝 동기화(setStep)는 useEffect가 담당함.
                router.push(nextConfig.path);
            } else {
                setStep(nextStep);
            }
        } else {
            localStorage.setItem("functional_guide_v1", "true");
            setActive(false);
        }
    };

    const skip = () => {
        localStorage.setItem("functional_guide_v1", "true");
        setActive(false);
    };

    if (!active || !box) return null;

    const current = GUIDE_STEPS[step];

    return (
        <div className="fixed inset-0 z-[300] pointer-events-none">
            {/* Dark Overlay with Hole */}
            <div className="absolute inset-0 bg-black/60 pointer-events-auto" style={{
                clipPath: `polygon(
                    0% 0%, 0% 100%, 100% 100%, 100% 0%,
                    ${box.left}px 0%, 
                    ${box.left}px ${box.top}px, 
                    ${box.left + box.width}px ${box.top}px, 
                    ${box.left + box.width}px ${box.top + box.height}px, 
                    ${box.left}px ${box.top + box.height}px, 
                    ${box.left}px ${box.top}px, 
                    ${box.left}px 0%
                )`
            }} />

            {/* Highlight Box Ring */}
            <div
                className="absolute border-2 border-blue-500 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                style={{
                    top: box.top - 4,
                    left: box.left - 4,
                    width: box.width + 8,
                    height: box.height + 8,
                }}
            />

            {/* Tooltip */}
            <div
                className="absolute w-[280px] pointer-events-auto transition-all duration-300"
                style={{
                    left: Math.max(20, Math.min(window.innerWidth - 300, box.left + box.width / 2 - 140)),
                    top: current.position === "bottom" ? box.top + box.height + 20 : box.top - 180,
                }}
            >
                <div className="bg-blue-600 rounded-2xl p-5 shadow-2xl relative animate-in fade-in slide-in-from-bottom-2">
                    {/* Arrow */}
                    <div className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-600 rotate-45 ${current.position === "bottom" ? "-top-2" : "-bottom-2"
                        }`} />

                    <h4 className="text-white font-bold mb-1">{current.title}</h4>
                    <p className="text-blue-50/80 text-xs leading-relaxed mb-4">
                        {current.text}
                    </p>

                    <div className="flex items-center justify-between">
                        <button onClick={skip} className="text-[10px] text-blue-200 uppercase font-bold tracking-widest hover:text-white">건너뛰기</button>
                        <button
                            onClick={next}
                            className="bg-white text-blue-600 text-xs font-bold px-4 py-2 rounded-lg active:scale-95 transition-all shadow-sm"
                        >
                            {step === GUIDE_STEPS.length - 1 ? "이해했습니다" : "다음 →"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
