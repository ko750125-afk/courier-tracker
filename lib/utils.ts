import { WorkShift } from "./types";

/**
 * 야간 근무자 보정 로직을 포함한 작업 날짜 계산
 * @param shift 근무 시간 (day/night)
 * @param date 기준 날짜 (기본값: 현재)
 */
export function getWorkingDate(shift: WorkShift, date: Date = new Date()): Date {
    const workingDate = new Date(date);
    // 야간 근무자이고 정오(12시) 이전이면 전날 실적으로 처리
    if (shift === "night" && workingDate.getHours() < 12) {
        workingDate.setDate(workingDate.getDate() - 1);
    }
    return workingDate;
}

/**
 * Date 객체를 YYYY-MM-DD 형식의 문자열로 변환
 */
export function formatDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/**
 * 한국어 요일 라벨 반환
 */
export function getDayLabel(date: Date): string {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return days[date.getDay()];
}

/**
 * 지연 실행 (디바운스 등에서 사용)
 */
export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
