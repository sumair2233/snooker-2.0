"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AuditLog } from "@/types";
import { History, Search, Filter, Shield, Activity, User } from "lucide-react";
import { useSession } from "next-auth/react";

export default function AuditLogPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/audit-logs?search=${encodeURIComponent(search)}&action=${actionFilter}`);
      if (res.ok) setLogs(await res.json());
    } catch (err) {
      console.error("Audit fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <AppShell title="System Audit Trail">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span className="text-amber-400">📜</span> System Audit & Operation Trail
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Chronological, tamper-evident log of all game, bill checkout, loan, café, and employee operations
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-xl">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actor, action, or details..."
              className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] pl-8 pr-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Action Types</option>
            <option value="game_start">Game Started</option>
            <option value="game_end">Game Ended & Settle</option>
            <option value="bill_checkout">Player Bill Checkout</option>
            <option value="loan_added">Loan Issued</option>
            <option value="loan_repayment">Loan Repayment</option>
            <option value="cafe_order_created">Café Order Created</option>
            <option value="inventory_restock">Inventory Restock</option>
            <option value="void_requested">Void Requested</option>
            <option value="void_approved">Void Approved</option>
            <option value="cash_collect">Cash Drawer Collect</option>
            <option value="expense_added">Expense Logged</option>
          </select>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto rounded-xl border border-emerald-950">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#091510] text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-emerald-950">
              <tr>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Actor</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Entity</th>
                <th className="py-3 px-3">Details & Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/60 bg-[#07130e]">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#0c1f15] transition-colors">
                    <td className="py-3 px-3 font-mono text-gray-400 whitespace-nowrap">
                      <div>{log.timestamp.split("T")[0]}</div>
                      <div className="text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                      {log.actor_name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded bg-emerald-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 border border-emerald-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 uppercase text-[10px] font-semibold text-gray-400">
                      {log.entity}
                    </td>
                    <td className="py-3 px-3 text-gray-200">
                      {log.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-gray-500 italic">
                    No audit records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
