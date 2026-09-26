"use client";

import React, { useState, useEffect } from "react";
import { ClubTable, GameType } from "@/types";
import { X, Play, Clock, Users, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";

interface StartGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: ClubTable[];
  selectedTable?: ClubTable | null;
  onSuccess: () => void;
}

export function StartGameModal({
  isOpen,
  onClose,
  tables,
  selectedTable,
  onSuccess,
}: StartGameModalProps) {
  const { data: session } = useSession();
  const [tableId, setTableId] = useState<string>("");
  const [gameType, setGameType] = useState<GameType>("single");
  const [ballCount, setBallCount] = useState<string>("15 Ball");
  const [players, setPlayers] = useState<string[]>(["", ""]);
  const [customRate, setCustomRate] = useState<number>(200);
  const [startTime, setStartTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Initialize form state
  useEffect(() => {
    if (selectedTable) {
      setTableId(selectedTable.id);
    } else if (tables.length > 0 && !tableId) {
      setTableId(tables[0].id);
    }

    // Default start time to current local HH:mm
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    setStartTime(`${hours}:${mins}`);
  }, [selectedTable, tables, tableId]);

  // Adjust player count based on game type
  useEffect(() => {
    if (gameType === "single" || gameType === "final") {
      setPlayers((prev) => [prev[0] || "", prev[1] || ""]);
    } else if (gameType === "double") {
      setPlayers((prev) => [
        prev[0] || "",
        prev[1] || "",
        prev[2] || "",
        prev[3] || "",
      ]);
    } else if (gameType === "century") {
      setPlayers((prev) => [prev[0] || "Solo Break Builder"]);
    }
  }, [gameType]);

  // Compute default rate when table or ball count changes
  const activeTable = tables.find((t) => t.id === tableId);
  useEffect(() => {
    if (!activeTable) return;
    if (gameType === "century") {
      setCustomRate(activeTable.rates.centuryPerMin || 6);
    } else if (ballCount === "15 Ball") {
      setCustomRate(activeTable.rates.ball15);
    } else if (ballCount === "10 Ball") {
      setCustomRate(activeTable.rates.ball10);
    } else if (ballCount === "6 Ball") {
      setCustomRate(activeTable.rates.ball6);
    } else if (ballCount === "Best of 3") {
      setCustomRate(activeTable.rates.ball15 * 2.5);
    }
  }, [activeTable, ballCount, gameType]);

  if (!isOpen) return null;

  const handlePlayerChange = (index: number, value: string) => {
    const updated = [...players];
    updated[index] = value;
    setPlayers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!tableId) {
      setError("Please select a table");
      return;
    }

    // Filter out blank players for non-century
    const validPlayers =
      gameType === "century"
        ? [players[0] || "Solo Break Builder"]
        : players.map((p) => p.trim()).filter(Boolean);

    if (gameType !== "century" && validPlayers.length < (gameType === "double" ? 4 : 2)) {
      setError(`Please provide all player names for a ${gameType} match`);
      return;
    }

    setLoading(true);
    try {
      // Build start ISO timestamp
      const todayDate = new Date().toISOString().split("T")[0];
      const startDateTimeIso = startTime
        ? new Date(`${todayDate}T${startTime}:00`).toISOString()
        : new Date().toISOString();

      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: tableId,
          table_name: activeTable?.name || "Table",
          type: gameType,
          ball_count: ballCount,
          rate: customRate,
          players: validPlayers,
          start_time: startDateTimeIso,
          notes,
          employee_id: session?.user?.id || "usr-emp-1",
          employee_name: session?.user?.name || "Club Staff",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start game");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error starting game");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-emerald-800/60 bg-[#0a1811] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#163022] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
              <Play className="h-4 w-4 fill-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Start New Game</h2>
              <p className="text-xs text-gray-400">
                Setup and launch a live snooker/billiards frame
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-[#13271c] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-800/50 bg-rose-950/40 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Game Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Game Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: "single", label: "Single", desc: "2 Players" },
                  { id: "double", label: "Double", desc: "4 Players" },
                  { id: "century", label: "Century", desc: "Per Min" },
                  { id: "final", label: "Final", desc: "Best of N" },
                ] as const
              ).map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setGameType(type.id)}
                  className={`rounded-xl border p-2.5 text-left transition-all ${
                    gameType === type.id
                      ? "border-amber-500 bg-amber-950/40 text-amber-300 shadow-sm"
                      : "border-emerald-950 bg-[#0d1e15] text-gray-400 hover:border-emerald-800"
                  }`}
                >
                  <span className="block text-xs font-bold capitalize">
                    {type.label}
                  </span>
                  <span className="block text-[10px] text-gray-400">
                    {type.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Table & Ball Count row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Table
              </label>
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
              >
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.table_number} - {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Ball Count / Mode
              </label>
              <select
                value={ballCount}
                onChange={(e) => setBallCount(e.target.value)}
                disabled={gameType === "century"}
                className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none disabled:opacity-50"
              >
                <option value="15 Ball">15 Ball — Standard Frame</option>
                <option value="10 Ball">10 Ball — Fast Match</option>
                <option value="6 Ball">6 Ball — Quick Game</option>
                <option value="Best of 3">Best of 3 Series</option>
                {gameType === "century" && (
                  <option value="Century Break">Century Break (Per Min)</option>
                )}
              </select>
            </div>
          </div>

          {/* Player Names Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center justify-between">
              <span>Players</span>
              <span className="text-[10px] lowercase text-emerald-400">
                {gameType === "double"
                  ? "4 Players"
                  : gameType === "century"
                  ? "Solo Break / Practice"
                  : "2 Players"}
              </span>
            </label>

            {gameType === "century" ? (
              <input
                type="text"
                value={players[0] || ""}
                onChange={(e) => handlePlayerChange(0, e.target.value)}
                placeholder="Player name (optional, defaults to Solo)"
                className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {players.map((playerName, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute left-3 top-2 text-[10px] font-bold text-gray-500">
                      P{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => handlePlayerChange(idx, e.target.value)}
                      placeholder={`Player ${idx + 1} Name`}
                      className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] pl-8 pr-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Start Time & Rate Preview */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Computed Rate
              </label>
              <div className="flex items-center rounded-xl border border-amber-500/40 bg-amber-950/20 px-3 py-1.5">
                <span className="text-xs text-gray-400 mr-2">Rs.</span>
                <input
                  type="number"
                  value={customRate}
                  onChange={(e) => setCustomRate(Number(e.target.value))}
                  className="w-full bg-transparent text-sm font-bold text-amber-300 focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 shrink-0">
                  {gameType === "century" ? "/min" : "fixed"}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Match Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Decider frame, tournament slot, cue rental"
              className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#163022]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-800 bg-[#0c1812] px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-950 transition-all disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>{loading ? "Starting..." : "Start Game"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
