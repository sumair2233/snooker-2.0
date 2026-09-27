"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ClubSettings } from "@/types";
import { Settings, Save, Check, Building, Phone, MapPin, DollarSign, Clock } from "lucide-react";
import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [settings, setSettings] = useState<ClubSettings>({
    club_name: "Green Baize Snooker Lounge",
    phone: "+92 300 8472910",
    address: "Plot 42, Commercial Sector Y, Phase 3 DHA, Lahore",
    currency: "Rs.",
    table_count: 6,
    century_rate_per_min: 6,
    receipt_footer: "Green Baize Snooker Lounge • Champions Play Here",
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) setSettings(await res.json());
      } catch (err) {
        console.error("Fetch settings error:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("Only Admins can modify club settings.");
      return;
    }

    setSaving(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      }
    } catch (err) {
      console.error("Save settings error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Club Settings">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-amber-400">⚙️</span> Club Profile & Global Parameters
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Configure club brand information, default currency symbol, and station defaults
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-6 shadow-xl">
          {success && (
            <div className="mb-5 rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Settings saved successfully!</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-amber-400" />
                <span>Club / Lounge Name</span>
              </label>
              <input
                type="text"
                required
                value={settings.club_name}
                onChange={(e) => setSettings({ ...settings, club_name: e.target.value })}
                className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-amber-400" />
                  <span>Contact Phone</span>
                </label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-amber-400" />
                  <span>Currency Symbol</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  placeholder="Rs. or $ or £"
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3.5 py-2 text-xs text-white font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-amber-400" />
                <span>Physical Address</span>
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Table Count
                </label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={settings.table_count}
                  onChange={(e) => setSettings({ ...settings, table_count: Number(e.target.value) || 6 })}
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Century Default (Rs/Min)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={settings.century_rate_per_min}
                  onChange={(e) => setSettings({ ...settings, century_rate_per_min: Number(e.target.value) || 6 })}
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Receipt / Bill Footer Note
              </label>
              <textarea
                rows={2}
                value={settings.receipt_footer}
                onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
                className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] p-3 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            {isAdmin && (
              <div className="pt-3 border-t border-[#163022]">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-950 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? "Saving Changes..." : "Save Club Settings"}</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Database Initialization & Migration Tool */}
        <div className="mt-6 rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-emerald-400 text-lg">🗄️</span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              PostgreSQL Database Auto-Setup
            </h2>
          </div>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            Initialize all database tables, foreign keys, JSONB columns, and query indices automatically without needing to paste statements into a SQL console.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a
              href="/api/setup-db"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 px-4 py-2.5 text-xs font-semibold text-emerald-300 transition-all cursor-pointer"
            >
              <span>🚀 Run 1-Click DB Setup (`/api/setup-db`)</span>
            </a>
            <span className="text-[11px] text-gray-500">
              Executes each table statement individually to avoid prepared statement limits.
            </span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
