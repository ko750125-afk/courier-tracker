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
        description: "일간 실적과 월간 예상 매출을 한눈에 확인하세요. 이번 달 목표 수익까지 얼마나 남았는지 스마트하게 계산해 드립니다.",
        image: "/onboarding/step2.png",
    },
    {
        title: "나만의 배송 족보",
        description: "아파트 비번, 입구 위치 등 헷갈리는 정보는 사진과 함께 메모해두세요. 주소만 검색하면 바로 나옵니다.",
        image: "/onboarding/step3.png",
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
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-6 backdrop-blur-md">
            <div className="bg-gray-900 w-full max-w-sm rounded-[32px] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300">
                {/* Image Section */}
                <div className="relative aspect-[4/3] bg-gray-800">
                    <Image
                        src={STEPS[step].image}
                        alt={STEPS[step].title}
                        fill
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                </div>

                {/* Content Section */}
                <div className="px-8 pb-8 flex flex-col items-center text-center -mt-4 relative z-10">
                    {/* Indicators */}
                    <div className="flex gap-1.5 mb-6">
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? "w-6 bg-blue-500" : "w-1.5 bg-gray-700"
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
                        className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg
                                   shadow-blue-600/20 active:scale-95 transition-all text-base"
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
