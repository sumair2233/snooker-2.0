"use client";

import React, { useState } from "react";
import { Lock, Unlock, ShieldAlert } from "lucide-react";
import { useSession } from "next-auth/react";

interface LockModalProps {
  isOpen: boolean;
  onUnlock: () => void;
}

export function LockModal({ isOpen, onUnlock }: LockModalProps) {
  const { data: session } = useSession();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin.trim()) {
      setError("Please enter your PIN");
      return;
    }

    // Verify PIN against common defaults or any 4 digit
    // Demo admin: 1234, employee: 7860, or any valid unlock
    const userRole = session?.user?.role;
    if (
      (userRole === "admin" && (pin === "1234" || pin.length >= 4)) ||
      (userRole === "employee" && (pin === "7860" || pin === "1234" || pin.length >= 4))
    ) {
      setPin("");
      setError("");
      onUnlock();
    } else {
      setError("Incorrect PIN. Default: 1234 (Admin) or 7860 (Staff)");
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError("");
      if (nextPin.length === 4) {
        // Quick auto-attempt on 4 digits
        if (
          nextPin === "1234" ||
          nextPin === "7860"
        ) {
          setTimeout(() => {
            setPin("");
            setError("");
            onUnlock();
          }, 150);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4">
      <div className="w-full max-w-sm rounded-2xl border border-amber-500/40 bg-gradient-to-b from-[#0e2117] to-[#07110c] p-6 shadow-2xl text-center">
        {/* Lock Icon & Branding */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-4 shadow-inner">
          <Lock className="h-8 w-8" />
        </div>

        <h2 className="text-xl font-bold tracking-tight text-white">
          Terminal Locked
        </h2>
        <p className="text-xs text-emerald-400/80 mt-1">
          {session?.user?.name || "Active Session"} • <span className="uppercase text-amber-400 font-semibold">{session?.user?.role || "Staff"}</span>
        </p>

        <p className="text-xs text-gray-400 mt-2 mb-4">
          Enter PIN to unlock your station
        </p>

        {/* PIN Dots */}
        <div className="flex justify-center gap-3 my-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-4 w-4 rounded-full border transition-all ${
                pin.length > idx
                  ? "bg-amber-400 border-amber-400 scale-110 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                  : "border-gray-600 bg-gray-900/50"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-lg py-1 px-2 mb-3">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-12 rounded-xl border border-emerald-900/40 bg-[#102319] hover:bg-[#183526] active:scale-95 text-lg font-semibold text-gray-200 transition-all flex items-center justify-center shadow"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin("")}
            className="h-12 rounded-xl border border-gray-800 bg-[#0c1812] hover:bg-[#14261d] text-xs font-medium text-gray-400 transition-all flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="h-12 rounded-xl border border-emerald-900/40 bg-[#102319] hover:bg-[#183526] active:scale-95 text-lg font-semibold text-gray-200 transition-all flex items-center justify-center shadow"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-xl border border-gray-800 bg-[#0c1812] hover:bg-[#14261d] text-xs font-medium text-gray-400 transition-all flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleUnlock()}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-2.5 text-sm font-semibold text-gray-950 shadow-lg shadow-amber-500/20 transition-all"
        >
          <Unlock className="h-4 w-4" />
          Unlock Terminal
        </button>

        <p className="text-[11px] text-gray-500 mt-3">
          Tip: Demo Admin PIN is <code className="text-amber-300">1234</code>, Staff is <code className="text-emerald-300">7860</code>
        </p>
      </div>
    </div>
  );
}
