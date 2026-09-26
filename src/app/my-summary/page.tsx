"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useSession } from "next-auth/react";
import {
  UserCheck,
  Gamepad2,
  Coins,
  Coffee,
  TrendingDown,
  HandCoins,
  Clock,
  Flame,
} from "lucide-react";

interface EmployeeSummaryData {
  date: string;
  gamesHandled: number;
  completedGames: number;
  activeGames: number;
  totalGameRevenue: number;
  cafeOrdersCount: number;
  cafeRevenue: number;
  expensesLogged: number;
  loansLogged: number;
  currency: string;
}

export default function MySummaryPage() {
  const { data: session } = useSession();
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [summary, setSummary] = useState<EmployeeSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/my-summary?employeeId=${session.user.id}&date=${selectedDate}`);
      if (res.ok) setSummary(await res.json());
    } catch (err) {
      console.error("Fetch summary error:", err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, selectedDate]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const currency = summary?.currency || "Rs.";

  return (
    <AppShell title="My Shift Performance Summary">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="text-emerald-400">👤</span> Operator Shift Scorecard
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Personal station performance metrics logged by <strong className="text-white">{session?.user?.name}</strong> (@{session?.user?.username})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-[#1b3a2a] bg-[#0c1c14] px-3 py-1.5 text-xs text-white [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Shift High-Level Performance Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-[#1c180b] to-[#0f1f17] p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400">Frames Handled</span>
              <Gamepad2 className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-2xl font-black text-white">
              {summary?.gamesHandled ?? 0}
            </span>
            <p className="text-[11px] text-amber-300/80 mt-1">
              {summary?.completedGames ?? 0} Completed • {summary?.activeGames ?? 0} Active
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-[#0c2419] to-[#0a1811] p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400">Game Sales</span>
              <Coins className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-2xl font-black text-emerald-300">
              {currency} {summary?.totalGameRevenue ?? 0}
            </span>
            <p className="text-[11px] text-gray-400 mt-1">
              Table billing settled
            </p>
          </div>

          <div className="rounded-2xl border border-teal-500/40 bg-gradient-to-br from-[#0c2222] to-[#0a1817] p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400">Café Handled</span>
              <Coffee className="h-4 w-4 text-teal-400" />
            </div>
            <span className="text-2xl font-black text-teal-300">
              {currency} {summary?.cafeRevenue ?? 0}
            </span>
            <p className="text-[11px] text-gray-400 mt-1">
              {summary?.cafeOrdersCount ?? 0} food & beverage orders
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-[#261d0a] to-[#131a14] p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400">Total Shift Value</span>
              <UserCheck className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-2xl font-black text-amber-300">
              {currency} {(summary?.totalGameRevenue ?? 0) + (summary?.cafeRevenue ?? 0)}
            </span>
            <p className="text-[11px] text-gray-400 mt-1">
              Gross collection generated
            </p>
          </div>
        </div>

        {/* Ledger logs by this staff member */}
        <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-lg">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3 border-b border-[#163022] pb-2">
            Operations Responsibility Breakdown
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-emerald-950 bg-[#0d2116] p-4 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Expenses Logged</span>
                <span className="text-gray-400">Operational receipts entered</span>
              </div>
              <span className="text-base font-bold text-rose-400">
                {currency} {summary?.expensesLogged ?? 0}
              </span>
            </div>

            <div className="rounded-xl border border-emerald-950 bg-[#0d2116] p-4 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Loans Issued</span>
                <span className="text-gray-400">Customer credit entries created</span>
              </div>
              <span className="text-base font-bold text-amber-400">
                {summary?.loansLogged ?? 0} Records
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
