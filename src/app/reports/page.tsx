"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { exportToExcel } from "@/lib/export";
import {
  BarChart3,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Coins,
  Coffee,
  HandCoins,
  Wallet,
  Sparkles,
} from "lucide-react";
import { useSession } from "next-auth/react";

interface ReportData {
  summary: {
    completedGames: number;
    totalGameRevenue: number;
    cashGameRevenue: number;
    onlineGameRevenue: number;
    totalDiscount: number;
    cafeOrdersCount: number;
    totalCafeRevenue: number;
    cafeCash: number;
    cafeOnline: number;
    cafePending: number;
    otherRevenue: number;
    totalExpenses: number;
    loanIssued: number;
    loanRecovered: number;
    grossRevenue: number;
    netProfit: number;
    currency: string;
  };
  expenseBreakdown: { category: string; amount: number }[];
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const todayStr = new Date().toISOString().split("T")[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(todayStr);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports?fromDate=${fromDate}&toDate=${toDate}`);
      if (res.ok) setReport(await res.json());
    } catch (err) {
      console.error("Report fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const setPresetRange = (preset: "today" | "last7" | "month") => {
    const now = new Date();
    if (preset === "today") {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "last7") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFromDate(d.toISOString().split("T")[0]);
      setToDate(todayStr);
    } else if (preset === "month") {
      setFromDate(firstDayOfMonth);
      setToDate(todayStr);
    }
  };

  const handleExport = () => {
    if (!report) return;
    const s = report.summary;
    const exportRows = [
      { Metric: "Completed Frames", Value: s.completedGames },
      { Metric: "Game Table Sales", Value: s.totalGameRevenue },
      { Metric: "Game Cash", Value: s.cashGameRevenue },
      { Metric: "Game Online", Value: s.onlineGameRevenue },
      { Metric: "Total Discounts Given", Value: s.totalDiscount },
      { Metric: "Café Orders Placed", Value: s.cafeOrdersCount },
      { Metric: "Total Café Sales", Value: s.totalCafeRevenue },
      { Metric: "Café Cash", Value: s.cafeCash },
      { Metric: "Café Online", Value: s.cafeOnline },
      { Metric: "Café Pending on Tabs", Value: s.cafePending },
      { Metric: "Other Revenue (Lockers/Tournaments)", Value: s.otherRevenue },
      { Metric: "Total Operational Expenses", Value: s.totalExpenses },
      { Metric: "Total Loans Issued", Value: s.loanIssued },
      { Metric: "Total Loans Recovered", Value: s.loanRecovered },
      { Metric: "Gross Revenue (Games + Café + Extra)", Value: s.grossRevenue },
      { Metric: "Net Profit (Gross - Expenses)", Value: s.netProfit },
    ];

    exportToExcel(exportRows, `Financial_Statement_${fromDate}_to_${toDate}`, "P&L Report");
  };

  const s = report?.summary;
  const currency = s?.currency || "Rs.";

  return (
    <AppShell title="Financial Reports & Analytics">
      {/* Date Range Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-amber-400">📊</span> Profit & Loss Financial Statement
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Aggregated revenue, breakdown by stream, expenses, and net profit
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick presets */}
          <div className="flex items-center rounded-xl border border-[#1b3a2a] bg-[#0c1c14] p-1 text-xs">
            <button
              onClick={() => setPresetRange("today")}
              className="px-2.5 py-1 rounded-lg text-gray-400 hover:text-white"
            >
              Today
            </button>
            <button
              onClick={() => setPresetRange("last7")}
              className="px-2.5 py-1 rounded-lg text-gray-400 hover:text-white"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setPresetRange("month")}
              className="px-2.5 py-1 rounded-lg text-gray-400 hover:text-white"
            >
              This Month
            </button>
          </div>

          <div className="flex items-center rounded-xl border border-[#1b3a2a] bg-[#0c1c14] px-2.5 py-1 text-xs text-white">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none [color-scheme:dark]"
            />
            <span className="text-gray-500 mx-2 font-bold">—</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none [color-scheme:dark]"
            />
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-600/40 bg-emerald-950/40 hover:bg-emerald-900/50 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition-all shadow"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Main Financial High-Level Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-[#0c261b] to-[#07150f] p-6 shadow-xl">
          <span className="text-xs uppercase font-bold text-emerald-400 block mb-1">
            Total Gross Revenue
          </span>
          <span className="text-3xl font-black text-white">
            {currency} {s?.grossRevenue ?? 0}
          </span>
          <p className="text-xs text-gray-400 mt-2">
            Games ({currency} {s?.totalGameRevenue ?? 0}) + Café ({currency} {s?.totalCafeRevenue ?? 0}) + Extra ({currency} {s?.otherRevenue ?? 0})
          </p>
        </div>

        <div className="rounded-2xl border border-rose-500/40 bg-gradient-to-br from-[#240c11] to-[#12070a] p-6 shadow-xl">
          <span className="text-xs uppercase font-bold text-rose-400 block mb-1">
            Total Operational Expenses
          </span>
          <span className="text-3xl font-black text-rose-300">
            {currency} {s?.totalExpenses ?? 0}
          </span>
          <p className="text-xs text-gray-400 mt-2">
            Electricity, rent, table maintenance, cloth servicing & staff
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-br from-[#261d0a] to-[#131a14] p-6 shadow-xl">
          <span className="text-xs uppercase font-bold text-amber-400 block mb-1">
            Net Club Profit
          </span>
          <span className="text-3xl font-black text-amber-300">
            {currency} {s?.netProfit ?? 0}
          </span>
          <p className="text-xs text-emerald-400 mt-2 font-semibold">
            Gross Revenue minus total expenses for period
          </p>
        </div>
      </div>

      {/* Breakdown Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Streams Breakdown */}
        <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-[#163022] pb-3 flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-400" />
            <span>Revenue Streams Breakdown</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center bg-[#0d2116] p-3 rounded-xl">
              <div>
                <span className="font-bold text-white block">Table Frames ({s?.completedGames ?? 0} games)</span>
                <span className="text-[10px] text-gray-400">Cash: {currency} {s?.cashGameRevenue} • Online: {currency} {s?.onlineGameRevenue}</span>
              </div>
              <span className="text-base font-bold text-amber-300">
                {currency} {s?.totalGameRevenue ?? 0}
              </span>
            </div>

            <div className="flex justify-between items-center bg-[#0d2116] p-3 rounded-xl">
              <div>
                <span className="font-bold text-white block">Café & POS Orders ({s?.cafeOrdersCount ?? 0} orders)</span>
                <span className="text-[10px] text-gray-400">Cash: {currency} {s?.cafeCash} • Online: {currency} {s?.cafeOnline} • Tabs: {currency} {s?.cafePending}</span>
              </div>
              <span className="text-base font-bold text-emerald-300">
                {currency} {s?.totalCafeRevenue ?? 0}
              </span>
            </div>

            <div className="flex justify-between items-center bg-[#0d2116] p-3 rounded-xl">
              <div>
                <span className="font-bold text-white block">Other Extra Income</span>
                <span className="text-[10px] text-gray-400">Cue locker rent, tournament entries, memberships</span>
              </div>
              <span className="text-base font-bold text-teal-300">
                {currency} {s?.otherRevenue ?? 0}
              </span>
            </div>

            <div className="flex justify-between items-center bg-[#0d2116] p-3 rounded-xl border border-amber-950">
              <div>
                <span className="font-bold text-white block">Member Loans Issued vs Recovered</span>
                <span className="text-[10px] text-gray-400">Issued: {currency} {s?.loanIssued} • Recovered: {currency} {s?.loanRecovered}</span>
              </div>
              <span className="font-bold text-emerald-400">
                +{currency} {s?.loanRecovered ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Expenses by Category */}
        <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-[#163022] pb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-rose-400" />
            <span>Expense Breakdown by Category</span>
          </h2>

          <div className="space-y-3">
            {report?.expenseBreakdown && report.expenseBreakdown.length > 0 ? (
              report.expenseBreakdown.map((exp) => {
                const totalExp = s?.totalExpenses || 1;
                const pct = Math.round((exp.amount / totalExp) * 100);

                return (
                  <div key={exp.category} className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-300">{exp.category}</span>
                      <span className="font-bold text-rose-400">
                        {currency} {exp.amount} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#08120d] overflow-hidden border border-emerald-950">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-700 to-rose-500"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-500 italic py-8 text-center">
                No categorized expenses for this date range.
              </p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
