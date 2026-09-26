"use client";

import React, { useState, useEffect } from "react";
import { Game, PaymentMethod } from "@/types";
import { X, CheckCircle2, Clock, Users, ShieldAlert, DollarSign } from "lucide-react";
import { useSession } from "next-auth/react";
import confetti from "canvas-confetti";

interface EndGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game | null;
  activeGames?: Game[];
  onSelectGame?: (game: Game) => void;
  onSuccess: () => void;
  onRequestVoid?: (game: Game) => void;
  currency?: string;
}

export function EndGameModal({
  isOpen,
  onClose,
  game,
  activeGames = [],
  onSelectGame,
  onSuccess,
  onRequestVoid,
  currency = "Rs.",
}: EndGameModalProps) {
  const { data: session } = useSession();
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [loser, setLoser] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [onlineAmount, setOnlineAmount] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentGame =
    game || activeGames.find((g) => g.id === selectedGameId) || null;

  // Initialize form when currentGame changes
  useEffect(() => {
    if (currentGame) {
      setSelectedGameId(currentGame.id);

      // Compute elapsed duration
      const startTime = new Date(currentGame.start_time).getTime();
      const elapsedMins = Math.max(1, Math.round((Date.now() - startTime) / 60000));

      let baseAmount = currentGame.rate;
      if (currentGame.type === "century") {
        baseAmount = elapsedMins * currentGame.rate;
      }

      setCashAmount(baseAmount);
      setOnlineAmount(0);
      setDiscount(0);
      setNotes(currentGame.notes || "");
      if (currentGame.players.length > 0) {
        setLoser(currentGame.players[1] || currentGame.players[0]);
      }
    } else if (activeGames.length > 0) {
      setSelectedGameId(activeGames[0].id);
    }
  }, [currentGame, activeGames]);

  if (!isOpen) return null;

  // Calculate elapsed time string
  let elapsedMinutes = 1;
  let computedSubtotal = 0;
  if (currentGame) {
    const startTime = new Date(currentGame.start_time).getTime();
    elapsedMinutes = Math.max(1, Math.round((Date.now() - startTime) / 60000));
    computedSubtotal =
      currentGame.type === "century"
        ? elapsedMinutes * currentGame.rate
        : currentGame.rate;
  }

  const netPayable = Math.max(0, computedSubtotal - discount);

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === "cash") {
      setCashAmount(netPayable);
      setOnlineAmount(0);
    } else if (method === "online") {
      setCashAmount(0);
      setOnlineAmount(netPayable);
    } else if (method === "pending" || method === "free") {
      setCashAmount(0);
      setOnlineAmount(0);
    } else if (method === "split") {
      setCashAmount(Math.floor(netPayable / 2));
      setOnlineAmount(Math.ceil(netPayable / 2));
    }
  };

  const handleEndGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGame) {
      setError("Please select an active game");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/games/${currentGame.id}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loser: currentGame.type === "century" ? null : loser,
          payment_method: paymentMethod,
          amount: computedSubtotal,
          cash_amount: cashAmount,
          online_amount: onlineAmount,
          discount,
          notes,
          employee_id: session?.user?.id || "usr-emp-1",
          employee_name: session?.user?.name || "Club Staff",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to end game");
      }

      // Celebrate game conclusion with confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error ending game");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-[#0a1811] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#163022] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-950 border border-amber-800 text-amber-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">End Active Game</h2>
              <p className="text-xs text-gray-400">
                Finalize score, record loser & collect payment
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

        {/* Dropdown to pick active game if not pre-passed */}
        {activeGames.length > 0 && (
          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Select Active Game
            </label>
            <select
              value={selectedGameId}
              onChange={(e) => {
                setSelectedGameId(e.target.value);
                const match = activeGames.find((g) => g.id === e.target.value);
                if (match && onSelectGame) onSelectGame(match);
              }}
              className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
            >
              {activeGames.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.table_name} — {g.players.join(" vs ")} ({g.type})
                </option>
              ))}
            </select>
          </div>
        )}

        {!currentGame ? (
          <div className="my-8 text-center text-gray-500 text-xs">
            — No active games in play right now —
          </div>
        ) : (
          <form onSubmit={handleEndGame} className="mt-4 space-y-4">
            {/* Game Info Card */}
            <div className="rounded-xl border border-amber-500/30 bg-[#0e2117] p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">{currentGame.table_name}</span>
                <span className="rounded bg-amber-950 px-2 py-0.5 font-bold uppercase text-amber-300 text-[10px] border border-amber-800/50">
                  {currentGame.type} • {currentGame.ball_count}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-300 border-t border-emerald-950 pt-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Duration: {elapsedMinutes} mins</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <span>Subtotal: {currency} {computedSubtotal}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-300 border-t border-emerald-950 pt-2">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Players: {currentGame.players.join(", ")}</span>
              </div>
            </div>

            {/* Loser Selector (for single/double) */}
            {currentGame.type !== "century" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Loser / Payer (Game Loss)
                </label>
                <select
                  value={loser}
                  onChange={(e) => setLoser(e.target.value)}
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
                >
                  {currentGame.players.map((p) => (
                    <option key={p} value={p}>
                      {p} (Payer)
                    </option>
                  ))}
                  <option value="">None / Split Evenly</option>
                </select>
              </div>
            )}

            {/* Payment Method Selector */}
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
                    onClick={() => handlePaymentMethodChange(m.id)}
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

            {/* Split Breakdown / Discount Inputs */}
            <div className="grid grid-cols-2 gap-3">
              {paymentMethod === "split" && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                      Cash Amount
                    </label>
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                      Online Amount
                    </label>
                    <input
                      type="number"
                      value={onlineAmount}
                      onChange={(e) => setOnlineAmount(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                  Discount ({currency})
                </label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => {
                    const d = Number(e.target.value) || 0;
                    setDiscount(d);
                    const newNet = Math.max(0, computedSubtotal - d);
                    if (paymentMethod === "cash") setCashAmount(newNet);
                    if (paymentMethod === "online") setOnlineAmount(newNet);
                  }}
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                  Final Payable
                </label>
                <div className="flex items-center rounded-xl border border-emerald-500/40 bg-emerald-950/20 px-3 py-2 text-xs font-bold text-emerald-300">
                  {currency} {netPayable}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Final Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Game summary or table condition"
                className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Bottom Actions: Void Request vs Finalize */}
            <div className="flex items-center justify-between pt-3 border-t border-[#163022]">
              <button
                type="button"
                onClick={() => {
                  if (onRequestVoid && currentGame) {
                    onRequestVoid(currentGame);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-xs font-semibold text-rose-300 hover:border-rose-700 hover:bg-rose-950/40 transition-all"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Request Void</span>
              </button>

              <div className="flex items-center gap-2">
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
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-gray-950 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{loading ? "Finalizing..." : "End Game"}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
