"use client";

import React, { useState } from "react";
import { Game } from "@/types";
import { X, ShieldAlert, AlertTriangle } from "lucide-react";
import { useSession } from "next-auth/react";

interface VoidRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game | null;
  onSuccess: () => void;
}

export function VoidRequestModal({
  isOpen,
  onClose,
  game,
  onSuccess,
}: VoidRequestModalProps) {
  const { data: session } = useSession();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !game) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please specify the reason for this void request");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/void-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: game.id,
          table_name: game.table_name,
          amount: game.amount,
          reason: reason.trim(),
          requested_by_id: session?.user?.id || "usr-emp-1",
          requested_by_name: session?.user?.name || "Club Staff",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit void request");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error submitting request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl border border-rose-600/40 bg-[#0a1811] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#163022] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-950 border border-rose-800 text-rose-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Request Game Void</h2>
              <p className="text-xs text-gray-400">
                Submit cancellation to Admin approval queue
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-3 text-xs text-gray-300 space-y-1">
            <div className="flex justify-between">
              <span className="font-semibold text-white">{game.table_name}</span>
              <span className="text-rose-400 font-bold">Rs. {game.amount}</span>
            </div>
            <p className="text-gray-400">
              Players: <strong className="text-gray-200">{game.players.join(" vs ")}</strong>
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-amber-950/30 border border-amber-800/30 p-2.5 text-[11px] text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <span>
              All void requests are audited. Once approved by an Admin, the game record is cancelled and any linked ledger bill balance is reversed.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Reason for Void Request *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Player chalked wrong ball / game aborted after 2 minutes by mutual consent..."
              className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] p-3 text-xs text-white focus:border-rose-500 focus:outline-none"
            />
          </div>

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
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all disabled:opacity-50"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>{loading ? "Submitting..." : "Submit to Admin"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
