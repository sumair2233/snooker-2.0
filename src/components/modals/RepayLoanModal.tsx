"use client";

import React, { useState } from "react";
import { Loan } from "@/types";
import { X, CheckCircle2, DollarSign } from "lucide-react";
import { useSession } from "next-auth/react";

interface RepayLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  onSuccess: () => void;
  currency?: string;
}

export function RepayLoanModal({
  isOpen,
  onClose,
  loan,
  onSuccess,
  currency = "Rs.",
}: RepayLoanModalProps) {
  const { data: session } = useSession();
  const [repayAmount, setRepayAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (loan) {
      setRepayAmount(loan.remaining);
    }
  }, [loan]);

  if (!isOpen || !loan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayAmount || repayAmount <= 0) {
      setError("Please enter a valid repayment amount");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/loans/${loan.id}/repay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(repayAmount),
          actor_id: session?.user?.id || "usr-emp-1",
          actor_name: session?.user?.name || "Club Staff",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record loan repayment");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error processing repayment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-2xl border border-emerald-500/40 bg-[#0a1811] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#163022] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Loan Recovery</h2>
              <p className="text-xs text-gray-400">
                Record partial or full recovery
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
          <div className="rounded-xl border border-emerald-900/40 bg-[#0d2116] p-3 text-xs text-gray-300 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white">{loan.customer_name}</span>
              <span className="rounded bg-rose-950 px-2 py-0.5 font-bold text-rose-300 text-[10px] border border-rose-800/40">
                Remaining: {currency} {loan.remaining}
              </span>
            </div>
            <p className="text-gray-400">
              Total Loaned: {currency} {loan.amount} • Recovered: {currency} {loan.paid}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Repayment Amount ({currency}) *
            </label>
            <input
              type="number"
              required
              min={1}
              max={loan.remaining}
              value={repayAmount}
              onChange={(e) => setRepayAmount(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-sm font-bold text-emerald-300 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#163022]">
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
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{loading ? "Saving..." : "Record Recovery"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
