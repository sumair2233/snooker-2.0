"use client";

import React, { useState, useEffect } from "react";
import { PlayerBill } from "@/types";
import { X, Receipt, CheckCircle2, HandCoins, DollarSign } from "lucide-react";
import { useSession } from "next-auth/react";
import confetti from "canvas-confetti";

interface CheckoutBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: PlayerBill | null;
  onSuccess: () => void;
  currency?: string;
}

export function CheckoutBillModal({
  isOpen,
  onClose,
  bill,
  onSuccess,
  currency = "Rs.",
}: CheckoutBillModalProps) {
  const { data: session } = useSession();
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online" | "split">("cash");
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [onlineAmount, setOnlineAmount] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [convertToLoan, setConvertToLoan] = useState<boolean>(false);
  const [loanReason, setLoanReason] = useState<string>("Checkout converted to loan");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (bill) {
      setPaidAmount(bill.balance);
      setCashAmount(bill.balance);
      setOnlineAmount(0);
      setDiscount(0);
      setConvertToLoan(false);
      setLoanReason(`Tab balance converted to loan for ${bill.player_name}`);
    }
  }, [bill]);

  if (!isOpen || !bill) return null;

  const currentBalance = bill.balance;
  const remainingAfterPayment = Math.max(0, currentBalance - paidAmount - discount);

  const handlePaymentMethodChange = (m: "cash" | "online" | "split") => {
    setPaymentMethod(m);
    if (m === "cash") {
      setCashAmount(paidAmount);
      setOnlineAmount(0);
    } else if (m === "online") {
      setCashAmount(0);
      setOnlineAmount(paidAmount);
    } else if (m === "split") {
      setCashAmount(Math.floor(paidAmount / 2));
      setOnlineAmount(Math.ceil(paidAmount / 2));
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/bills/${bill.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidAmount: Number(paidAmount),
          paymentMethod,
          cashAmount: Number(cashAmount),
          onlineAmount: Number(onlineAmount),
          discount: Number(discount),
          convertToLoan,
          loanReason,
          employee_id: session?.user?.id || "usr-emp-1",
          employee_name: session?.user?.name || "Club Staff",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Checkout failed");
      }

      if (remainingAfterPayment === 0 || convertToLoan) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 },
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error during checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-emerald-700/60 bg-[#0a1811] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#163022] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Settle Player Bill</h2>
              <p className="text-xs text-gray-400">
                Record payment, apply discount, or transfer balance to Loan
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

        <form onSubmit={handleCheckout} className="mt-4 space-y-4">
          {/* Bill summary card */}
          <div className="rounded-xl border border-emerald-900/60 bg-[#0d2116] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base font-extrabold text-white">
                  {bill.player_name}
                </span>
                <span className="text-xs text-gray-400 block">
                  {bill.phone || "No phone added"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                  Current Balance
                </span>
                <span className="text-xl font-black text-rose-400">
                  {currency} {bill.balance}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-emerald-950/80 pt-2 text-xs">
              <div className="rounded-lg bg-[#07130e] p-2">
                <span className="text-gray-400 text-[10px] block">Games</span>
                <span className="font-bold text-gray-200">{currency} {bill.game_amount}</span>
              </div>
              <div className="rounded-lg bg-[#07130e] p-2">
                <span className="text-gray-400 text-[10px] block">Café Tab</span>
                <span className="font-bold text-gray-200">{currency} {bill.cafe_amount}</span>
              </div>
              <div className="rounded-lg bg-[#07130e] p-2">
                <span className="text-gray-400 text-[10px] block">Already Paid</span>
                <span className="font-bold text-emerald-400">{currency} {bill.paid}</span>
              </div>
            </div>
          </div>

          {/* Payment Amount & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Paying Now ({currency})
              </label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setPaidAmount(val);
                  if (paymentMethod === "cash") setCashAmount(val);
                  if (paymentMethod === "online") setOnlineAmount(val);
                }}
                className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-sm font-bold text-emerald-300 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Discount ({currency})
              </label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Payment Method selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "cash", label: "Cash" },
                  { id: "online", label: "Online (Jazz/Easy/Bank)" },
                  { id: "split", label: "Cash + Online Split" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handlePaymentMethodChange(m.id)}
                  className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                    paymentMethod === m.id
                      ? "border-amber-500 bg-amber-950/40 text-amber-300 shadow-sm"
                      : "border-emerald-950 bg-[#0d1e15] text-gray-400 hover:border-emerald-800"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === "split" && (
            <div className="grid grid-cols-2 gap-3">
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
            </div>
          )}

          {/* Loan Conversion Option */}
          {remainingAfterPayment > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5 space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={convertToLoan}
                  onChange={(e) => setConvertToLoan(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <HandCoins className="h-4 w-4 text-amber-400" />
                  Convert Remaining {currency} {remainingAfterPayment} into a Loan Record
                </span>
              </label>

              {convertToLoan && (
                <div>
                  <label className="block text-[11px] text-gray-300 mb-1">
                    Loan Reason / Notes
                  </label>
                  <input
                    type="text"
                    value={loanReason}
                    onChange={(e) => setLoanReason(e.target.value)}
                    className="w-full rounded-xl border border-amber-600/50 bg-[#0d1f16] px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <p className="text-[10px] text-amber-400/80 mt-1">
                    This bill will be marked Cleared, and an active loan of {currency} {remainingAfterPayment} will be added under {bill.player_name}.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-[#163022]">
            <div className="text-xs">
              <span className="text-gray-400">Remaining Balance: </span>
              <strong className={remainingAfterPayment === 0 || convertToLoan ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {convertToLoan ? "Rs. 0 (Converted to Loan)" : `${currency} ${remainingAfterPayment}`}
              </strong>
            </div>

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
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-950 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{loading ? "Processing..." : "Confirm Checkout"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
