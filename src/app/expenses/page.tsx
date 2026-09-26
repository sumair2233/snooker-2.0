"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Expense, ExpenseCategory, RevenueEntry } from "@/types";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Plus,
  Trash2,
  Calendar,
  Tag,
  Search,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { useSession } from "next-auth/react";

export default function ExpensesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const todayStr = new Date().toISOString().split("T")[0];

  const [activeTab, setActiveTab] = useState<"expenses" | "revenue">("expenses");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenue, setRevenue] = useState<RevenueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Add Expense Form State
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expCategory, setExpCategory] = useState<ExpenseCategory>("Misc");
  const [expAmount, setExpAmount] = useState<number | "">("");
  const [expNote, setExpNote] = useState("");
  const [expDate, setExpDate] = useState(todayStr);

  // Add Revenue Form State
  const [isAddRevenueOpen, setIsAddRevenueOpen] = useState(false);
  const [revCategory, setRevCategory] = useState<"Tournament Fee" | "Cue Locker Rent" | "Membership" | "Misc Revenue">("Tournament Fee");
  const [revAmount, setRevAmount] = useState<number | "">("");
  const [revPaymentMethod, setRevPaymentMethod] = useState<"cash" | "online">("cash");
  const [revNote, setRevNote] = useState("");
  const [revDate, setRevDate] = useState(todayStr);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [expRes, revRes] = await Promise.all([
        fetch(`/api/expenses?category=${categoryFilter}&fromDate=${fromDate}&toDate=${toDate}`),
        fetch("/api/revenue"),
      ]);

      if (expRes.ok) setExpenses(await expRes.json());
      if (revRes.ok) setRevenue(await revRes.json());
    } catch (err) {
      console.error("Expenses fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || Number(expAmount) <= 0) return;

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: expCategory,
          amount: Number(expAmount),
          note: expNote,
          date: expDate,
          employee_id: session?.user?.id || "usr-emp-1",
          employee_name: session?.user?.name || "Club Staff",
        }),
      });
      if (res.ok) {
        setIsAddExpenseOpen(false);
        setExpAmount("");
        setExpNote("");
        fetchData();
      }
    } catch (err) {
      console.error("Add expense error:", err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    try {
      const res = await fetch(`/api/expenses/${id}?actorId=${session?.user?.id}&actorName=${session?.user?.name}`, {
        method: "DELETE",
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Delete expense error:", err);
    }
  };

  const handleAddRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revAmount || Number(revAmount) <= 0) return;

    try {
      const res = await fetch("/api/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: revCategory,
          amount: Number(revAmount),
          payment_method: revPaymentMethod,
          note: revNote,
          date: revDate,
          employee_id: session?.user?.id || "usr-admin-1",
          employee_name: session?.user?.name || "Club Manager",
        }),
      });
      if (res.ok) {
        setIsAddRevenueOpen(false);
        setRevAmount("");
        setRevNote("");
        fetchData();
      }
    } catch (err) {
      console.error("Add revenue error:", err);
    }
  };

  // Rollup totals
  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalRevenueAmount = revenue.reduce((sum, r) => sum + r.amount, 0);

  return (
    <AppShell title="Expenses & Extra Revenue Ledger">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-rose-400">💸</span> Operational Ledger
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Club utility expenses, maintenance, salaries, tournaments & cue locker revenue
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-rose-950 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Log Expense</span>
          </button>

          <button
            onClick={() => setIsAddRevenueOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-950 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Add Extra Revenue</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#163022] pb-2">
        <button
          onClick={() => setActiveTab("expenses")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "expenses"
              ? "bg-rose-950 text-rose-300 border border-rose-800"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <TrendingDown className="h-4 w-4 text-rose-400" />
          <span>Expenses Ledger (Rs. {totalExpenseAmount})</span>
        </button>

        <button
          onClick={() => setActiveTab("revenue")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "revenue"
              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <span>Non-Game Revenue (Rs. {totalRevenueAmount})</span>
        </button>
      </div>

      {/* =========================================================
          TAB 1: EXPENSES
         ========================================================= */}
      {activeTab === "expenses" && (
        <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-xl">
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="all">All Expense Categories</option>
              <option value="Electricity">Electricity & Generator</option>
              <option value="Rent">Rent & Property</option>
              <option value="Maintenance & Cloth">Maintenance, Cloth & Chalk</option>
              <option value="Staff Food">Staff Food & Refreshments</option>
              <option value="Salaries">Staff Salaries</option>
              <option value="Misc">Miscellaneous Supplies</option>
            </select>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none [color-scheme:dark]"
            />

            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none [color-scheme:dark]"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-emerald-950">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#091510] text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-emerald-950">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Description / Note</th>
                  <th className="py-3 px-3">Logged By</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/60 bg-[#07130e]">
                {expenses.length > 0 ? (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#0c1f15] transition-colors">
                      <td className="py-3 px-3 font-mono text-gray-400">{exp.date}</td>
                      <td className="py-3 px-3 font-bold text-amber-300">
                        {exp.category}
                      </td>
                      <td className="py-3 px-3 font-black text-rose-400 text-sm">
                        Rs. {exp.amount}
                      </td>
                      <td className="py-3 px-3 text-gray-200">{exp.note}</td>
                      <td className="py-3 px-3 text-gray-400">{exp.employee_name}</td>
                      <td className="py-3 px-3 text-right">
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            title="Delete Expense (Admin Only)"
                            className="rounded-lg border border-rose-900/60 bg-rose-950/30 hover:bg-rose-900/50 p-1 text-rose-300 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-gray-500 italic">
                      No expense entries logged for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: NON-GAME REVENUE
         ========================================================= */}
      {activeTab === "revenue" && (
        <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-xl">
          <div className="overflow-x-auto rounded-xl border border-emerald-950">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#091510] text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-emerald-950">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Revenue Category</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Payment Method</th>
                  <th className="py-3 px-3">Remarks / Description</th>
                  <th className="py-3 px-3">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/60 bg-[#07130e]">
                {revenue.length > 0 ? (
                  revenue.map((rev) => (
                    <tr key={rev.id} className="hover:bg-[#0c1f15] transition-colors">
                      <td className="py-3 px-3 font-mono text-gray-400">{rev.date}</td>
                      <td className="py-3 px-3 font-bold text-emerald-300">
                        {rev.category}
                      </td>
                      <td className="py-3 px-3 font-black text-amber-300 text-sm">
                        Rs. {rev.amount}
                      </td>
                      <td className="py-3 px-3 capitalize">
                        <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
                          {rev.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-200">{rev.note}</td>
                      <td className="py-3 px-3 text-gray-400">{rev.employee_name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-gray-500 italic">
                      No extra revenue entries recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#0a1811] p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1">Log Daily Expense</h2>
            <p className="text-xs text-gray-400 mb-4">
              Enter operational costs, maintenance, or staff expenses
            </p>

            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Category
                </label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="Electricity">Electricity & Generator</option>
                  <option value="Rent">Rent & Property</option>
                  <option value="Maintenance & Cloth">Maintenance & Cloth</option>
                  <option value="Staff Food">Staff Food & Refreshments</option>
                  <option value="Salaries">Salaries</option>
                  <option value="Misc">Misc Supplies</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Amount (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={expAmount}
                  onChange={(e) => setExpAmount(Number(e.target.value) || "")}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-sm font-bold text-rose-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Description / Note *
                </label>
                <textarea
                  required
                  rows={2}
                  value={expNote}
                  onChange={(e) => setExpNote(e.target.value)}
                  placeholder="e.g. 2 packs Triangle chalk, cloth iron service..."
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#163022]">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="rounded-xl border border-gray-800 bg-[#0c1812] px-4 py-2 text-xs text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-2 text-xs font-bold text-white shadow"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Revenue Modal */}
      {isAddRevenueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/40 bg-[#0a1811] p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1">Record Extra Revenue</h2>
            <p className="text-xs text-gray-400 mb-4">
              Add income outside standard game frames and café orders
            </p>

            <form onSubmit={handleAddRevenue} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Revenue Category
                </label>
                <select
                  value={revCategory}
                  onChange={(e) => setRevCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="Tournament Fee">Tournament Fee</option>
                  <option value="Cue Locker Rent">Cue Locker Rent</option>
                  <option value="Membership">Club Membership</option>
                  <option value="Misc Revenue">Misc Revenue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Amount (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={revAmount}
                  onChange={(e) => setRevAmount(Number(e.target.value) || "")}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-sm font-bold text-emerald-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Payment Method
                </label>
                <select
                  value={revPaymentMethod}
                  onChange={(e) => setRevPaymentMethod(e.target.value as "cash" | "online")}
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Remarks / Note
                </label>
                <input
                  type="text"
                  value={revNote}
                  onChange={(e) => setRevNote(e.target.value)}
                  placeholder="e.g. Locker #12 advance, player registration slot..."
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#163022]">
                <button
                  type="button"
                  onClick={() => setIsAddRevenueOpen(false)}
                  className="rounded-xl border border-gray-800 bg-[#0c1812] px-4 py-2 text-xs text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-2 text-xs font-bold text-white shadow"
                >
                  Save Revenue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
