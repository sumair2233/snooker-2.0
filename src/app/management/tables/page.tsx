"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ClubTable, TableRates } from "@/types";
import { Sliders, Plus, Edit2, Check, X, Flame } from "lucide-react";
import { useSession } from "next-auth/react";

export default function TablesManagementPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [tables, setTables] = useState<ClubTable[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<ClubTable | null>(null);
  const [tableNumber, setTableNumber] = useState<number>(1);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [ball15, setBall15] = useState<number>(200);
  const [ball10, setBall10] = useState<number>(150);
  const [ball6, setBall6] = useState<number>(100);
  const [centuryPerMin, setCenturyPerMin] = useState<number>(6);
  const [active, setActive] = useState(true);

  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tables");
      if (res.ok) setTables(await res.json());
    } catch (err) {
      console.error("Fetch tables error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const openAddModal = () => {
    setEditingTable(null);
    setTableNumber(tables.length + 1);
    setName(`Table ${tables.length + 1} — Standard Match`);
    setBrand("Shender");
    setBall15(200);
    setBall10(150);
    setBall6(100);
    setCenturyPerMin(6);
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (t: ClubTable) => {
    setEditingTable(t);
    setTableNumber(t.table_number);
    setName(t.name);
    setBrand(t.brand);
    setBall15(t.rates.ball15);
    setBall10(t.rates.ball10);
    setBall6(t.rates.ball6);
    setCenturyPerMin(t.rates.centuryPerMin);
    setActive(t.active);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        id: editingTable?.id,
        table_number: Number(tableNumber),
        name: name.trim(),
        brand: brand.trim(),
        rates: {
          ball15: Number(ball15),
          ball10: Number(ball10),
          ball6: Number(ball6),
          centuryPerMin: Number(centuryPerMin),
        },
        active,
      };

      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchTables();
      }
    } catch (err) {
      console.error("Save table error:", err);
    }
  };

  return (
    <AppShell title="Tables & Rate Matrix">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-amber-400">🎱</span> Table Setup & Pricing Rates
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Configure tables, brands, and ball-count rate structures (15-Ball, 10-Ball, 6-Ball & Century)
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-950 shadow-md transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Table</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {tables.map((table) => (
          <div
            key={table.id}
            className="rounded-2xl border border-emerald-900/50 bg-[#0a1811] p-5 shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-[#163022] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-950 text-xs font-black text-amber-400 border border-emerald-800">
                    #{table.table_number}
                  </span>
                  <div>
                    <h3 className="font-bold text-white text-sm">{table.name}</h3>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">
                      {table.brand} Tournament Slate
                    </span>
                  </div>
                </div>

                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    table.active
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : "bg-rose-950 text-rose-300 border border-rose-800"
                  }`}
                >
                  {table.active ? "Active" : "Offline"}
                </span>
              </div>

              {/* Rate Matrix */}
              <div className="grid grid-cols-2 gap-2 text-xs my-3">
                <div className="rounded-xl border border-emerald-950 bg-[#0d2116] p-2.5">
                  <span className="text-gray-400 text-[10px] block">15-Ball Rate</span>
                  <span className="text-sm font-bold text-white">Rs. {table.rates.ball15}</span>
                </div>
                <div className="rounded-xl border border-emerald-950 bg-[#0d2116] p-2.5">
                  <span className="text-gray-400 text-[10px] block">10-Ball Rate</span>
                  <span className="text-sm font-bold text-white">Rs. {table.rates.ball10}</span>
                </div>
                <div className="rounded-xl border border-emerald-950 bg-[#0d2116] p-2.5">
                  <span className="text-gray-400 text-[10px] block">6-Ball Rate</span>
                  <span className="text-sm font-bold text-white">Rs. {table.rates.ball6}</span>
                </div>
                <div className="rounded-xl border border-emerald-950 bg-[#0d2116] p-2.5">
                  <span className="text-gray-400 text-[10px] block">Century Rate</span>
                  <span className="text-sm font-bold text-amber-400">Rs. {table.rates.centuryPerMin}/min</span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="pt-3 border-t border-emerald-950/80 mt-2">
                <button
                  onClick={() => openEditModal(table)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-emerald-800 bg-[#0d1e15] hover:bg-[#132c1f] py-2 text-xs font-semibold text-amber-300 transition-all shadow"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Configure Rates & Details</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Table Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#0a1811] p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1">
              {editingTable ? `Edit Table #${editingTable.table_number}` : "Add New Table"}
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Configure table branding and ball-count rate schedule
            </p>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                    Number
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={tableNumber}
                    onChange={(e) => setTableNumber(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Shender, Riley, Xingpai"
                    className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Table Display Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Table 1 — Shender Steel Block Pro"
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Rate Inputs */}
              <div className="rounded-xl border border-emerald-950 bg-[#0d2116] p-3 space-y-2">
                <span className="text-[10px] uppercase font-bold text-amber-300 block">
                  Ball Count Rates (Rs.)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-400">15-Ball Rate</label>
                    <input
                      type="number"
                      required
                      value={ball15}
                      onChange={(e) => setBall15(Number(e.target.value))}
                      className="w-full rounded-lg border border-[#1b3a2a] bg-[#07130e] px-2 py-1 text-xs font-bold text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400">10-Ball Rate</label>
                    <input
                      type="number"
                      required
                      value={ball10}
                      onChange={(e) => setBall10(Number(e.target.value))}
                      className="w-full rounded-lg border border-[#1b3a2a] bg-[#07130e] px-2 py-1 text-xs font-bold text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400">6-Ball Rate</label>
                    <input
                      type="number"
                      required
                      value={ball6}
                      onChange={(e) => setBall6(Number(e.target.value))}
                      className="w-full rounded-lg border border-[#1b3a2a] bg-[#07130e] px-2 py-1 text-xs font-bold text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400">Century (Rs/Min)</label>
                    <input
                      type="number"
                      required
                      value={centuryPerMin}
                      onChange={(e) => setCenturyPerMin(Number(e.target.value))}
                      className="w-full rounded-lg border border-[#1b3a2a] bg-[#07130e] px-2 py-1 text-xs font-bold text-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-amber-500"
                  />
                  <span>Table Available for Play</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#163022]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-gray-800 bg-[#0c1812] px-4 py-2 text-xs text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-xs font-bold text-gray-950 shadow"
                >
                  Save Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
