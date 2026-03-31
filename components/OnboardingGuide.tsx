"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

const STEPS = [
    {
        title: "실시간 배송 기록",
        description: "배송을 마칠 때마다 버튼 한 번으로 간편하게 기록하세요. 구역별 비율에 따라 자동으로 수량이 계산됩니다.",
        image: "/onboarding/step1.png",
    },
    {
        title: "정확한 실적 분석",
        description: "일간·월간 예상 수익을 한눈에 확인하세요. 정산일 기준으로 이번 달 예상 배송비도 자동 계산됩니다.",
        image: "/onboarding/step2.png",
    },
];

export default function OnboardingGuide() {
    const [show, setShow] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const hasSeen = localStorage.getItem("onboarding_v1");
        if (!hasSeen) {
            setShow(true);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem("onboarding_v1", "true");
        setShow(false);
        window.dispatchEvent(new Event("start_functional_guide"));
    };

    const next = () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            handleClose();
        }
    };

    if (!show) return null;

    return (
        // 카카오톡 인앱 브라우저 호환: flex 대신 절대 위치 + margin auto
        // flex items-center justify-center가 인앱 브라우저에서 뷰포트 오계산될 수 있어 대체
        <div
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md"
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
            {/* 카드: 좌우 여백 24px씩, 중앙 정렬 보장 */}
            <div
                className="bg-gray-900 rounded-[32px] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300"
                style={{ width: "calc(100vw - 48px)", maxWidth: "384px" }}
            >
                {/* 이미지 영역 */}
                <div className="relative aspect-[4/3] bg-gray-800">
                    <Image
                        src={STEPS[step].image}
                        alt={STEPS[step].title}
                        fill
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                </div>

                {/* 텍스트 + 버튼 영역 */}
                <div className="px-8 pb-8 flex flex-col items-center text-center -mt-4 relative z-10">
                    {/* 단계 인디케이터 */}
                    <div className="flex gap-1.5 mb-6">
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    step === i ? "w-6 bg-blue-500" : "w-1.5 bg-gray-700"
                                }`}
                            />
                        ))}
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
                        {STEPS[step].title}
                    </h2>
                    <p className="text-gray-400 text-sm leading-relaxed mb-8">
                        {STEPS[step].description}
                    </p>

                    <button
                        onClick={next}
                        className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all text-base"
                    >
                        {step === STEPS.length - 1 ? "시작하기" : "다음"}
                    </button>

                    {step < STEPS.length - 1 && (
                        <button
                            onClick={handleClose}
                            className="mt-4 text-xs text-gray-600 hover:text-gray-400"
                        >
                            건너뛰기
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
