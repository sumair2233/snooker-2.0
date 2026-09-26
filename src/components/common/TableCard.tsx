"use client";

import React, { useState, useEffect } from "react";
import { ClubTable, Game } from "@/types";
import { Play, CheckCircle2, Clock, Users, Flame, Trophy } from "lucide-react";

interface TableCardProps {
  table: ClubTable;
  liveGame?: Game | null;
  onStartGame?: (table: ClubTable) => void;
  onEndGame?: (game: Game) => void;
  currency?: string;
  isEmployeeView?: boolean;
}

export function TableCard({
  table,
  liveGame,
  onStartGame,
  onEndGame,
  currency = "Rs.",
  isEmployeeView = true,
}: TableCardProps) {
  const isLive = Boolean(liveGame && liveGame.status === "live");
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (!isLive || !liveGame) {
      setElapsedSeconds(0);
      return;
    }

    const startMs = new Date(liveGame.start_time).getTime();
    const updateElapsed = () => {
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isLive, liveGame]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;

    if (hours > 0) {
      return `${hours}h ${remMins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Live computed cost
  const elapsedMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60));
  let currentComputedAmount = liveGame?.amount || table.rates.ball15;
  if (liveGame?.type === "century") {
    currentComputedAmount = elapsedMinutes * (liveGame.rate || table.rates.centuryPerMin || 6);
  }

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-300 shadow-lg ${
        isLive
          ? "table-card-active border-amber-500/50 shadow-amber-500/10"
          : "table-card-available border-emerald-900/50 hover:border-emerald-600/50 shadow-emerald-950/20"
      }`}
    >
      {/* Top Header: Table Number & Status Badge */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-xs font-black text-amber-400">
                #{table.table_number}
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                {table.name}
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 ml-9">
              {table.brand} Tournament Standard
            </p>
          </div>

          {/* Status Badge */}
          {isLive ? (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-950/60 px-2.5 py-1 text-xs font-semibold text-amber-300 pulse-gold">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>IN USE</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>AVAILABLE</span>
            </span>
          )}
        </div>

        {/* Content Body: In Use vs Available */}
        {isLive && liveGame ? (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-[#16271c]/90 p-3.5 space-y-3">
            {/* Live Timer & Amount */}
            <div className="flex items-center justify-between border-b border-amber-950/50 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400 animate-spin" style={{ animationDuration: "8s" }} />
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block leading-tight">
                    Elapsed
                  </span>
                  <span className="font-mono text-base font-bold text-amber-300">
                    {formatTimer(elapsedSeconds)}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400 block leading-tight">
                  Bill So Far
                </span>
                <span className="text-base font-black text-amber-400">
                  {currency} {currentComputedAmount}
                </span>
              </div>
            </div>

            {/* Game Type & Rate */}
            <div className="flex items-center justify-between text-xs text-gray-300">
              <span className="capitalize font-semibold text-amber-200">
                {liveGame.type} • {liveGame.ball_count}
              </span>
              <span className="text-[11px] text-gray-400">
                {liveGame.type === "century"
                  ? `${currency} ${liveGame.rate}/min`
                  : `${currency} ${liveGame.rate} fixed`}
              </span>
            </div>

            {/* Players List */}
            <div className="flex items-center gap-2 text-xs">
              <Users className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <div className="truncate font-medium text-emerald-200">
                {liveGame.players.join("  vs  ")}
              </div>
            </div>

            {liveGame.notes && (
              <p className="text-[11px] italic text-gray-400 line-clamp-1 border-t border-emerald-950/60 pt-1.5">
                Note: {liveGame.notes}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-emerald-900/30 bg-[#0a1811]/60 p-3.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-2">
              Standard Rates
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-[#0e2117] p-2 border border-emerald-950">
                <span className="text-gray-400 block text-[10px]">15 Ball Rate</span>
                <span className="font-bold text-white">
                  {currency} {table.rates.ball15}
                </span>
              </div>
              <div className="rounded-lg bg-[#0e2117] p-2 border border-emerald-950">
                <span className="text-gray-400 block text-[10px]">10 Ball Rate</span>
                <span className="font-bold text-white">
                  {currency} {table.rates.ball10}
                </span>
              </div>
              <div className="rounded-lg bg-[#0e2117] p-2 border border-emerald-950">
                <span className="text-gray-400 block text-[10px]">6 Ball Rate</span>
                <span className="font-bold text-white">
                  {currency} {table.rates.ball6}
                </span>
              </div>
              <div className="rounded-lg bg-[#0e2117] p-2 border border-emerald-950">
                <span className="text-gray-400 block text-[10px]">Century Rate</span>
                <span className="font-bold text-amber-400">
                  {currency} {table.rates.centuryPerMin}/min
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Action Button */}
      <div className="mt-5 pt-3 border-t border-emerald-950/60">
        {isLive && liveGame ? (
          <button
            onClick={() => onEndGame && onEndGame(liveGame)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-950 shadow-md transition-all active:scale-98"
          >
            <Clock className="h-4 w-4" />
            <span>End / Finalize Game</span>
          </button>
        ) : (
          <button
            onClick={() => onStartGame && onStartGame(table)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all active:scale-98"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>Start Game</span>
          </button>
        )}
      </div>
    </div>
  );
}
