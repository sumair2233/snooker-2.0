"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";
import { LockModal } from "./LockModal";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTablesCount, setActiveTablesCount] = useState(2);
  const [totalTablesCount, setTotalTablesCount] = useState(6);
  const [pendingVoidCount, setPendingVoidCount] = useState(1);

  // Redirect to /login if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch live state counts periodically
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch("/api/live");
        if (res.ok) {
          const data = await res.json();
          if (data.tables) {
            setTotalTablesCount(data.tables.length);
            const liveCount = Object.keys(data.activeGames || {}).length;
            setActiveTablesCount(liveCount);
          }
        }

        const vRes = await fetch("/api/void-requests");
        if (vRes.ok) {
          const vData = await vRes.json();
          const pending = vData.filter((v: { status: string }) => v.status === "pending").length;
          setPendingVoidCount(pending);
        }
      } catch (err) {
        // Silent catch for polling
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, []);

  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#07110c]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
            Loading Green Baize Club...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#07110c] text-gray-100">
      {/* Persistent Left Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingVoidCount={pendingVoidCount}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavbar
          title={title}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onLock={() => setIsLocked(true)}
          activeCount={activeTablesCount}
          totalTables={totalTablesCount}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Quick Session Lock Overlay */}
      <LockModal isOpen={isLocked} onUnlock={() => setIsLocked(false)} />
    </div>
  );
}
