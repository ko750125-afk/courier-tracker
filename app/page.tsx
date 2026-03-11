"use client";
import { useState, useEffect, useCallback } from "react";
import DeliveryInput from "@/components/DeliveryInput";
import Dashboard from "@/components/Dashboard";
import { Settings, Delivery, DEFAULT_SETTINGS } from "@/lib/types";
import {
  loadSettings,
  loadDeliveries,
  saveDelivery,
} from "@/lib/store";
import { formatNumber } from "@/lib/calculations";

export default function HomePage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([loadSettings(), loadDeliveries()]);
      setSettings(s);
      setDeliveries(d);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    loadData();
  }, [loadData]);

  const handleSave = async (total: number) => {
    const targetDate = new Date();
    // 야간 근무자이고 정오(12시) 이전이면 전날 실적으로 처리
    if (settings.workShift === "night" && targetDate.getHours() < 12) {
        targetDate.setDate(targetDate.getDate() - 1);
    }
    
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, "0");
    const d = String(targetDate.getDate()).padStart(2, "0");
    const targetDateStr = `${y}-${m}-${d}`;
    await saveDelivery(targetDateStr, total);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await loadData();
  };

  if (!isMounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  const workingDate = new Date();
  if (settings.workShift === "night" && workingDate.getHours() < 12) {
    workingDate.setDate(workingDate.getDate() - 1);
  }
  const y = workingDate.getFullYear();
  const m = String(workingDate.getMonth() + 1).padStart(2, "0");
  const d = String(workingDate.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;
  const todayDelivery = (deliveries || []).find((d) => d && d.date === todayStr);

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-100">택배 정산</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {workingDate.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short",
          })} {settings.workShift === "night" && workingDate.getDate() !== new Date().getDate() && "(야간 근무)"}
        </p>
      </div>

      {/* Delivery Input */}
      <div>
        <DeliveryInput
          initialValue={todayDelivery?.total}
          onSave={handleSave}
          loading={loading}
        />
      </div>

      {/* Saved Toast */}
      {saved && (
        <div className="mt-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl py-2.5 px-4 text-center text-blue-400 text-sm font-semibold shadow-lg shadow-blue-500/5 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          ✓ 기록이 저장되었습니다
        </div>
      )}

      {/* Dashboard */}
      <div>
        <Dashboard
          deliveries={deliveries}
          settings={settings}
          todayTotal={todayDelivery?.total ?? null}
        />
      </div>
    </div>
  );
}
