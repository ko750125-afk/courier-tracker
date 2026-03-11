import { Zone, Delivery, WorkType, Settings } from "./types";

/**
 * Calculate revenue for a single day's deliveries
 */
export function calcDailyRevenue(total: number, zones: Zone[], settings?: Settings): number {
    if (!zones || !Array.isArray(zones)) return 0;

    let bonus = 0;
    if (settings?.isCoupangMode) {
        if (settings.useLinkedIncentive) bonus += settings.linkedIncentive || 0;
        if (settings.useSoloIncentive) bonus += settings.soloIncentive || 0;
    }

    return zones.reduce((sum, zone) => {
        if (!zone) return sum;
        const count = Math.round((total || 0) * (zone.ratio || 0));
        const finalPrice = (zone.price || 0) + bonus;
        return sum + count * finalPrice;
    }, 0);
}

/**
 * Calculate zone breakdown for a delivery
 */
export function calcZoneBreakdown(
    total: number,
    zones: Zone[]
): { zone: Zone; count: number; revenue: number }[] {
    if (!zones || !Array.isArray(zones)) return [];
    return zones.map((zone) => {
        const count = Math.round((total || 0) * (zone.ratio || 0));
        return { zone, count, revenue: count * (zone.price || 0) };
    });
}

/**
 * Calculate monthly stats from deliveries
 */
export function calcMonthlyStats(
    deliveries: Delivery[],
    zones: Zone[],
    year: number,
    month: number,
    settings?: Settings
): { totalDeliveries: number; totalRevenue: number } {
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    const monthDeliveries = (deliveries || []).filter((d) => d && d.date && d.date.startsWith(monthStr));
    const totalDeliveries = monthDeliveries.reduce((s, d) => s + (d.total || 0), 0);
    const totalRevenue = monthDeliveries.reduce(
        (s, d) => s + calcDailyRevenue(d.total, zones, settings),
        0
    );
    return { totalDeliveries, totalRevenue };
}

/**
 * Get work days per month based on work type
 */
export function getWorkDaysPerMonth(
    workType: WorkType,
    customWorkDays?: number
): number {
    switch (workType) {
        case "5day":
            return 22;
        case "6day":
            return 26;
        case "alternate5":
            return 24;
        case "custom":
            return customWorkDays ?? 22;
        default:
            return 22;
    }
}

/**
 * Calculate remaining work days in month
 */
export function getRemainingWorkDays(
    deliveries: Delivery[],
    workType: WorkType,
    year: number,
    month: number,
    customWorkDays?: number
): number {
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    const workedDays = (deliveries || []).filter((d) => d && d.date && d.date.startsWith(monthStr)).length;
    const totalWorkDays = getWorkDaysPerMonth(workType, customWorkDays);
    return Math.max(0, totalWorkDays - workedDays);
}

/**
 * Calculate estimated monthly earnings
 */
export function calcEstimatedEarnings(
    deliveries: Delivery[],
    zones: Zone[],
    workType: WorkType,
    year: number,
    month: number,
    settings: Settings
): { estimatedDeliveries: number; estimatedRevenue: number; dailyAvg: number } {
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    const monthDeliveries = (deliveries || []).filter((d) => d && d.date && d.date.startsWith(monthStr));

    if (monthDeliveries.length === 0) {
        return { estimatedDeliveries: 0, estimatedRevenue: 0, dailyAvg: 0 };
    }

    const totalSoFar = monthDeliveries.reduce((s, d) => s + (d.total || 0), 0);
    const dailyAvg = Math.round(totalSoFar / monthDeliveries.length);
    const remaining = getRemainingWorkDays(
        deliveries,
        workType,
        year,
        month,
        settings.customWorkDays
    );
    const estimatedRemaining = dailyAvg * remaining;
    const estimatedDeliveries = totalSoFar + estimatedRemaining;

    const monthlyStats = calcMonthlyStats(deliveries || [], zones || [], year, month, settings);
    const avgRevenuePerDelivery = totalSoFar > 0 ? monthlyStats.totalRevenue / totalSoFar : 0;
    const betterEstimatedRevenue = Math.round(
        avgRevenuePerDelivery * estimatedDeliveries
    );

    return {
        estimatedDeliveries,
        estimatedRevenue: betterEstimatedRevenue,
        dailyAvg,
    };
}

/**
 * Calculate next payment amount
 */
export function calcNextPayment(
    deliveries: Delivery[],
    zones: Zone[],
    today: Date,
    settings: Settings
): { amount: number; paymentDate: string; paymentLabel: string; periodStart: string; periodEnd: string } {
    const settlementDay = settings.settlementDay || 25;
    const payDay = settings.payDay || 20;
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // 1-indexed
    const date = today.getDate();

    let pSYear, pSMonth, pSDay;
    let pEYear, pEMonth, pEDay;
    let payY, payM;

    // Logic: If today >= settlementDay, we are in the period for the payment in "Month + 2"
    // Example: Today March 26, settlementDay 25.
    // Ongoing period: March 25 ~ April 24.
    // This will be paid on May 20.

    // Most users want to see the "Current Accumulating Period"
    if (date < settlementDay) {
        // We are currently in the period starting last month to this month
        // e.g., Feb 25 ~ March 24 (if today is March 11)
        const start = new Date(year, month - 2, settlementDay);
        pSYear = start.getFullYear(); pSMonth = start.getMonth() + 1; pSDay = settlementDay;

        const end = new Date(year, month - 1, settlementDay - 1);
        pEYear = end.getFullYear(); pEMonth = end.getMonth() + 1; pEDay = settlementDay - 1;

        // This will be paid on April 20 (Month + 1)
        const pay = new Date(year, month, payDay);
        payY = pay.getFullYear(); payM = pay.getMonth() + 1;
    } else {
        // We are in the period starting this month to next month
        // e.g., March 25 ~ April 24 (if today is March 26)
        pSYear = year; pSMonth = month; pSDay = settlementDay;

        const end = new Date(year, month, settlementDay - 1); // This automatically handles month overflow
        pEYear = end.getFullYear(); pEMonth = end.getMonth() + 1; pEDay = settlementDay - 1;

        // This will be paid on May 20 (Month + 2)
        const pay = new Date(year, month + 1, payDay);
        payY = pay.getFullYear(); payM = pay.getMonth() + 1;
    }

    const periodStart = `${pSYear}-${String(pSMonth).padStart(2, "0")}-${String(pSDay).padStart(2, "0")}`;
    const periodEnd = `${pEYear}-${String(pEMonth).padStart(2, "0")}-${String(pEDay).padStart(2, "0")}`;

    const periodDeliveries = (deliveries || []).filter(
        (d) => d && d.date >= periodStart && d.date <= periodEnd
    );

    const amount = periodDeliveries.reduce(
        (s, d) => s + calcDailyRevenue(d.total, zones, settings),
        0
    );

    const paymentDate = `${payY}-${String(payM).padStart(2, "0")}-${String(payDay).padStart(2, "0")}`;
    const paymentLabel = `${payM}월 ${payDay}일 예상 수령액`;

    return { amount, paymentDate, paymentLabel, periodStart, periodEnd };
}

/**
 * Calculate day-of-week averages
 */
export function calcDayOfWeekAverages(
    deliveries: Delivery[]
): { day: number; label: string; avg: number }[] {
    const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
    const dayBuckets: Delivery[][] = [[], [], [], [], [], [], []];

    (deliveries || []).forEach((d) => {
        if (!d || !d.date) return;
        const safeDateStr = d.date.replace(/-/g, "/");
        const date = new Date(safeDateStr + " 00:00:00");
        const day = date.getDay();
        if (!isNaN(day) && day >= 0 && day <= 6) {
            dayBuckets[day].push(d);
        }
    });

    const ordered = [1, 2, 3, 4, 5, 6, 0];
    return ordered.map((day) => {
        const bucket = dayBuckets[day] || [];
        const recent = [...bucket]
            .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
            .slice(0, 10);
        const sum = recent.reduce((s, d) => s + (d.total || 0), 0);
        return {
            day,
            label: dayLabels[day],
            avg: recent.length > 0 ? Math.round(sum / recent.length) : 0,
        };
    });
}

/**
 * Format formatting
 */
export function formatNumber(n: number): string {
    if (n === null || n === undefined || isNaN(n)) return "0";
    return Math.round(n).toLocaleString("ko-KR");
}

export function formatWon(n: number): string {
    return `₩${formatNumber(n)}`;
}
