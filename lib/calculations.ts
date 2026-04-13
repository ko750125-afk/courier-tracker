import { Zone, Delivery, WorkType, Settings, SettlementBreakdown, DailyBreakdown } from "./types";

/**
 * Calculate revenue for a single day's deliveries
 */
export function calcDailyRevenue(total: number, zones: Zone[], settings?: Settings, includeIncentives: boolean = false): number {
    if (!zones || !Array.isArray(zones)) return 0;

    let bonus = 0;
    if (includeIncentives && settings?.isCoupangMode) {
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
 * Calculate detailed revenue breakdown for a single day
 */
export function calcDailyBreakdown(total: number, zones: Zone[], settings?: Settings): DailyBreakdown {
    if (!zones || !Array.isArray(zones)) {
        return { date: "", count: total, baseRevenue: 0, incentive: 0, total: 0 };
    }

    let incentivePerUnit = 0;
    if (settings?.isCoupangMode) {
        if (settings.useLinkedIncentive) incentivePerUnit += settings.linkedIncentive || 0;
        if (settings.useSoloIncentive) incentivePerUnit += settings.soloIncentive || 0;
    }

    let baseRevenue = 0;
    zones.forEach(zone => {
        if (!zone) return;
        const count = Math.round((total || 0) * (zone.ratio || 0));
        baseRevenue += count * (zone.price || 0);
    });

    const incentiveTotal = (total || 0) * incentivePerUnit;
    
    return {
        date: "",
        count: total,
        baseRevenue,
        incentive: incentiveTotal,
        total: baseRevenue + incentiveTotal
    };
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
 * Calculate settlement info for a specific date
 */
export function getSettlementByDate(
    deliveries: Delivery[],
    zones: Zone[],
    referenceDate: Date,
    settings: Settings
): { 
    amount: number; 
    paymentDate: string; 
    paymentLabel: string; 
    periodStart: string; 
    periodEnd: string;
    breakdown: SettlementBreakdown;
} {
    const settlementDay = settings.settlementDay || 25;
    const payDay = settings.payDay || 20;
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth() + 1; // 1-indexed
    const day = referenceDate.getDate();

    let pSYear, pSMonth, pSDay;
    let pEYear, pEMonth, pEDay;
    let payY, payM;

    if (day < settlementDay) {
        const start = new Date(year, month - 2, settlementDay);
        pSYear = start.getFullYear(); pSMonth = start.getMonth() + 1; pSDay = settlementDay;

        const end = new Date(year, month - 1, settlementDay - 1);
        pEYear = end.getFullYear(); pEMonth = end.getMonth() + 1; pEDay = settlementDay - 1;

        const pay = new Date(year, month, payDay);
        payY = pay.getFullYear(); payM = pay.getMonth() + 1;
    } else {
        pSYear = year; pSMonth = month; pSDay = settlementDay;

        const end = new Date(year, month, settlementDay - 1);
        pEYear = end.getFullYear(); pEMonth = end.getMonth() + 1; pEDay = settlementDay - 1;

        const pay = new Date(year, month + 1, payDay);
        payY = pay.getFullYear(); payM = pay.getMonth() + 1;
    }

    const periodStart = `${pSYear}-${String(pSMonth).padStart(2, "0")}-${String(pSDay).padStart(2, "0")}`;
    const periodEnd = `${pEYear}-${String(pEMonth).padStart(2, "0")}-${String(pEDay).padStart(2, "0")}`;

    const periodDeliveries = (deliveries || []).filter(
        (d) => d && d.date >= periodStart && d.date <= periodEnd
    ).sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    const dailyBreakdowns: DailyBreakdown[] = periodDeliveries.map(d => {
        const bd = calcDailyBreakdown(d.total, zones, settings);
        bd.date = d.date;
        return bd;
    });

    const zoneCountMap: Record<string, number> = {};
    periodDeliveries.forEach(d => {
        zones.forEach(zone => {
            const count = Math.round((d.total || 0) * (zone.ratio || 0));
            zoneCountMap[zone.name] = (zoneCountMap[zone.name] || 0) + count;
        });
    });

    let incentivePerUnit = 0;
    if (settings?.isCoupangMode) {
        if (settings.useLinkedIncentive) incentivePerUnit += settings.linkedIncentive || 0;
        if (settings.useSoloIncentive) incentivePerUnit += settings.soloIncentive || 0;
    }

    const zoneSummaries = zones.map(zone => {
        const totalCount = zoneCountMap[zone.name] || 0;
        const basePrice = zone.price || 0;
        const totalPrice = basePrice + incentivePerUnit;
        const subtotal = totalCount * totalPrice;
        return {
            zoneName: zone.name,
            basePrice,
            incentivePerUnit,
            totalPrice,
            totalCount,
            subtotal
        };
    });

    const baseTotal = dailyBreakdowns.reduce((s, bd) => s + bd.baseRevenue, 0);
    const incentiveTotal = dailyBreakdowns.reduce((s, bd) => s + bd.incentive, 0);
    const totalCount = dailyBreakdowns.reduce((s, bd) => s + bd.count, 0);
    const amount = baseTotal + incentiveTotal;

    const breakdown: SettlementBreakdown = {
        totalamount: amount,
        baseTotal,
        incentiveTotal,
        totalCount,
        days: dailyBreakdowns,
        zoneSummaries
    };

    const paymentDate = `${payY}-${String(payM).padStart(2, "0")}-${String(payDay).padStart(2, "0")}`;
    const paymentLabel = `${payM}월 ${payDay}일 예상 수령액`;

    return { amount, paymentDate, paymentLabel, periodStart, periodEnd, breakdown };
}


/**
 * Calculate next payment amount (Current logic wrapper)
 */
export function calcNextPayment(
    deliveries: Delivery[],
    zones: Zone[],
    today: Date,
    settings: Settings
) {
    return getSettlementByDate(deliveries, zones, today, settings);
}

/**
 * List recent settlement periods for history
 */
export function listRecentSettlements(
    deliveries: Delivery[],
    zones: Zone[],
    settings: Settings,
    count: number = 12
) {
    const results: any[] = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
        // We check current date, and then go back month by month
        const checkDate = new Date(now.getFullYear(), now.getMonth() - i, now.getDate());
        const settlement = getSettlementByDate(deliveries, zones, checkDate, settings);
        
        if (!results.find(r => r.periodStart === settlement.periodStart)) {
            results.push(settlement);
        }

        // If we are past settlement day, we also want the one immediately preceding it
        if (i === 0 && checkDate.getDate() >= (settings.settlementDay || 25)) {
            const prevDate = new Date(now.getFullYear(), now.getMonth(), (settings.settlementDay || 25) - 1);
            const prevSettlement = getSettlementByDate(deliveries, zones, prevDate, settings);
            if (!results.find(r => r.periodStart === prevSettlement.periodStart)) {
                results.push(prevSettlement);
            }
        }
    }
    
    // 최신순으로 정렬
    const sorted = results.sort((a, b) => b.periodStart.localeCompare(a.periodStart));

    // 대표님 요청 반영: 
    // 1. 첫 번째 항목(현재 진행 중인 기간)은 무의미해도 보여줌
    // 2. 단, 두 번째 항목(과거)부터는 금액이 0원보다 큰(실적이 있는) 경우만 포함
    return sorted.filter((s, idx) => idx === 0 || s.amount > 0);
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
