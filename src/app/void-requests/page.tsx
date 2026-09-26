"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { VoidRequest } from "@/types";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileCheck,
} from "lucide-react";
import { useSession } from "next-auth/react";

export default function VoidRequestsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [requests, setRequests] = useState<VoidRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<VoidRequest | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchVoidRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/void-requests");
      if (res.ok) setRequests(await res.json());
    } catch (err) {
      console.error("Void requests fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVoidRequests();
  }, [fetchVoidRequests]);

  const openReviewModal = (req: VoidRequest, dec: "approved" | "rejected") => {
    setSelectedReq(req);
    setDecision(dec);
    setAdminNotes(dec === "approved" ? "Approved per staff verification" : "Rejected — frame played normally");
    setReviewModalOpen(true);
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/void-requests/${selectedReq.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          adminNotes,
          reviewer_id: session?.user?.id || "usr-admin-1",
          reviewer_name: session?.user?.name || "Club Manager",
          reviewer_role: session?.user?.role,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resolve request");
      }

      setReviewModalOpen(false);
      setSelectedReq(null);
      fetchVoidRequests();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error resolving request");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <AppShell title="Void Requests Queue">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="text-rose-400">🛡️</span> Void & Cancellation Approval Queue
            </h1>
            {pendingCount > 0 && (
              <span className="rounded-full bg-rose-950 px-2.5 py-0.5 text-xs font-bold text-rose-300 border border-rose-800">
                {pendingCount} Pending Approval
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Audited cancellations submitted by employees. Approved requests reverse ledger and game revenue impact.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-xl">
        <div className="overflow-x-auto rounded-xl border border-emerald-950">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#091510] text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-emerald-950">
              <tr>
                <th className="py-3 px-3">Date / Time</th>
                <th className="py-3 px-3">Table</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Submitted By</th>
                <th className="py-3 px-3">Reason For Void</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Review Details</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/60 bg-[#07130e]">
              {requests.length > 0 ? (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#0c1f15] transition-colors">
                    <td className="py-3 px-3 font-mono text-gray-400">
                      <div>{req.created_at.split("T")[0]}</div>
                      <div className="text-[10px]">
                        {new Date(req.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      {req.table_name.split(" — ")[0]}
                    </td>
                    <td className="py-3 px-3 font-bold text-rose-400">
                      Rs. {req.amount}
                    </td>
                    <td className="py-3 px-3 text-gray-300">
                      {req.requested_by_name}
                    </td>
                    <td className="py-3 px-3 text-gray-200 max-w-sm">
                      {req.reason}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          req.status === "pending"
                            ? "bg-amber-950 text-amber-300 border border-amber-800 pulse-gold"
                            : req.status === "approved"
                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                            : "bg-gray-800 text-gray-400 border border-gray-700"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-400">
                      {req.reviewed_by_name ? (
                        <div>
                          <span className="font-semibold text-gray-300">
                            By {req.reviewed_by_name}
                          </span>
                          {req.admin_notes && (
                            <span className="block text-[10px] italic text-gray-500">
                              &ldquo;{req.admin_notes}&rdquo;
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-600">Awaiting Manager</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      {req.status === "pending" && isAdmin ? (
                        <>
                          <button
                            onClick={() => openReviewModal(req, "approved")}
                            className="rounded-lg bg-rose-700 hover:bg-rose-600 px-3 py-1 text-[11px] font-bold text-white shadow"
                          >
                            Approve Void
                          </button>
                          <button
                            onClick={() => openReviewModal(req, "rejected")}
                            className="rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 px-2.5 py-1 text-[11px] font-semibold text-gray-300"
                          >
                            Reject
                          </button>
                        </>
                      ) : req.status === "pending" ? (
                        <span className="text-[11px] text-amber-400/80 italic">
                          Under Admin Review
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-500 flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Resolved</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-gray-500 italic">
                    No void requests in queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Review Modal */}
      {reviewModalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#0a1811] p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1">
              {decision === "approved" ? "Approve Void Request" : "Reject Void Request"}
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Review and record administrative action in the audit log
            </p>

            <form onSubmit={handleResolve} className="space-y-4">
              <div className="rounded-xl border border-emerald-950 bg-[#0d2116] p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="font-bold text-white">{selectedReq.table_name}</span>
                  <span className="font-bold text-rose-400">Rs. {selectedReq.amount}</span>
                </div>
                <p className="text-gray-300">
                  Reason: &ldquo;{selectedReq.reason}&rdquo;
                </p>
                <p className="text-[10px] text-gray-400">
                  Requested by: {selectedReq.requested_by_name}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Manager Review Notes
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#163022]">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="rounded-xl border border-gray-800 bg-[#0c1812] px-4 py-2 text-xs text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow ${
                    decision === "approved"
                      ? "bg-gradient-to-r from-rose-600 to-rose-700"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  {submitting ? "Processing..." : `Confirm ${decision === "approved" ? "Void Approval" : "Rejection"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
