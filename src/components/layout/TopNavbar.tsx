"use client";

import React, { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Clock,
  Lock,
  LogOut,
  Menu,
  Shield,
  User as UserIcon,
  CircleDot,
} from "lucide-react";

interface TopNavbarProps {
  onToggleSidebar: () => void;
  onLock: () => void;
  title?: string;
  activeCount?: number;
  totalTables?: number;
}

export function TopNavbar({
  onToggleSidebar,
  onLock,
  title = "Dashboard",
  activeCount = 2,
  totalTables = 6,
}: TopNavbarProps) {
  const { data: session } = useSession();
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = session?.user?.role === "admin";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#163022] bg-[#08130e]/90 px-4 md:px-6 backdrop-blur-md">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-gray-400 hover:bg-[#13271c] hover:text-white lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>{title}</span>
          </h1>
          <p className="text-[11px] text-gray-400 hidden sm:block">
            Green Baize Snooker Lounge Operations
          </p>
        </div>
      </div>

      {/* Center: Live Tables Indicator */}
      <div className="hidden md:flex items-center gap-2 rounded-full border border-emerald-900/60 bg-[#0e2117] px-3 py-1 text-xs">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 pulse-green" />
        <span className="text-gray-300">
          <strong className="text-amber-400">{activeCount}</strong> In Play
        </span>
        <span className="text-gray-600">•</span>
        <span className="text-gray-400">
          <strong className="text-emerald-400">{totalTables - activeCount}</strong> Available
        </span>
      </div>

      {/* Right: Live Clock, Role Badge, Lock, Logout */}
      <div className="flex items-center gap-3">
        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-gray-800 bg-[#0c1913] px-2.5 py-1 text-xs font-mono text-emerald-300">
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span>{timeStr || "12:00:00 PM"}</span>
        </div>

        {/* Role Badge */}
        <div
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${
            isAdmin
              ? "border border-amber-500/40 bg-amber-950/40 text-amber-300"
              : "border border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>{session?.user?.role || "GUEST"}</span>
        </div>

        {/* Lock Screen Button */}
        <button
          onClick={onLock}
          title="Lock Terminal (Quick PIN Lock)"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-800 bg-[#0f2118] text-gray-300 hover:border-amber-500/50 hover:bg-amber-950/30 hover:text-amber-400 transition-all"
        >
          <Lock className="h-4 w-4" />
        </button>

        {/* Sign Out Button */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign Out"
          className="flex items-center gap-1.5 rounded-lg border border-rose-900/40 bg-rose-950/20 px-3 py-1.5 text-xs font-medium text-rose-300 hover:border-rose-700 hover:bg-rose-950/50 transition-all"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
