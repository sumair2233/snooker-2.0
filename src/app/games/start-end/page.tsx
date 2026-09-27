"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ClubTable, Game, GameType, PaymentMethod } from "@/types";
import {
  Play,
  CheckCircle2,
  Clock,
  Users,
  ShieldAlert,
  Percent,
  Flame,
  Check,
  Shield,
  Plus,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import confetti from "canvas-confetti";
import { VoidRequestModal } from "@/components/modals/VoidRequestModal";

export default function StartEndGamePage() {
  const { data: session } = useSession();
  const [tables, setTables] = useState<ClubTable[]>([]);
  const [activeGames, setActiveGames] = useState<Game[]>([]);
  const [currency, setCurrency] = useState("Rs.");

  // Start Game Form State
  const [tableId, setTableId] = useState<string>("");
  const [gameType, setGameType] = useState<GameType>("single");
  const [ballCount, setBallCount] = useState<string>("15 Ball");
  const [players, setPlayers] = useState<string[]>(["", ""]);
  const [customRate, setCustomRate] = useState<number>(200);
  const [startTime, setStartTime] = useState<string>("");
  const [startNotes, setStartNotes] = useState<string>("");
  const [startLoading, setStartLoading] = useState(false);
  const [startSuccess, setStartSuccess] = useState(false);
  const [startError, setStartError] = useState("");

  // End Game Form State
  const [selectedEndGameId, setSelectedEndGameId] = useState<string>("");
  const [loser, setLoser] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [onlineAmount, setOnlineAmount] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [endNotes, setEndNotes] = useState<string>("");
  const [endLoading, setEndLoading] = useState(false);
  const [endSuccess, setEndSuccess] = useState(false);
  const [endError, setEndError] = useState("");

  // Void modal
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [gameToVoid, setGameToVoid] = useState<Game | null>(null);

  // Fetch tables and live games
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/live");
      if (res.ok) {
        const liveData = await res.json();
        setTables(liveData.tables || []);
        const activeList = Object.values(liveData.activeGames || {}) as Game[];
        setActiveGames(activeList);
        if (activeList.length > 0 && !selectedEndGameId) {
          setSelectedEndGameId(activeList[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading floor state:", err);
    }
  }, [selectedEndGameId]);

  useEffect(() => {
    fetchData();
    // Default start time to now
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    setStartTime(`${hours}:${mins}`);
  }, [fetchData]);

  // Adjust player inputs based on game type
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

  // Set default rate when active table or ball count changes
  const activeTable = tables.find((t) => t.id === tableId) || tables[0];
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

  // When selected end game changes, populate default loser & amounts
  const selectedEndGame = activeGames.find((g) => g.id === selectedEndGameId) || null;
  useEffect(() => {
    if (selectedEndGame) {
      const startTimeMs = new Date(selectedEndGame.start_time).getTime();
      const elapsedMins = Math.max(1, Math.round((Date.now() - startTimeMs) / 60000));

      let baseAmount = selectedEndGame.rate;
      if (selectedEndGame.type === "century") {
        baseAmount = elapsedMins * selectedEndGame.rate;
      }

      setCashAmount(baseAmount);
      setOnlineAmount(0);
      setDiscount(0);
      setEndNotes(selectedEndGame.notes || "");
      if (selectedEndGame.players.length > 0) {
        if (selectedEndGame.type === "double" && selectedEndGame.players.length >= 4) {
          setLoser(`Team 2 (${selectedEndGame.players[2]} & ${selectedEndGame.players[3]})`);
        } else if (selectedEndGame.type === "century") {
          setLoser("");
        } else {
          setLoser(selectedEndGame.players[1] || selectedEndGame.players[0]);
        }
      }
    }
  }, [selectedEndGame]);

  const handleStartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStartError("");
    setStartSuccess(false);

    const targetTable = tables.find((t) => t.id === (tableId || tables[0]?.id));
    if (!targetTable) {
      setStartError("Please select a table");
      return;
    }

    if (gameType === "double") {
      const p1 = players[0]?.trim();
      const p2 = players[1]?.trim();
      const p3 = players[2]?.trim();
      const p4 = players[3]?.trim();
      if (!p1 || !p2 || !p3 || !p4) {
        setStartError("Please enter all 4 player names for Double (Team 1: 2 players, Team 2: 2 players)");
        return;
      }
    } else if (gameType === "century") {
      const validCenturyPlayers = players.map((p) => p.trim()).filter(Boolean);
      if (validCenturyPlayers.length === 0) {
        setStartError("Please enter at least 1 player name for Century");
        return;
      }
    } else {
      const p1 = players[0]?.trim();
      const p2 = players[1]?.trim();
      if (!p1 || !p2) {
        setStartError("Please enter both player names for Single match");
        return;
      }
    }

    const validPlayers = players.map((p) => p.trim()).filter(Boolean);

    setStartLoading(true);
    try {
      const todayDate = new Date().toISOString().split("T")[0];
      const startDateTimeIso = startTime
        ? new Date(`${todayDate}T${startTime}:00`).toISOString()
        : new Date().toISOString();

      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: targetTable.id,
          table_name: targetTable.name,
          type: gameType,
          ball_count: ballCount,
          rate: customRate,
          players: validPlayers,
          start_time: startDateTimeIso,
          notes: startNotes,
          employee_id: session?.user?.id || "usr-emp-1",
          employee_name: session?.user?.name || "Club Staff",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start game");
      }

      setStartSuccess(true);
      setStartNotes("");
      if (gameType !== "century") setPlayers(["", ""]);
      setTimeout(() => setStartSuccess(false), 4000);
      fetchData();
    } catch (err: unknown) {
      setStartError(err instanceof Error ? err.message : "Error starting game");
    } finally {
      setStartLoading(false);
    }
  };

  const handleEndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEndGame) {
      setEndError("Please select an active game");
      return;
    }

    setEndLoading(true);
    setEndError("");
    setEndSuccess(false);

    try {
      const startTimeMs = new Date(selectedEndGame.start_time).getTime();
      const elapsedMins = Math.max(1, Math.round((Date.now() - startTimeMs) / 60000));
      const subtotal =
        selectedEndGame.type === "century"
          ? elapsedMins * selectedEndGame.rate
          : selectedEndGame.rate;

      const res = await fetch(`/api/games/${selectedEndGame.id}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loser: selectedEndGame.type === "century" ? null : loser,
          payment_method: paymentMethod,
          amount: subtotal,
          cash_amount: cashAmount,
          online_amount: onlineAmount,
          discount,
          notes: endNotes,
          employee_id: session?.user?.id || "usr-emp-1",
          employee_name: session?.user?.name || "Club Staff",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to end game");
      }

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      setEndSuccess(true);
      setTimeout(() => setEndSuccess(false), 4000);
      fetchData();
    } catch (err: unknown) {
      setEndError(err instanceof Error ? err.message : "Error ending game");
    } finally {
      setEndLoading(false);
    }
  };

  return (
    <AppShell title="Start / End Game Station">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>🎮 Match Counter Terminal</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Dual-panel terminal for starting new frames and finalizing active tables
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* =========================================================
            PANEL 1: START NEW GAME
           ========================================================= */}
        <div className="rounded-2xl border border-emerald-900/50 bg-[#0a1811] p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#163022] pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                <Play className="h-4 w-4 fill-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Start New Game</h2>
                <p className="text-xs text-gray-400">
                  Select game mode, table, players and rates
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-950 px-2.5 py-0.5 text-xs text-emerald-400 font-semibold border border-emerald-900">
              Station A
            </span>
          </div>

          {startSuccess && (
            <div className="mb-4 rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Game started successfully! Table is now live.</span>
            </div>
          )}

          {startError && (
            <div className="mb-4 rounded-xl border border-rose-800/50 bg-rose-950/40 p-3 text-xs text-rose-300">
              {startError}
            </div>
          )}

          <form onSubmit={handleStartSubmit} className="space-y-4">
            {/* Game Type Buttons */}
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
                    { id: "final", label: "Final", desc: "Series" },
                  ] as const
                ).map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setGameType(type.id)}
                    className={`rounded-xl border p-2 text-left transition-all ${
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

            {/* Table & Ball Count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Table / Game
                </label>
                <select
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
                >
                  {tables.map((t) => {
                    const isBusy = activeGames.some((g) => g.table_id === t.id);
                    return (
                      <option key={t.id} value={t.id}>
                        #{t.table_number} - {t.name} {isBusy ? "(Busy)" : "(Available)"}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Ball Count
                </label>
                <select
                  value={ballCount}
                  onChange={(e) => setBallCount(e.target.value)}
                  disabled={gameType === "century"}
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="15 Ball">15 Ball — Rs. {activeTable?.rates?.ball15 || 200}</option>
                  <option value="10 Ball">10 Ball — Rs. {activeTable?.rates?.ball10 || 150}</option>
                  <option value="6 Ball">6 Ball — Rs. {activeTable?.rates?.ball6 || 100}</option>
                  <option value="Best of 3">Best of 3 Series</option>
                  {gameType === "century" && (
                    <option value="Century Break">Century Break (Per Min)</option>
                  )}
                </select>
              </div>
            </div>

            {/* Players */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {gameType === "double"
                    ? "Teams & Players"
                    : gameType === "century"
                    ? "Century Players"
                    : "Player Names"}
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
                  <div className="rounded-xl border border-emerald-800/70 bg-[#0d2217] p-3">
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
                          onChange={(e) => {
                            const updated = [...players];
                            updated[0] = e.target.value;
                            setPlayers(updated);
                          }}
                          placeholder="Player 1 Name"
                          className="w-full rounded-lg border border-emerald-900 bg-[#08150f] pl-12 pr-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-[10px] font-bold text-emerald-500">T1-P2</span>
                        <input
                          type="text"
                          value={players[1] || ""}
                          onChange={(e) => {
                            const updated = [...players];
                            updated[1] = e.target.value;
                            setPlayers(updated);
                          }}
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
                  <div className="rounded-xl border border-amber-800/60 bg-[#1c1a0e] p-3">
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
                          onChange={(e) => {
                            const updated = [...players];
                            updated[2] = e.target.value;
                            setPlayers(updated);
                          }}
                          placeholder="Player 3 Name"
                          className="w-full rounded-lg border border-amber-950 bg-[#100f07] pl-12 pr-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-[10px] font-bold text-amber-500">T2-P2</span>
                        <input
                          type="text"
                          value={players[3] || ""}
                          onChange={(e) => {
                            const updated = [...players];
                            updated[3] = e.target.value;
                            setPlayers(updated);
                          }}
                          placeholder="Player 4 Name"
                          className="w-full rounded-lg border border-amber-950 bg-[#100f07] pl-12 pr-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : gameType === "century" ? (
                /* Century: Up to 10 players */
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    {players.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 relative">
                        <span className="absolute left-2.5 top-2 text-[10px] font-bold text-gray-500">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={p}
                          onChange={(e) => {
                            const updated = [...players];
                            updated[idx] = e.target.value;
                            setPlayers(updated);
                          }}
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
                  {players.map((p, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute left-3 top-2 text-[10px] font-bold text-gray-500">
                        P{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={p}
                        onChange={(e) => {
                          const updated = [...players];
                          updated[idx] = e.target.value;
                          setPlayers(updated);
                        }}
                        placeholder={`Player ${idx + 1}`}
                        className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] pl-8 pr-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Time & Computed Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Live Computed Rate
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
                Notes (Optional)
              </label>
              <input
                type="text"
                value={startNotes}
                onChange={(e) => setStartNotes(e.target.value)}
                placeholder="Tournament slot, table condition..."
                className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={startLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-xl shadow-emerald-950 transition-all disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>{startLoading ? "Launching Game..." : "Start Game Now"}</span>
            </button>
          </form>
        </div>

        {/* =========================================================
            PANEL 2: END ACTIVE GAME
           ========================================================= */}
        <div className="rounded-2xl border border-amber-500/40 bg-[#0a1811] p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#163022] pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-950 border border-amber-800 text-amber-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">End Active Game</h2>
                <p className="text-xs text-gray-400">
                  Select active game, record loser, payment and finalize
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-950 px-2.5 py-0.5 text-xs text-amber-400 font-semibold border border-amber-800">
              Station B
            </span>
          </div>

          {endSuccess && (
            <div className="mb-4 rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Game concluded & payment recorded successfully!</span>
            </div>
          )}

          {endError && (
            <div className="mb-4 rounded-xl border border-rose-800/50 bg-rose-950/40 p-3 text-xs text-rose-300">
              {endError}
            </div>
          )}

          {/* Active Games Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Active Games in Play ({activeGames.length})
            </label>
            <select
              value={selectedEndGameId}
              onChange={(e) => setSelectedEndGameId(e.target.value)}
              className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs font-bold text-amber-300 focus:border-amber-500 focus:outline-none"
            >
              {activeGames.length === 0 ? (
                <option value="">— No active games —</option>
              ) : (
                activeGames.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.table_name} • {g.players.join(" vs ")} ({g.type})
                  </option>
                ))
              )}
            </select>
          </div>

          {!selectedEndGame ? (
            <div className="my-16 text-center text-gray-500 text-xs">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <span>— No active games available to end —</span>
            </div>
          ) : (
            <form onSubmit={handleEndSubmit} className="mt-4 space-y-4">
              {/* Match Snapshot */}
              <div className="rounded-xl border border-amber-500/30 bg-[#0e2117] p-3 text-xs space-y-2">
                <div className="flex justify-between font-bold text-white">
                  <span>{selectedEndGame.table_name}</span>
                  <span className="text-amber-400 capitalize">
                    {selectedEndGame.type} • {selectedEndGame.ball_count}
                  </span>
                </div>

                {selectedEndGame.type === "double" && selectedEndGame.players.length >= 4 ? (
                  <div className="border-t border-emerald-950/80 pt-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300 flex items-center gap-1">
                        <Shield className="h-3 w-3 text-emerald-400" /> Team 1:
                      </span>
                      <span className="text-white font-medium">{selectedEndGame.players[0]} & {selectedEndGame.players[1]}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 flex items-center gap-1">
                        <Shield className="h-3 w-3 text-amber-400" /> Team 2:
                      </span>
                      <span className="text-white font-medium">{selectedEndGame.players[2]} & {selectedEndGame.players[3]}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between text-gray-300 border-t border-emerald-950 pt-2">
                    <span>
                      {selectedEndGame.type === "century" ? `Century Players (${selectedEndGame.players.length}): ` : "Players: "}
                      {selectedEndGame.players.join(", ")}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      Rate: {currency} {selectedEndGame.rate}
                    </span>
                  </div>
                )}
              </div>

              {/* Loser / Payer Selector */}
              {selectedEndGame.type === "double" && selectedEndGame.players.length >= 4 ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center justify-between">
                    <span>Losing Team / Payer (Bill Given to Team)</span>
                    <span className="text-[10px] text-amber-400 font-normal">Team Bill</span>
                  </label>
                  <select
                    value={loser}
                    onChange={(e) => setLoser(e.target.value)}
                    className="w-full rounded-xl border border-amber-500/50 bg-[#0d1e15] px-3 py-2 text-xs font-bold text-amber-300 focus:border-amber-400 focus:outline-none"
                  >
                    <optgroup label="Double Teams (Bill Assigned to Team)">
                      <option value={`Team 1 (${selectedEndGame.players[0]} & ${selectedEndGame.players[1]})`}>
                        🏆 Team 1: {selectedEndGame.players[0]} & {selectedEndGame.players[1]} (Bill to Team 1)
                      </option>
                      <option value={`Team 2 (${selectedEndGame.players[2]} & ${selectedEndGame.players[3]})`}>
                        🏆 Team 2: {selectedEndGame.players[2]} & {selectedEndGame.players[3]} (Bill to Team 2)
                      </option>
                    </optgroup>
                    <optgroup label="Individual Players">
                      {selectedEndGame.players.map((p, idx) => (
                        <option key={p} value={p}>
                          {p} (Team {idx < 2 ? "1" : "2"} - Individual)
                        </option>
                      ))}
                    </optgroup>
                    <option value="">Split payment / None</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Selecting a team assigns the bill tab directly to that team in the ledger.
                  </p>
                </div>
              ) : selectedEndGame.type === "century" ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center justify-between">
                    <span>Bill Payer ({selectedEndGame.players.length} Players)</span>
                    <span className="text-[10px] text-emerald-400 font-normal">Century Break</span>
                  </label>
                  <select
                    value={loser}
                    onChange={(e) => setLoser(e.target.value)}
                    className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">Split Evenly (All {selectedEndGame.players.length} Players)</option>
                    {selectedEndGame.players.map((p) => (
                      <option key={p} value={p}>
                        {p} (Pays Full Bill)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Frame Loser (Bill Payer)
                  </label>
                  <select
                    value={loser}
                    onChange={(e) => setLoser(e.target.value)}
                    className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
                  >
                    {selectedEndGame.players.map((p) => (
                      <option key={p} value={p}>
                        {p} (Loss)
                      </option>
                    ))}
                    <option value="">Split payment / None</option>
                  </select>
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(
                    [
                      { id: "cash", label: "Cash" },
                      { id: "online", label: "Online" },
                      { id: "split", label: "Split" },
                      { id: "pending", label: "Bill Tab" },
                      { id: "free", label: "Free" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`rounded-xl border py-2 text-center text-xs font-bold capitalize transition-all ${
                        paymentMethod === m.id
                          ? "border-amber-500 bg-amber-950/40 text-amber-300"
                          : "border-emerald-950 bg-[#0d1e15] text-gray-400 hover:border-emerald-800"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount & Final Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Discount ({currency})
                  </label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Total Settle
                  </label>
                  <div className="flex items-center rounded-xl border border-emerald-500/40 bg-emerald-950/20 px-3 py-2 text-xs font-bold text-emerald-300">
                    {currency} {Math.max(0, selectedEndGame.amount - discount)}
                  </div>
                </div>
              </div>

              {/* End Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#163022]">
                <button
                  type="button"
                  onClick={() => {
                    setGameToVoid(selectedEndGame);
                    setIsVoidOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/40"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Void Game</span>
                </button>

                <button
                  type="submit"
                  disabled={endLoading}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-950 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{endLoading ? "Finalizing..." : "End & Settle Game"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <VoidRequestModal
        isOpen={isVoidOpen}
        onClose={() => {
          setIsVoidOpen(false);
          setGameToVoid(null);
        }}
        game={gameToVoid}
        onSuccess={fetchData}
      />
    </AppShell>
  );
}
