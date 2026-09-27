"use client";

import React, { useState, useEffect } from "react";
import { ClubTable, GameType } from "@/types";
import { X, Play, Clock, Users, Sparkles, Plus, Trash2, Swords, Shield } from "lucide-react";
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
      setPlayers((prev) => (prev.length >= 1 ? prev : [""]));
    }
  }, [gameType]);

  const addCenturyPlayer = () => {
    if (players.length < 10) {
      setPlayers([...players, ""]);
    }
  };

  const removeCenturyPlayer = (index: number) => {
    if (players.length > 1) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

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

    if (gameType === "double") {
      const p1 = players[0]?.trim();
      const p2 = players[1]?.trim();
      const p3 = players[2]?.trim();
      const p4 = players[3]?.trim();
      if (!p1 || !p2 || !p3 || !p4) {
        setError("Please provide all 4 player names for Double (2 players in Team 1 and 2 players in Team 2)");
        return;
      }
    } else if (gameType === "century") {
      const validCenturyPlayers = players.map((p) => p.trim()).filter(Boolean);
      if (validCenturyPlayers.length === 0) {
        setError("Please enter at least 1 player name for Century");
        return;
      }
    } else {
      const p1 = players[0]?.trim();
      const p2 = players[1]?.trim();
      if (!p1 || !p2) {
        setError("Please provide both player names for Single match");
        return;
      }
    }

    const validPlayers =
      gameType === "century"
        ? players.map((p) => p.trim()).filter(Boolean)
        : players.map((p) => p.trim()).filter(Boolean);

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
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {gameType === "double"
                  ? "Teams & Players"
                  : gameType === "century"
                  ? "Century Players"
                  : "Players"}
              </label>
              <span className="text-[10px] text-amber-400 font-medium">
                {gameType === "double"
                  ? "2 Players per Team (4 Total)"
                  : gameType === "century"
                  ? `${players.length}/10 Players`
                  : "Player 1 vs Player 2"}
              </span>
            </div>

            {gameType === "double" ? (
              /* Double: Team 1 & Team 2 */
              <div className="space-y-3">
                {/* Team 1 */}
                <div className="rounded-xl border border-emerald-800/70 bg-[#0d2217] p-3 shadow-inner">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 mb-2">
                    <Shield className="h-3.5 w-3.5 text-emerald-400" />
                    <span>TEAM 1</span>
                    <span className="text-[10px] text-gray-400 font-normal ml-auto">Players 1 & 2</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[10px] font-bold text-emerald-500">T1-P1</span>
                      <input
                        type="text"
                        value={players[0] || ""}
                        onChange={(e) => handlePlayerChange(0, e.target.value)}
                        placeholder="Player 1 Name"
                        className="w-full rounded-lg border border-emerald-900 bg-[#08150f] pl-12 pr-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[10px] font-bold text-emerald-500">T1-P2</span>
                      <input
                        type="text"
                        value={players[1] || ""}
                        onChange={(e) => handlePlayerChange(1, e.target.value)}
                        placeholder="Player 2 Name"
                        className="w-full rounded-lg border border-emerald-900 bg-[#08150f] pl-12 pr-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center my-0.5">
                  <span className="rounded-full bg-[#13271c] border border-amber-500/40 px-3 py-0.5 text-[10px] font-bold text-amber-400 tracking-wider uppercase">
                    VS
                  </span>
                </div>

                {/* Team 2 */}
                <div className="rounded-xl border border-amber-800/60 bg-[#1c1a0e] p-3 shadow-inner">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 mb-2">
                    <Shield className="h-3.5 w-3.5 text-amber-400" />
                    <span>TEAM 2</span>
                    <span className="text-[10px] text-gray-400 font-normal ml-auto">Players 3 & 4</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[10px] font-bold text-amber-500">T2-P1</span>
                      <input
                        type="text"
                        value={players[2] || ""}
                        onChange={(e) => handlePlayerChange(2, e.target.value)}
                        placeholder="Player 3 Name"
                        className="w-full rounded-lg border border-amber-950 bg-[#100f07] pl-12 pr-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[10px] font-bold text-amber-500">T2-P2</span>
                      <input
                        type="text"
                        value={players[3] || ""}
                        onChange={(e) => handlePlayerChange(3, e.target.value)}
                        placeholder="Player 4 Name"
                        className="w-full rounded-lg border border-amber-950 bg-[#100f07] pl-12 pr-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : gameType === "century" ? (
              /* Century: Dynamic up to 10 players */
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {players.map((playerName, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 relative">
                      <span className="absolute left-2.5 top-2 text-[10px] font-bold text-gray-500">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={playerName}
                        onChange={(e) => handlePlayerChange(idx, e.target.value)}
                        placeholder={`Player ${idx + 1} Name`}
                        className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] pl-8 pr-8 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                      {players.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCenturyPlayer(idx)}
                          className="absolute right-2 p-1 text-gray-500 hover:text-rose-400 transition-colors"
                          title="Remove player"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {players.length < 10 && (
                  <button
                    type="button"
                    onClick={addCenturyPlayer}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-emerald-700/60 bg-emerald-950/20 hover:bg-emerald-950/40 py-2 text-xs font-semibold text-emerald-300 transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Add Player ({players.length}/10)</span>
                  </button>
                )}
              </div>
            ) : (
              /* Single / Final (2 Players) */
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
