"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DateFilterBar } from "@/components/common/DateFilterBar";
import { StatsCard } from "@/components/common/StatsCard";
import { exportToExcel } from "@/lib/export";
import { Game, ClubTable, PlayerBill } from "@/types";
import {
  Gamepad2,
  Flame,
  Gift,
  Banknote,
  Globe,
  Coins,
  Clock,
  Coffee,
  Receipt,
  HandCoins,
  ShieldCheck,
  TrendingDown,
  Percent,
  TrendingUp,
  FileSpreadsheet,
  Search,
  Filter,
  Users,
  CheckCircle,
  AlertCircle,
  Play,
  RotateCcw,
} from "lucide-react";
import { StartGameModal } from "@/components/modals/StartGameModal";
import { EndGameModal } from "@/components/modals/EndGameModal";
import { VoidRequestModal } from "@/components/modals/VoidRequestModal";
import { CheckoutBillModal } from "@/components/modals/CheckoutBillModal";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface DashboardData {
  kpis: {
    gamesCount: number;
    activeNow: number;
    freeGames: number;
    cash: number;
    online: number;
    gameSale: number;
    gamePending: number;
    cafeSale: number;
    cafePending: number;
    loanBalance: number;
    loanRecovered: number;
    expenses: number;
    discount: number;
    totalSale: number;
  };
  revenueByTable: { table: string; fullName: string; revenue: number }[];
  gamesByHour: { hour: string; count: number }[];
  topPlayers: { name: string; count: number }[];
  byEmployee: { name: string; games: number; revenue: number }[];
  pendingBills: PlayerBill[];
  cafeSummary: { totalOrders: number; collected: number; pending: number };
  tables: ClubTable[];
  currency: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [data, setData] = useState<DashboardData | null>(null);
  const [gamesList, setGamesList] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  // Table filters
  const [searchPlayer, setSearchPlayer] = useState("");
  const [filterTable, setFilterTable] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modals
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedBill, setSelectedBill] = useState<PlayerBill | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, gamesRes] = await Promise.all([
        fetch(`/api/dashboard?date=${selectedDate}`),
        fetch(`/api/games?fromDate=${selectedDate}&toDate=${selectedDate}`),
      ]);

      if (dashRes.ok) {
        const dashData = await dashRes.json();
        setData(dashData);
      }
      if (gamesRes.ok) {
        const gamesData = await gamesRes.json();
        setGamesList(gamesData);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const currency = data?.currency || "Rs.";
  const kpis = data?.kpis;

  // Filter games table
  const filteredGames = gamesList.filter((g) => {
    if (filterTable !== "all" && g.table_id !== filterTable) return false;
    if (filterType !== "all" && g.type !== filterType) return false;
    if (filterPayment !== "all" && g.payment_method !== filterPayment) return false;
    if (filterStatus !== "all" && g.status !== filterStatus) return false;
    if (
      searchPlayer.trim() &&
      !g.players.some((p) =>
        p.toLowerCase().includes(searchPlayer.toLowerCase().trim())
      ) &&
      !g.table_name.toLowerCase().includes(searchPlayer.toLowerCase().trim())
    ) {
      return false;
    }
    return true;
  });

  const handleExportExcel = () => {
    const exportRows = filteredGames.map((g) => ({
      Date: g.start_time.split("T")[0],
      Table: g.table_name,
      Type: g.type.toUpperCase(),
      BallCount: g.ball_count,
      Players: g.players.join(", "),
      Loser: g.loser || "-",
      StartTime: new Date(g.start_time).toLocaleTimeString(),
      EndTime: g.end_time ? new Date(g.end_time).toLocaleTimeString() : "-",
      DurationMinutes: g.duration_minutes || "-",
      Amount: g.amount,
      PaymentMethod: g.payment_method || "-",
      Status: g.status.toUpperCase(),
      Employee: g.employee_name,
      Notes: g.notes || "",
    }));

    exportToExcel(exportRows, `Snooker_Games_Report_${selectedDate}`, "Games");
  };

  return (
    <AppShell title="Club Command Dashboard">
      {/* Top Controls: Date Navigator & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <DateFilterBar
          selectedDate={selectedDate}
          onDateChange={(d) => setSelectedDate(d)}
          onClear={() => setSelectedDate(todayStr)}
        />

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsStartOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-950 transition-all active:scale-95"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>Start Game</span>
          </button>
        </div>
      </div>

      {/* Row of KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <StatsCard
          title="Games Count"
          value={kpis?.gamesCount ?? 0}
          icon={Gamepad2}
          variant="gold"
          subtitle="Frames played"
        />
        <StatsCard
          title="Active Now"
          value={kpis?.activeNow ?? 0}
          icon={Flame}
          variant="emerald"
          badge={kpis?.activeNow ? "In Play" : "Idle"}
        />
        <StatsCard
          title="Free / Cancelled"
          value={kpis?.freeGames ?? 0}
          icon={Gift}
          variant="default"
          subtitle="Non-billed"
        />
        <StatsCard
          title="Cash In Hand"
          value={`${currency} ${kpis?.cash ?? 0}`}
          icon={Banknote}
          variant="green"
        />
        <StatsCard
          title="Online Transfers"
          value={`${currency} ${kpis?.online ?? 0}`}
          icon={Globe}
          variant="emerald"
        />
        <StatsCard
          title="Game Sale"
          value={`${currency} ${kpis?.gameSale ?? 0}`}
          icon={Coins}
          variant="gold"
        />
        <StatsCard
          title="Game Pending"
          value={`${currency} ${kpis?.gamePending ?? 0}`}
          icon={Clock}
          variant="red"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        <StatsCard
          title="Café Sale"
          value={`${currency} ${kpis?.cafeSale ?? 0}`}
          icon={Coffee}
          variant="green"
        />
        <StatsCard
          title="Café Pending"
          value={`${currency} ${kpis?.cafePending ?? 0}`}
          icon={Receipt}
          variant="red"
        />
        <StatsCard
          title="Loan Balance"
          value={`${currency} ${kpis?.loanBalance ?? 0}`}
          icon={HandCoins}
          variant="red"
          subtitle="Total owed"
        />
        <StatsCard
          title="Loan Recovered"
          value={`${currency} ${kpis?.loanRecovered ?? 0}`}
          icon={ShieldCheck}
          variant="green"
          subtitle="Today's recovery"
        />
        <StatsCard
          title="Expenses"
          value={`${currency} ${kpis?.expenses ?? 0}`}
          icon={TrendingDown}
          variant="red"
        />
        <StatsCard
          title="Discounts Given"
          value={`${currency} ${kpis?.discount ?? 0}`}
          icon={Percent}
          variant="default"
        />
        <StatsCard
          title="Total Gross Sale"
          value={`${currency} ${kpis?.totalSale ?? 0}`}
          icon={TrendingUp}
          variant="gold"
          trend="Games + Café"
        />
      </div>

      {/* Middle Analytics Grid: Charts & Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue by Table Bar Chart */}
        <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 border-b border-[#163022] pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-amber-400">📊</span> Revenue by Table
            </h3>
            <span className="text-xs text-gray-400">{selectedDate}</span>
          </div>

          <div className="space-y-3">
            {data?.revenueByTable.map((item) => {
              const maxRev = Math.max(
                1,
                ...data.revenueByTable.map((r) => r.revenue)
              );
              const pct = Math.round((item.revenue / maxRev) * 100);

              return (
                <div key={item.fullName} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-gray-300">{item.table}</span>
                    <span className="font-bold text-amber-300">
                      {currency} {item.revenue}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#08120d] overflow-hidden border border-emerald-950">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-500"
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Games by Hour Bar Chart */}
        <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 border-b border-[#163022] pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-emerald-400">⏱️</span> Games by Hour
            </h3>
            <span className="text-xs text-gray-400">Peak Times</span>
          </div>

          <div className="flex items-end justify-between gap-1.5 h-44 pt-4 px-2 border-b border-emerald-950">
            {data?.gamesByHour.map((item) => {
              const maxCount = Math.max(
                1,
                ...data.gamesByHour.map((g) => g.count)
              );
              const heightPct = Math.round((item.count / maxCount) * 100);

              return (
                <div
                  key={item.hour}
                  className="flex flex-col items-center flex-1 h-full justify-end group relative"
                >
                  <span className="text-[10px] font-bold text-amber-300 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.count}
                  </span>
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-emerald-700 to-amber-500/80 hover:to-amber-400 transition-all"
                    style={{ height: `${Math.max(8, heightPct)}%` }}
                  />
                  <span className="text-[9px] text-gray-500 mt-2 font-mono">
                    {item.hour.split(":")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboards & Panels */}
        <div className="space-y-6">
          {/* Top Players */}
          <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-[#163022] pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-amber-400">🏆</span> Top Players
              </h3>
              <span className="text-[11px] text-gray-400">All-time</span>
            </div>

            <div className="space-y-2">
              {data?.topPlayers.map((player, idx) => (
                <div
                  key={player.name}
                  className="flex items-center justify-between rounded-xl bg-[#0d2116] px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-300">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-gray-200">{player.name}</span>
                  </div>
                  <span className="rounded-md bg-emerald-950 px-2 py-0.5 font-bold text-emerald-400 border border-emerald-800">
                    {player.count} games
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* By Employee Breakdown */}
          <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-[#163022] pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-emerald-400">👤</span> By Employee Shift
              </h3>
            </div>

            <div className="space-y-2">
              {data?.byEmployee.map((emp) => (
                <div
                  key={emp.name}
                  className="flex items-center justify-between rounded-xl bg-[#0d2116] px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-gray-200">{emp.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{emp.games} games</span>
                    <span className="font-bold text-amber-300">
                      {currency} {emp.revenue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Bills & Café Panels Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pending Player Bills Panel */}
        <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3 border-b border-[#163022] pb-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400" />
              <span>Pending Player Bills</span>
            </h3>
            <Link
              href="/bills"
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              View All Bills →
            </Link>
          </div>

          {data?.pendingBills && data.pendingBills.length > 0 ? (
            <div className="space-y-2">
              {data.pendingBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between rounded-xl border border-rose-900/30 bg-[#161214] p-3 text-xs hover:border-rose-700/50 transition-all"
                >
                  <div>
                    <span className="font-bold text-white">{bill.player_name}</span>
                    <span className="text-[11px] text-gray-400 block">
                      Games: {currency} {bill.game_amount} • Café: {currency} {bill.cafe_amount}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-rose-400 text-sm">
                      {currency} {bill.balance}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedBill(bill);
                        setIsCheckoutOpen(true);
                      }}
                      className="rounded-lg bg-emerald-700 hover:bg-emerald-600 px-3 py-1 font-semibold text-white transition-all shadow"
                    >
                      Checkout
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl bg-[#091710] border border-emerald-900/30">
              <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
              <span className="text-sm font-bold text-emerald-300">
                All bills cleared!
              </span>
              <p className="text-xs text-gray-400 mt-1">
                No outstanding tabs pending for players
              </p>
            </div>
          )}
        </div>

        {/* Café Summary Panel */}
        <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3 border-b border-[#163022] pb-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Coffee className="h-4 w-4 text-amber-400" />
              <span>Café Summary</span>
            </h3>
            <Link
              href="/cafe"
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              Open Café POS →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="rounded-xl border border-emerald-900/50 bg-[#0d2116] p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">
                Total Orders
              </span>
              <span className="text-lg font-bold text-white">
                {data?.cafeSummary.totalOrders ?? 0}
              </span>
            </div>
            <div className="rounded-xl border border-emerald-900/50 bg-[#0d2116] p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">
                Collected
              </span>
              <span className="text-lg font-bold text-emerald-400">
                {currency} {data?.cafeSummary.collected ?? 0}
              </span>
            </div>
            <div className="rounded-xl border border-rose-900/40 bg-[#161214] p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">
                Pending
              </span>
              <span className="text-lg font-bold text-rose-400">
                {currency} {data?.cafeSummary.pending ?? 0}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-400 italic">
            Orders placed via employee POS automatically deduct inventory and add to open game bills or cash drawer.
          </p>
        </div>
      </div>

      {/* Game Entries Table */}
      <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#163022] pb-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Game Entries Log</span>
              <span className="rounded-full bg-emerald-950 px-2.5 py-0.5 text-xs text-emerald-400 border border-emerald-800">
                {filteredGames.length} frames
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Complete records of games, rates, payments, and actions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-600/40 bg-emerald-950/40 hover:bg-emerald-900/50 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition-all"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 mb-4">
          {/* Player / Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={searchPlayer}
              onChange={(e) => setSearchPlayer(e.target.value)}
              placeholder="Search player or table..."
              className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] pl-8 pr-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Table select */}
          <select
            value={filterTable}
            onChange={(e) => setFilterTable(e.target.value)}
            className="rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Tables</option>
            {data?.tables.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.table_number} - {t.name.split(" — ")[0]}
              </option>
            ))}
          </select>

          {/* Type select */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Game Types</option>
            <option value="single">Single</option>
            <option value="double">Double</option>
            <option value="century">Century</option>
            <option value="final">Final Match</option>
          </select>

          {/* Payment select */}
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Payments</option>
            <option value="cash">Cash</option>
            <option value="online">Online</option>
            <option value="split">Split</option>
            <option value="pending">Pending</option>
            <option value="free">Free</option>
          </select>

          {/* Status select */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="live">Live Now</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-xl border border-emerald-950">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#091510] text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-emerald-950">
              <tr>
                <th className="py-3 px-3">Date/Time</th>
                <th className="py-3 px-3">Table</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Balls</th>
                <th className="py-3 px-3">Players</th>
                <th className="py-3 px-3">Loser</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/60 bg-[#07130e]">
              {filteredGames.length > 0 ? (
                filteredGames.map((game) => (
                  <tr
                    key={game.id}
                    className="hover:bg-[#0c1f15] transition-colors"
                  >
                    <td className="py-3 px-3 font-mono text-gray-400">
                      <div>{game.start_time.split("T")[0]}</div>
                      <div className="text-[10px]">
                        {new Date(game.start_time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {game.table_name.split(" — ")[0]}
                    </td>
                    <td className="py-3 px-3 capitalize font-medium text-amber-200">
                      {game.type}
                    </td>
                    <td className="py-3 px-3 text-gray-400">
                      {game.ball_count}
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-200">
                      {game.players.join(" vs ")}
                    </td>
                    <td className="py-3 px-3">
                      {game.loser ? (
                        <span className="rounded bg-rose-950 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-900/40">
                          {game.loser}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-300">
                      {game.duration_minutes ? `${game.duration_minutes}m` : "Live"}
                    </td>
                    <td className="py-3 px-3 font-bold text-amber-300">
                      {currency} {game.amount}
                      {game.discount > 0 && (
                        <span className="block text-[9px] text-gray-400 line-through">
                          disc: {currency} {game.discount}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 capitalize">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          game.payment_method === "cash"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : game.payment_method === "online"
                            ? "bg-teal-950 text-teal-400 border border-teal-800"
                            : game.payment_method === "pending"
                            ? "bg-rose-950 text-rose-400 border border-rose-800"
                            : "bg-gray-800 text-gray-300"
                        }`}
                      >
                        {game.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          game.status === "live"
                            ? "bg-amber-950 text-amber-300 pulse-gold border border-amber-800"
                            : game.status === "completed"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : "bg-rose-950 text-rose-300 border border-rose-800"
                        }`}
                      >
                        {game.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-400">
                      {game.employee_name}
                    </td>
                    <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                      {game.status === "live" ? (
                        <button
                          onClick={() => {
                            setSelectedGame(game);
                            setIsEndOpen(true);
                          }}
                          className="rounded bg-amber-600 hover:bg-amber-500 px-2 py-1 text-[10px] font-bold text-gray-950 transition-all shadow"
                        >
                          End
                        </button>
                      ) : null}

                      <button
                        onClick={() => {
                          setSelectedGame(game);
                          setIsVoidOpen(true);
                        }}
                        className="rounded border border-rose-900/60 bg-rose-950/30 hover:bg-rose-900/50 px-2 py-1 text-[10px] font-semibold text-rose-300 transition-all"
                      >
                        Void
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={12}
                    className="py-8 text-center text-xs text-gray-500 italic"
                  >
                    No game entries found for the selected date and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Start Game Modal */}
      <StartGameModal
        isOpen={isStartOpen}
        onClose={() => setIsStartOpen(false)}
        tables={data?.tables || []}
        onSuccess={fetchDashboard}
      />

      {/* End Game Modal */}
      <EndGameModal
        isOpen={isEndOpen}
        onClose={() => {
          setIsEndOpen(false);
          setSelectedGame(null);
        }}
        game={selectedGame}
        activeGames={gamesList.filter((g) => g.status === "live")}
        currency={currency}
        onRequestVoid={(g) => {
          setSelectedGame(g);
          setIsVoidOpen(true);
        }}
        onSuccess={fetchDashboard}
      />

      {/* Void Request Modal */}
      <VoidRequestModal
        isOpen={isVoidOpen}
        onClose={() => {
          setIsVoidOpen(false);
          setSelectedGame(null);
        }}
        game={selectedGame}
        onSuccess={fetchDashboard}
      />

      {/* Checkout Bill Modal */}
      <CheckoutBillModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setSelectedBill(null);
        }}
        bill={selectedBill}
        currency={currency}
        onSuccess={fetchDashboard}
      />
    </AppShell>
  );
}
