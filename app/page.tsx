"use client";
import { useState, useEffect, useCallback } from "react";
import DeliveryInput from "@/components/DeliveryInput";
import Dashboard from "@/components/Dashboard";
import { Settings, Delivery, DEFAULT_SETTINGS } from "@/lib/types";
import {
  loadSettings,
  loadDeliveries,
  saveDelivery,
  deleteDelivery,
} from "@/lib/store";
import { formatNumber } from "@/lib/calculations";

export default function HomePage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [saved, setSaved] = useState(false);

  // Edit / Add modal state
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDate, setAddDate] = useState("");
  const [addValue, setAddValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;
    await saveDelivery(todayStr, total);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await loadData();
  };

  // Edit handlers
  const startEdit = (d: Delivery) => {
    setEditingDate(d.date);
    setEditValue(String(d.total));
  };

  const cancelEdit = () => {
    setEditingDate(null);
    setEditValue("");
  };

  const confirmEdit = async () => {
    if (!editingDate) return;
    const num = parseInt(editValue, 10);
    if (isNaN(num) || num < 0) return;
    await saveDelivery(editingDate, num);
    setEditingDate(null);
    setEditValue("");
    await loadData();
  };

  // Delete handlers
  const handleDelete = async (date: string) => {
    await deleteDelivery(date);
    setDeleteConfirm(null);
    await loadData();
  };

  // Add past record
  const handleAdd = async () => {
    if (!addDate || !addValue) return;
    const num = parseInt(addValue, 10);
    if (isNaN(num) || num < 0) return;
    await saveDelivery(addDate, num);
    setShowAddModal(false);
    setAddDate("");
    setAddValue("");
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

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;
  const todayDelivery = (deliveries || []).find((d) => d && d.date === todayStr);

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-100">택배 정산</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {new Date().toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short",
          })}
        </p>
      </div>

      {/* Delivery Input */}
      <div id="guide-input-section">
        <DeliveryInput
          initialValue={todayDelivery?.total}
          onSave={handleSave}
          loading={loading}
        />
      </div>

      {/* Saved Toast */}
      {saved && (
        <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-xl py-2 px-4 text-center text-blue-400 text-sm font-medium">
          ✓ 저장 완료
        </div>
      )}

      {/* Dashboard */}
      <div id="guide-dashboard-section">
        <Dashboard
          deliveries={deliveries}
          settings={settings}
          todayTotal={todayDelivery?.total ?? null}
        />
      </div>

      {/* Recent Deliveries with CRUD */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-200">최근 기록</h3>
          <button
            onClick={() => {
              setShowAddModal(true);
              setAddDate("");
              setAddValue("");
            }}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium
                       bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            + 기록 추가
          </button>
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-3">
            <p className="text-sm text-gray-400 mb-3">과거 기록 추가</p>
            <div className="flex gap-2 mb-3">
              <input
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
                max={todayStr}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                           text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
              <input
                type="text"
                inputMode="numeric"
                value={addValue}
                onChange={(e) =>
                  setAddValue(e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="수량"
                className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                           text-white text-sm text-center focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 bg-gray-800 text-gray-400 text-sm rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleAdd}
                disabled={!addDate || !addValue}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg
                           disabled:opacity-40"
              >
                추가
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {deliveries.slice(0, 10).map((d) => (
            <div key={d.date}>
              {/* Delete confirmation */}
              {deleteConfirm === d.date && (
                <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 mb-1">
                  <span className="text-sm text-red-400">삭제하시겠습니까?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-xs text-gray-400 px-3 py-1 rounded-lg bg-gray-800"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => handleDelete(d.date)}
                      className="text-xs text-red-400 px-3 py-1 rounded-lg bg-red-500/20"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )}

              {/* Row */}
              {editingDate === d.date ? (
                /* Edit mode */
                <div className="flex items-center gap-2 bg-gray-900 border border-blue-500/30 rounded-xl px-4 py-2.5">
                  <span className="text-gray-400 text-sm flex-shrink-0">
                    {(() => {
                      const safeDate = (d.date || "").replace(/-/g, "/");
                      return new Date(safeDate + " 00:00:00").toLocaleDateString(
                        "ko-KR",
                        { month: "short", day: "numeric", weekday: "short" }
                      );
                    })()}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editValue}
                    onChange={(e) =>
                      setEditValue(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1
                               text-white text-sm text-center focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <span className="text-gray-500 text-sm">건</span>
                  <div className="ml-auto flex gap-1.5">
                    <button
                      onClick={cancelEdit}
                      className="text-xs text-gray-500 px-2 py-1"
                    >
                      취소
                    </button>
                    <button
                      onClick={confirmEdit}
                      className="text-xs text-blue-400 font-medium px-2 py-1"
                    >
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-center justify-between bg-gray-900/60 border border-gray-800/50 rounded-xl px-4 py-2.5 group">
                  <span className="text-gray-400 text-sm">
                    {(() => {
                      const safeDate = (d.date || "").replace(/-/g, "/");
                      return new Date(safeDate + " 00:00:00").toLocaleDateString(
                        "ko-KR",
                        { month: "short", day: "numeric", weekday: "short" }
                      );
                    })()}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-200 font-semibold text-sm">
                      {formatNumber(d.total)}건
                    </span>
                    {/* Edit / Delete buttons */}
                    <div className="flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(d)}
                        className="text-gray-500 hover:text-blue-400 p-1 transition-colors"
                        title="수정"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(d.date)}
                        className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                        title="삭제"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {deliveries.length === 0 && (
            <p className="text-gray-600 text-center py-6 text-sm">
              아직 기록이 없습니다
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
