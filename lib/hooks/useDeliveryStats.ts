import { useState, useEffect, useMemo, useCallback } from "react";
import { Delivery, Settings } from "../types";
import { calcMonthlyStats, calcEstimatedEarnings } from "../calculations";

export function useDeliveryStats(deliveries: Delivery[], settings: Settings, currentDate: Date) {
    const [monthlyStats, setMonthlyStats] = useState({
        totalDeliveries: 0,
        totalRevenue: 0,
        netRevenue: 0,
    });
    
    const [estimatedStats, setEstimatedStats] = useState({
        estimatedDeliveries: 0,
        estimatedRevenue: 0,
        estimatedNetRevenue: 0,
        dailyAvg: 0
    });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    const monthStr = useMemo(() => {
        return `${year}-${String(month).padStart(2, "0")}`;
    }, [year, month]);

    const calculateStats = useCallback(() => {
        if (!settings || !settings.zones || settings.zones.length === 0) return;
        
        // 월별 통계 (현재까지)
        const currentStats = calcMonthlyStats(deliveries, settings.zones, year, month, settings);
        setMonthlyStats(currentStats);

        // 월별 예상 통계 (월말까지)
        const estimated = calcEstimatedEarnings(
            deliveries,
            settings.zones,
            settings.workType,
            year,
            month,
            settings
        );
        setEstimatedStats(estimated);
    }, [deliveries, settings, year, month]);

    useEffect(() => {
        calculateStats();
    }, [calculateStats]);

    // 특정 월에 해당하는 배송 기록 필터링
    const monthDeliveries = useMemo(() => {
        return deliveries.filter(d => d.date && d.date.startsWith(monthStr));
    }, [deliveries, monthStr]);

    return { monthlyStats, estimatedStats, calculateStats, monthStr, monthDeliveries };
}
