"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Loan } from "@/types";
import { AddLoanModal } from "@/components/modals/AddLoanModal";
import { RepayLoanModal } from "@/components/modals/RepayLoanModal";
import {
  HandCoins,
  Search,
  FileSpreadsheet,
  Plus,
  Coins,
  CheckCircle2,
  AlertCircle,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { exportToExcel } from "@/lib/export";
import { useSession } from "next-auth/react";

export default function LoansPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRepayOpen, setIsRepayOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const fetchLoans = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (search) params.append("search", search);
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);

      const res = await fetch(`/api/loans?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLoans(data);
      }
    } catch (err) {
      console.error("Loans fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, fromDate, toDate]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const handleDelete = async (loanId: string) => {
    if (!confirm("Are you sure you want to delete this loan record? This action will be logged in the audit trail.")) {
      return;
    }

    try {
      const res = await fetch(`/api/loans/${loanId}?actorId=${session?.user?.id}&actorName=${session?.user?.name}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchLoans();
      }
    } catch (err) {
      console.error("Delete loan error:", err);
    }
  };

  // Metrics
  let totalLoaned = 0;
  let totalRecovered = 0;
  let totalOutstanding = 0;
  let openLoansCount = 0;

  for (const l of loans) {
    totalLoaned += l.amount;
    totalRecovered += l.paid;
    totalOutstanding += l.remaining;
    if (l.remaining > 0) openLoansCount++;
  }

  // Outstanding per person rollup
  const outstandingPerPerson: Record<string, { phone: string; remaining: number; count: number }> = {};
  for (const l of loans) {
    if (l.remaining > 0) {
      if (!outstandingPerPerson[l.customer_name]) {
        outstandingPerPerson[l.customer_name] = {
          phone: l.phone,
          remaining: 0,
          count: 0,
        };
      }
      outstandingPerPerson[l.customer_name].remaining += l.remaining;
      outstandingPerPerson[l.customer_name].count += 1;
    }
  }

  const handleExport = () => {
    const rows = loans.map((l) => ({
      Date: l.date,
      Customer: l.customer_name,
      Phone: l.phone || "N/A",
      TotalLoaned: l.amount,
      Recovered: l.paid,
      RemainingDue: l.remaining,
      Reason: l.reason,
      Status: l.status.toUpperCase(),
      RecordedBy: l.employee_name,
    }));

    exportToExcel(rows, `Loans_Registry_${new Date().toISOString().split("T")[0]}`, "Loans");
  };

  return (
    <AppShell title="Customer Loans & Credit Management">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-amber-400">🤝</span> Credit & Loan Ledger
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Track customer credit, tab conversions, recoveries, and outstanding balances
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-600/40 bg-emerald-950/40 hover:bg-emerald-900/50 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition-all shadow"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-950 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Add Loan Record</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-amber-500/30 bg-[#0e2117] p-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Total Loaned</span>
            <Coins className="h-4 w-4 text-amber-400" />
          </div>
          <span className="text-xl font-bold text-white">Rs. {totalLoaned}</span>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-[#0c2419] p-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Recovered</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-xl font-bold text-emerald-300">
            Rs. {totalRecovered}
          </span>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-[#220d12] p-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Outstanding</span>
            <AlertCircle className="h-4 w-4 text-rose-400" />
          </div>
          <span className="text-xl font-black text-rose-400">
            Rs. {totalOutstanding}
          </span>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-[#16271c] p-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Open Borrowers</span>
            <HandCoins className="h-4 w-4 text-amber-400" />
          </div>
          <span className="text-xl font-bold text-amber-300">
            {openLoansCount} Accounts
          </span>
        </div>
      </div>

      {/* Outstanding Per Person Panel */}
      <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-lg mb-6">
        <div className="flex items-center justify-between border-b border-[#163022] pb-3 mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <span>📌 Outstanding Per Person</span>
          </h2>
          <span className="text-xs text-rose-400 font-semibold">
            {Object.keys(outstandingPerPerson).length} Customers with active dues
          </span>
        </div>

        {Object.keys(outstandingPerPerson).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(outstandingPerPerson).map(([person, info]) => (
              <div
                key={person}
                className="flex items-center justify-between rounded-xl border border-rose-900/40 bg-[#140f11] p-3 text-xs"
              >
                <div>
                  <span className="font-bold text-white block">{person}</span>
                  <span className="text-[10px] text-gray-400 block">
                    {info.phone || "No phone"} • {info.count} loans
                  </span>
                </div>
                <span className="text-sm font-black text-rose-400">
                  Rs. {info.remaining}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 p-3 rounded-xl border border-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            <span>No outstanding loans! All member and customer loans are fully settled.</span>
          </div>
        )}
      </div>

      {/* Loan Records Table */}
      <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-xl">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer or phone..."
              className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] pl-8 pr-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Loan Statuses</option>
            <option value="outstanding">Outstanding (Unpaid)</option>
            <option value="partial">Partially Recovered</option>
            <option value="paid">Fully Settled</option>
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none [color-scheme:dark]"
            placeholder="From Date"
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none [color-scheme:dark]"
            placeholder="To Date"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-emerald-950">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#091510] text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-emerald-950">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3">Total Loaned</th>
                <th className="py-3 px-3">Paid</th>
                <th className="py-3 px-3">Remaining Due</th>
                <th className="py-3 px-3">Reason</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Recorded By</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/60 bg-[#07130e]">
              {loans.length > 0 ? (
                loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-[#0c1f15] transition-colors">
                    <td className="py-3 px-3 font-mono text-gray-400">
                      {loan.date}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      {loan.customer_name}
                    </td>
                    <td className="py-3 px-3 text-gray-400">
                      {loan.phone || "-"}
                    </td>
                    <td className="py-3 px-3 font-semibold text-gray-200">
                      Rs. {loan.amount}
                    </td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">
                      Rs. {loan.paid}
                    </td>
                    <td className="py-3 px-3 font-black text-sm">
                      <span
                        className={
                          loan.remaining > 0 ? "text-rose-400" : "text-emerald-400"
                        }
                      >
                        Rs. {loan.remaining}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-300 max-w-xs truncate">
                      {loan.reason}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          loan.status === "paid"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : loan.status === "partial"
                            ? "bg-amber-950 text-amber-300 border border-amber-800"
                            : "bg-rose-950 text-rose-300 border border-rose-800"
                        }`}
                      >
                        {loan.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-400">
                      {loan.employee_name}
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      {loan.remaining > 0 && (
                        <button
                          onClick={() => {
                            setSelectedLoan(loan);
                            setIsRepayOpen(true);
                          }}
                          className="rounded-lg bg-emerald-700 hover:bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-all shadow"
                        >
                          Repay
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(loan.id)}
                          title="Delete Loan (Admin Only)"
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
                  <td
                    colSpan={10}
                    className="py-8 text-center text-xs text-gray-500 italic"
                  >
                    No loan records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddLoanModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={fetchLoans}
      />

      <RepayLoanModal
        isOpen={isRepayOpen}
        onClose={() => {
          setIsRepayOpen(false);
          setSelectedLoan(null);
        }}
        loan={selectedLoan}
        onSuccess={fetchLoans}
      />
    </AppShell>
  );
}
