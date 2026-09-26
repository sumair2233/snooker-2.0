"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerBill } from "@/types";
import { CheckoutBillModal } from "@/components/modals/CheckoutBillModal";
import {
  Receipt,
  Search,
  CheckCircle2,
  AlertCircle,
  Phone,
  Coins,
  Coffee,
  HandCoins,
  FileSpreadsheet,
  Check,
  Edit2,
} from "lucide-react";
import { exportToExcel } from "@/lib/export";

export default function PlayerBillsPage() {
  const [bills, setBills] = useState<PlayerBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected bill for checkout modal
  const [selectedBill, setSelectedBill] = useState<PlayerBill | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Inline phone editing state
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState("");

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/bills?status=${statusFilter}&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setBills(data);
      }
    } catch (err) {
      console.error("Fetch bills error:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handlePhoneSave = async (billId: string) => {
    try {
      const res = await fetch(`/api/bills/${billId}/phone`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneInput.trim() }),
      });
      if (res.ok) {
        setBills((prev) =>
          prev.map((b) => (b.id === billId ? { ...b, phone: phoneInput.trim() } : b))
        );
      }
    } catch (err) {
      console.error("Error saving phone:", err);
    } finally {
      setEditingPhoneId(null);
      setPhoneInput("");
    }
  };

  // KPI calculations
  const totalBillsCount = bills.length;
  let gamePendingTotal = 0;
  let cafePendingTotal = 0;
  let totalBalance = 0;

  for (const b of bills) {
    if (b.status === "pending") {
      gamePendingTotal += b.game_amount;
      cafePendingTotal += b.cafe_amount;
      totalBalance += b.balance;
    }
  }

  const handleExport = () => {
    const exportRows = bills.map((b) => ({
      Date: b.last_activity.split("T")[0],
      Player: b.player_name,
      Phone: b.phone || "N/A",
      GamesPlayed: b.game_ids.length,
      GameAmount: b.game_amount,
      CafeAmount: b.cafe_amount,
      Discount: b.discount,
      Paid: b.paid,
      LoanConverted: b.loan,
      Balance: b.balance,
      Status: b.status.toUpperCase(),
    }));

    exportToExcel(exportRows, `Player_Bills_${new Date().toISOString().split("T")[0]}`, "Bills");
  };

  return (
    <AppShell title="Player Billing & Ledgers">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-emerald-400">🧾</span> Player Accounts Ledger
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Running tabs, game charges, café orders, and checkout settlement
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-xl border border-emerald-600/40 bg-emerald-950/40 hover:bg-emerald-900/50 px-4 py-2 text-xs font-semibold text-emerald-300 transition-all shadow"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-amber-500/30 bg-[#0e2117] p-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Bills Found</span>
            <Receipt className="h-4 w-4 text-amber-400" />
          </div>
          <span className="text-xl font-bold text-white">{totalBillsCount}</span>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-[#0e2117] p-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Game Pending</span>
            <Coins className="h-4 w-4 text-amber-400" />
          </div>
          <span className="text-xl font-bold text-amber-300">
            Rs. {gamePendingTotal}
          </span>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-[#0c2419] p-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Café Pending</span>
            <Coffee className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-xl font-bold text-emerald-300">
            Rs. {cafePendingTotal}
          </span>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-[#220d12] p-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Total Outstanding</span>
            <HandCoins className="h-4 w-4 text-rose-400" />
          </div>
          <span className="text-xl font-black text-rose-400">
            Rs. {totalBalance}
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-xl">
        {/* Filters Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search player or phone..."
              className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] pl-8 pr-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Bill Statuses</option>
            <option value="pending">Pending Unpaid Only</option>
            <option value="cleared">Cleared / Settled Only</option>
          </select>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-xl border border-emerald-950">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#091510] text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-emerald-950">
              <tr>
                <th className="py-3 px-3">Last Active</th>
                <th className="py-3 px-3">Player Name</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3">Frames</th>
                <th className="py-3 px-3">Game Rs.</th>
                <th className="py-3 px-3">Café Rs.</th>
                <th className="py-3 px-3">Discount</th>
                <th className="py-3 px-3">Paid</th>
                <th className="py-3 px-3">Loan Converted</th>
                <th className="py-3 px-3">Balance Due</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/60 bg-[#07130e]">
              {bills.length > 0 ? (
                bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-[#0c1f15] transition-colors">
                    <td className="py-3 px-3 font-mono text-gray-400">
                      {bill.last_activity.split("T")[0]}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      {bill.player_name}
                    </td>
                    <td className="py-3 px-3">
                      {editingPhoneId === bill.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            placeholder="+92 300..."
                            className="w-28 rounded border border-amber-500 bg-[#091510] px-1.5 py-0.5 text-xs text-white"
                          />
                          <button
                            onClick={() => handlePhoneSave(bill.id)}
                            className="rounded bg-emerald-600 p-1 text-white hover:bg-emerald-500"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        </div>
                      ) : bill.phone ? (
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <span>{bill.phone}</span>
                          <button
                            onClick={() => {
                              setEditingPhoneId(bill.id);
                              setPhoneInput(bill.phone);
                            }}
                            className="text-gray-500 hover:text-amber-400"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingPhoneId(bill.id);
                            setPhoneInput("");
                          }}
                          className="text-[11px] text-amber-400 hover:underline"
                        >
                          + Add phone
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-300">
                      {bill.game_ids.length}
                    </td>
                    <td className="py-3 px-3 font-semibold text-gray-200">
                      Rs. {bill.game_amount}
                    </td>
                    <td className="py-3 px-3 font-semibold text-emerald-300">
                      Rs. {bill.cafe_amount}
                    </td>
                    <td className="py-3 px-3 text-gray-400">
                      {bill.discount > 0 ? `Rs. ${bill.discount}` : "-"}
                    </td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">
                      Rs. {bill.paid}
                    </td>
                    <td className="py-3 px-3">
                      {bill.loan > 0 ? (
                        <span className="rounded bg-amber-950 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-800">
                          Rs. {bill.loan}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-black text-sm">
                      <span
                        className={
                          bill.balance > 0 ? "text-rose-400" : "text-emerald-400"
                        }
                      >
                        Rs. {bill.balance}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          bill.status === "cleared"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : "bg-rose-950 text-rose-300 border border-rose-800"
                        }`}
                      >
                        {bill.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {bill.balance > 0 ? (
                        <button
                          onClick={() => {
                            setSelectedBill(bill);
                            setIsCheckoutOpen(true);
                          }}
                          className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 px-3 py-1 text-xs font-bold text-white shadow transition-all"
                        >
                          Checkout
                        </button>
                      ) : (
                        <span className="text-[11px] font-medium text-emerald-400 flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Cleared</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={12}
                    className="py-8 text-center text-xs text-gray-500 italic"
                  >
                    No player bills found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CheckoutBillModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setSelectedBill(null);
        }}
        bill={selectedBill}
        onSuccess={fetchBills}
      />
    </AppShell>
  );
}
