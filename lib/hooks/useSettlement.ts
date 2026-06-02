import { useState, useEffect, useCallback } from "react";
import { Delivery, Settings, SettlementBreakdown } from "../types";
import { calcNextPayment } from "../calculations";

export function useSettlement(deliveries: Delivery[], settings: Settings) {
    const [nextPayment, setNextPayment] = useState<{
        amount: number;
        paymentDate: string;
        paymentLabel: string;
        periodStart: string;
        periodEnd: string;
        breakdown: SettlementBreakdown;
    }>({
        amount: 0,
        paymentDate: "",
        paymentLabel: "",
        periodStart: "",
        periodEnd: "",
        breakdown: {
            totalamount: 0,
            baseTotal: 0,
            incentiveTotal: 0,
            totalCount: 0,
            commissionTotal: 0,
            netAmount: 0,
            days: [],
            zoneSummaries: []
        }
    });

    const calculatePayment = useCallback(() => {
        if (!settings || !settings.zones || settings.zones.length === 0) return;
        const result = calcNextPayment(deliveries, settings.zones, new Date(), settings);
        setNextPayment(result);
    }, [deliveries, settings]);

    useEffect(() => {
        calculatePayment();
    }, [calculatePayment]);

    return { nextPayment, calculatePayment };
}
