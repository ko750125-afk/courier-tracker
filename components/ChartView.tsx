"use client";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    BarController,
    LineController,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Delivery } from "@/lib/types";
import { calcDayOfWeekAverages } from "@/lib/calculations";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    BarController,
    LineController,
    Tooltip,
    Legend
);

interface ChartViewProps {
    deliveries: Delivery[]; // 이미 월별로 필터링된 배송 데이터
    selectedMonth?: string; // "YYYY-MM" 형식의 선택된 월 (타이틀 표시용)
}

export default function ChartView({ deliveries, selectedMonth }: ChartViewProps) {
    // 선택된 월의 배송 데이터로 요일별 평균 계산
    const dayAvgs = calcDayOfWeekAverages(deliveries);
    const overallAvg =
        dayAvgs.reduce((s, d) => s + d.avg, 0) /
        (dayAvgs.filter((d) => d.avg > 0).length || 1);

    const data = {
        labels: dayAvgs.map((d) => d.label),
        datasets: [
            {
                type: "bar" as const,
                label: "요일별 평균",
                data: dayAvgs.map((d) => d.avg),
                backgroundColor: "rgba(96, 165, 250, 0.4)",
                borderColor: "rgba(96, 165, 250, 0.8)",
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false,
            },
            {
                type: "line" as const,
                label: "평균선",
                data: dayAvgs.map(() => Math.round(overallAvg)),
                borderColor: "rgba(156, 163, 175, 0.5)",
                borderWidth: 1.5,
                borderDash: [6, 4],
                pointRadius: 0,
                fill: false,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: "rgba(17, 24, 39, 0.95)",
                titleColor: "#e5e7eb",
                bodyColor: "#d1d5db",
                padding: 10,
                cornerRadius: 8,
                borderColor: "rgba(55, 65, 81, 0.5)",
                borderWidth: 1,
                callbacks: {
                    label: (ctx: any) => {
                        return `${ctx.dataset.label}: ${ctx.parsed.y}건`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: "rgba(156, 163, 175, 0.6)", font: { size: 13 } },
            },
            y: {
                grid: { color: "rgba(55, 65, 81, 0.3)" },
                ticks: { color: "rgba(156, 163, 175, 0.5)" },
                beginAtZero: true,
            },
        },
    };

    // 선택된 월을 한국어로 표시 (예: "2026-03" → "2026년 3월")
    const monthLabel = selectedMonth
        ? new Date(selectedMonth + "-01").toLocaleDateString("ko-KR", { year: "numeric", month: "long" })
        : null;

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-200">
                    요일별 평균 배송량
                </h3>
                {/* 선택된 월 배지 표시 */}
                {monthLabel && (
                    <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                        {monthLabel}
                    </span>
                )}
            </div>
            <div className="h-56">
                <Bar data={data as any} options={options as any} />
            </div>
            <div className="mt-2 text-center">
                <span className="text-xs text-gray-500">
                    이 달 평균: <span className="text-gray-300 font-semibold">{Math.round(overallAvg)}건</span>
                </span>
            </div>
        </div>
    );
}
