"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TableCard } from "@/components/common/TableCard";
import { ClubTable, Game } from "@/types";
import { StartGameModal } from "@/components/modals/StartGameModal";
import { EndGameModal } from "@/components/modals/EndGameModal";
import { VoidRequestModal } from "@/components/modals/VoidRequestModal";
import {
  RefreshCw,
  Flame,
  Gamepad2,
  Banknote,
  Coins,
  Receipt,
  Play,
  Clock,
} from "lucide-react";
import { useSession } from "next-auth/react";

export default function LiveBoardPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [tables, setTables] = useState<ClubTable[]>([]);
  const [activeGames, setActiveGames] = useState<Record<string, Game>>({});
  const [kpis, setKpis] = useState<{
    gamesCount: number;
    activeNow: number;
    cash: number;
    gameSale: number;
    cafeSale: number;
    totalSale: number;
  } | null>(null);
  const [currency, setCurrency] = useState("Rs.");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<ClubTable | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const fetchLiveState = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const [liveRes, dashRes] = await Promise.all([
        fetch("/api/live"),
        fetch("/api/dashboard"),
      ]);

      if (liveRes.ok) {
        const liveData = await liveRes.json();
        setTables(liveData.tables || []);
        setActiveGames(liveData.activeGames || {});
      }

      if (dashRes.ok) {
        const dashData = await dashRes.json();
        if (dashData.kpis) {
          setKpis({
            gamesCount: dashData.kpis.gamesCount,
            activeNow: dashData.kpis.activeNow,
            cash: dashData.kpis.cash,
            gameSale: dashData.kpis.gameSale,
            cafeSale: dashData.kpis.cafeSale,
            totalSale: dashData.kpis.totalSale,
          });
        }
        if (dashData.currency) setCurrency(dashData.currency);
      }
    } catch (err) {
      console.error("Live state error:", err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveState();
    // Auto refresh live table state every 10 seconds
    const interval = setInterval(() => fetchLiveState(false), 10000);
    return () => clearInterval(interval);
  }, [fetchLiveState]);

  const handleStartGame = (table: ClubTable) => {
    setSelectedTable(table);
    setIsStartOpen(true);
  };

  const handleEndGame = (game: Game) => {
    setSelectedGame(game);
    setIsEndOpen(true);
  };

  const activeCount = Object.keys(activeGames).length;
  const availableCount = Math.max(0, tables.length - activeCount);

  return (
    <AppShell title="Live Floor & Table Board">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="text-amber-400">🎱</span> Real-Time Match Floor
            </h1>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-0.5 text-xs font-bold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-green" />
              Live Synced
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Real-time table occupancy, elapsed frame timers, and fast checkout
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchLiveState(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-[#1b3a2a] bg-[#0c1c14] hover:bg-[#142d20] px-3.5 py-2 text-xs font-semibold text-gray-300 transition-all shadow"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-amber-400 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            <span>Refresh Board</span>
          </button>

          <button
            onClick={() => {
              setSelectedTable(null);
              setIsStartOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-950 transition-all active:scale-95"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>Start Game</span>
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            liveGame={activeGames[table.id] || null}
            onStartGame={handleStartGame}
            onEndGame={handleEndGame}
            currency={currency}
            isEmployeeView={!isAdmin}
          />
        ))}
      </div>

      {/* Quick Stats Strip Below */}
      <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#163022] pb-3 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <span>⚡ Floor Summary Strip</span>
          </span>
          <span className="text-xs font-semibold text-emerald-400">
            {activeCount} Tables In Play • {availableCount} Available
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-emerald-950 bg-[#0d2116] p-3">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">
              Active Now
            </span>
            <span className="text-lg font-black text-amber-400">
              {activeCount} Tables
            </span>
          </div>

          <div className="rounded-xl border border-emerald-950 bg-[#0d2116] p-3">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">
              Today&apos;s Frames
            </span>
            <span className="text-lg font-bold text-white">
              {kpis?.gamesCount ?? 0}
            </span>
          </div>

          <div className="rounded-xl border border-emerald-950 bg-[#0d2116] p-3">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">
              Cash Drawer
            </span>
            <span className="text-lg font-bold text-emerald-400">
              {currency} {kpis?.cash ?? 0}
            </span>
          </div>

          <div className="rounded-xl border border-emerald-950 bg-[#0d2116] p-3">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">
              Game Sales
            </span>
            <span className="text-lg font-bold text-amber-300">
              {currency} {kpis?.gameSale ?? 0}
            </span>
          </div>

          <div className="rounded-xl border border-emerald-950 bg-[#0d2116] p-3">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">
              Café Sales
            </span>
            <span className="text-lg font-bold text-emerald-300">
              {currency} {kpis?.cafeSale ?? 0}
            </span>
          </div>

          <div className="rounded-xl border border-emerald-950 bg-[#0d2116] p-3">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">
              Total Shift Sale
            </span>
            <span className="text-lg font-black text-amber-400">
              {currency} {kpis?.totalSale ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <StartGameModal
        isOpen={isStartOpen}
        onClose={() => {
          setIsStartOpen(false);
          setSelectedTable(null);
        }}
        tables={tables}
        selectedTable={selectedTable}
        onSuccess={() => fetchLiveState(true)}
      />

      <EndGameModal
        isOpen={isEndOpen}
        onClose={() => {
          setIsEndOpen(false);
          setSelectedGame(null);
        }}
        game={selectedGame}
        activeGames={Object.values(activeGames)}
        currency={currency}
        onRequestVoid={(g) => {
          setSelectedGame(g);
          setIsVoidOpen(true);
        }}
        onSuccess={() => fetchLiveState(true)}
      />

      <VoidRequestModal
        isOpen={isVoidOpen}
        onClose={() => {
          setIsVoidOpen(false);
          setSelectedGame(null);
        }}
        game={selectedGame}
        onSuccess={() => fetchLiveState(true)}
      />
    </AppShell>
  );
}
