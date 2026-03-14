export interface DeliveryTip {
    id: string;
    address: string;
    content: string;
    photos?: string[]; // base64 data URLs from camera
    createdAt: string; // ISO date
    zone?: string; // 상세 구역
}

export interface Zone {
    id: string;
    name: string;
    price: number;
    ratio: number; // 0~1 (e.g. 0.5 = 50%)
    tips?: DeliveryTip[];
}

export interface Delivery {
    date: string; // YYYY-MM-DD
    total: number;
}

export type WorkType = "5day" | "6day" | "alternate5" | "custom";
export type WorkShift = "day" | "night";

export interface Settings {
    zones: Zone[];
    workType: WorkType;
    customWorkDays?: number; // only used when workType is "custom"
    payDay: number; // 월급일 (default: 20)
    settlementDay: number; // 정산 시작일 (default: 25)
    sharedId?: string; // 공유 ID (for 2인1조 or multiple devices)
    restDaysOfWeek: number[]; // 기본으로 쉬는 요일 (0: 일요일, 1: 월요일, ..., 6: 토요일)
    restDateOverrides: Record<string, boolean>; // 특정 날짜 지정 휴무 여부. 키: "YYYY-MM-DD", 값: true(휴일), false(근무일(강제))
    tipZones: string[]; // 배송팁 상세 구역 관리
    workShift: WorkShift; // 근무 시간 (주간/야간)
    // 쿠팡 인센티브 관련
    isCoupangMode?: boolean;
    linkedIncentive?: number;
    soloIncentive?: number;
    useLinkedIncentive?: boolean;
    useSoloIncentive?: boolean;
    useSoundEffects?: boolean;
}

export interface DailyBreakdown {
    date: string;
    count: number;
    baseRevenue: number;
    incentive: number;
    total: number;
}

export interface SettlementZoneSummary {
    zoneName: string;
    basePrice: number;
    incentivePerUnit: number;
    totalPrice: number;
    totalCount: number;
    subtotal: number;
}

export interface SettlementBreakdown {
    totalamount: number;
    baseTotal: number;
    incentiveTotal: number;
    days: DailyBreakdown[];
    zoneSummaries: SettlementZoneSummary[];
}

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
    "5day": "주5일",
    "6day": "주6일",
    "alternate5": "격주5일",
    "custom": "직접 설정",
};

export const DEFAULT_ZONES: Zone[] = [
    { id: "1", name: "408BC", price: 850, ratio: 0.5, tips: [] },
    { id: "2", name: "512A", price: 900, ratio: 0.5, tips: [] },
];

export const DEFAULT_SETTINGS: Settings = {
    zones: DEFAULT_ZONES,
    workType: "5day",
    payDay: 20,
    settlementDay: 25,
    restDaysOfWeek: [0], // 기본적으로 일요일(0)을 쉬는 날로 설정
    restDateOverrides: {},
    tipZones: [],
    workShift: "day",
    isCoupangMode: false,
    linkedIncentive: 0,
    soloIncentive: 0,
    useLinkedIncentive: false,
    useSoloIncentive: false,
    useSoundEffects: false,
};

export const TEST_DELIVERIES: Delivery[] = [
    { date: "2026-03-01", total: 120 },
    { date: "2026-03-02", total: 135 },
    { date: "2026-03-03", total: 142 },
    { date: "2026-03-04", total: 155 },
    { date: "2026-03-05", total: 160 },
];
