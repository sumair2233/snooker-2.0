"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Game, ClubTable } from "@/types";
import { exportToExcel } from "@/lib/export";
import {
  FileSpreadsheet,
  Search,
  Filter,
  Gamepad2,
  Banknote,
  Globe,
  Clock,
  HandCoins,
  Flame,
  Coins,
  Play,
} from "lucide-react";
import { EndGameModal } from "@/components/modals/EndGameModal";
import { VoidRequestModal } from "@/components/modals/VoidRequestModal";

export default function TodaysGamesPage() {
  const todayStr = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [games, setGames] = useState<Game[]>([]);
  const [tables, setTables] = useState<ClubTable[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterTable, setFilterTable] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [playerSearch, setPlayerSearch] = useState("");

  // Modals
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/games?fromDate=${fromDate}&toDate=${toDate}`);
      if (res.ok) {
        const data = await res.json();
        setGames(data);
      }
      const tRes = await fetch("/api/tables");
      if (tRes.ok) {
        const tData = await tRes.json();
        setTables(tData);
      }
    } catch (err) {
      console.error("Games fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Compute summary metrics for filtered games
  const filteredGames = games.filter((g) => {
    if (filterTable !== "all" && g.table_id !== filterTable) return false;
    if (filterType !== "all" && g.type !== filterType) return false;
    if (filterPayment !== "all" && g.payment_method !== filterPayment) return false;
    if (filterStatus !== "all" && g.status !== filterStatus) return false;
    if (
      playerSearch.trim() &&
      !g.players.some((p) =>
        p.toLowerCase().includes(playerSearch.toLowerCase().trim())
      ) &&
      !g.table_name.toLowerCase().includes(playerSearch.toLowerCase().trim())
    ) {
      return false;
    }
    return true;
  });

  const totalFrames = filteredGames.length;
  let totalRevenue = 0;
  let cashTotal = 0;
  let onlineTotal = 0;
  let pendingTotal = 0;
  let activeFrames = 0;

  for (const g of filteredGames) {
    if (g.status === "completed") {
      totalRevenue += g.amount;
      cashTotal += g.cash_amount;
      onlineTotal += g.online_amount;
      if (g.payment_method === "pending") pendingTotal += g.amount;
    } else if (g.status === "live") {
      activeFrames++;
    }
  }

  const handleExport = () => {
    const rows = filteredGames.map((g) => ({
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
      PaymentMethod: g.payment_method,
      Status: g.status.toUpperCase(),
      Employee: g.employee_name,
      Notes: g.notes || "",
    }));

    exportToExcel(rows, `Games_Log_${fromDate}_to_${toDate}`, "Games Log");
  };

  return (
    <AppShell title="Today's Games Log">
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-[#1b3a2a] bg-[#0c1c14] p-1.5 text-xs text-gray-300">
            <span className="text-gray-500 mr-2 text-[10px] font-bold uppercase">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none [color-scheme:dark]"
            />
            <span className="text-gray-500 mx-2 text-[10px] font-bold uppercase">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none [color-scheme:dark]"
            />
          </div>

          <button
            onClick={() => {
              setFromDate(todayStr);
              setToDate(todayStr);
            }}
            className="rounded-xl border border-[#1b3a2a] bg-[#0c1c14] px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white"
          >
            Today Only
          </button>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-xl border border-emerald-600/40 bg-emerald-950/40 hover:bg-emerald-900/50 px-4 py-2 text-xs font-semibold text-emerald-300 transition-all shadow"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Summary KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="rounded-xl border border-amber-500/30 bg-[#0e2117] p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">
            Games Count
          </span>
          <span className="text-xl font-bold text-white mt-1 block">
            {totalFrames}
          </span>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-[#0e2117] p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">
            Total Revenue
          </span>
          <span className="text-xl font-black text-amber-300 mt-1 block">
            Rs. {totalRevenue}
          </span>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-[#0c2419] p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">
            Cash Collected
          </span>
          <span className="text-xl font-bold text-emerald-300 mt-1 block">
            Rs. {cashTotal}
          </span>
        </div>

        <div className="rounded-xl border border-teal-500/30 bg-[#0c2222] p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">
            Online Transfers
          </span>
          <span className="text-xl font-bold text-teal-300 mt-1 block">
            Rs. {onlineTotal}
          </span>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-[#220d12] p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">
            Pending on Tabs
          </span>
          <span className="text-xl font-bold text-rose-300 mt-1 block">
            Rs. {pendingTotal}
          </span>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-[#16271c] p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">
            Active Now
          </span>
          <span className="text-xl font-black text-amber-400 mt-1 block">
            {activeFrames} In Play
          </span>
        </div>
      </div>

      {/* Row-Level Table */}
      <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-xl">
        {/* Table Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              placeholder="Search player name..."
              className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] pl-8 pr-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <select
            value={filterTable}
            onChange={(e) => setFilterTable(e.target.value)}
            className="rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Tables</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.table_number} - {t.name.split(" — ")[0]}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Game Types</option>
            <option value="single">Single</option>
            <option value="double">Double</option>
            <option value="century">Century</option>
            <option value="final">Final Series</option>
          </select>

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

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="live">Live Now</option>
            <option value="cancelled">Cancelled / Voided</option>
          </select>
        </div>

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
                <th className="py-3 px-3">Staff</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/60 bg-[#07130e]">
              {filteredGames.length > 0 ? (
                filteredGames.map((game) => (
                  <tr key={game.id} className="hover:bg-[#0c1f15] transition-colors">
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
                      {game.type === "double" && game.players.length >= 4 ? (
                        <div className="space-y-0.5 text-[11px]">
                          <div><span className="text-emerald-400 font-bold">T1:</span> {game.players[0]} & {game.players[1]}</div>
                          <div><span className="text-amber-400 font-bold">T2:</span> {game.players[2]} & {game.players[3]}</div>
                        </div>
                      ) : game.type === "century" ? (
                        <div>
                          <span>{game.players.join(", ")}</span>
                          {game.players.length > 1 && (
                            <span className="ml-1.5 rounded bg-emerald-950 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-800">
                              {game.players.length}P
                            </span>
                          )}
                        </div>
                      ) : (
                        game.players.join(" vs ")
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {game.loser ? (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                          game.loser.includes("Team")
                            ? "bg-amber-950/80 text-amber-300 border-amber-800/60"
                            : "bg-rose-950 text-rose-300 border-rose-900/40"
                        }`}>
                          {game.loser}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-300">
                      {game.duration_minutes ? `${game.duration_minutes}m` : "In Play"}
                    </td>
                    <td className="py-3 px-3 font-bold text-amber-300">
                      Rs. {game.amount}
                      {game.discount > 0 && (
                        <span className="block text-[9px] text-gray-400 line-through">
                          disc: Rs. {game.discount}
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
                      {game.status === "live" && (
                        <button
                          onClick={() => {
                            setSelectedGame(game);
                            setIsEndOpen(true);
                          }}
                          className="rounded bg-amber-600 hover:bg-amber-500 px-2 py-1 text-[10px] font-bold text-gray-950 transition-all shadow"
                        >
                          End
                        </button>
                      )}

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
                    No games match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* End Game Modal */}
      <EndGameModal
        isOpen={isEndOpen}
        onClose={() => {
          setIsEndOpen(false);
          setSelectedGame(null);
        }}
        game={selectedGame}
        onSuccess={fetchGames}
        onRequestVoid={(g) => {
          setSelectedGame(g);
          setIsVoidOpen(true);
        }}
      />

      {/* Void Request Modal */}
      <VoidRequestModal
        isOpen={isVoidOpen}
        onClose={() => {
          setIsVoidOpen(false);
          setSelectedGame(null);
        }}
        game={selectedGame}
        onSuccess={fetchGames}
      />
    </AppShell>
  );
}
