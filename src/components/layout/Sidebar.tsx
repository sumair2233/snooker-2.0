"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  PlaySquare,
  Flame,
  CalendarCheck,
  Receipt,
  HandCoins,
  Coffee,
  Package,
  Wallet,
  Users,
  Sliders,
  ShieldAlert,
  BarChart3,
  History,
  Settings,
  UserCheck,
  X,
  Lock,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pendingVoidCount?: number;
}

interface NavItem {
  name: string;
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  badge?: string;
  badgeColor?: string;
  disabled?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({ isOpen, onClose, pendingVoidCount = 1 }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role || "employee";
  const isAdmin = role === "admin";

  const navSections: NavSection[] = [
    {
      title: "Overview",
      items: [
        ...(isAdmin
          ? [
              {
                name: "Dashboard",
                href: "/dashboard",
                icon: LayoutDashboard,
              },
            ]
          : []),
        {
          name: "Live Board",
          href: "/live",
          icon: Flame,
          badge: "Live",
          badgeColor: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
        },
        {
          name: "Start / End Game",
          href: "/games/start-end",
          icon: PlaySquare,
        },
      ],
    },
    {
      title: "Records & Ledgers",
      items: [
        {
          name: "Today's Games",
          href: "/games/today",
          icon: CalendarCheck,
        },
        {
          name: "Player Bills",
          href: "/bills",
          icon: Receipt,
        },
        {
          name: "Loans",
          href: "/loans",
          icon: HandCoins,
        },
      ],
    },
    {
      title: "Café & POS",
      items: [
        {
          name: "Café Orders (POS)",
          href: "/cafe?tab=pos",
          icon: Coffee,
        },
        ...(isAdmin
          ? [
              {
                name: "Café Inventory",
                href: "/cafe?tab=inventory",
                icon: Package,
              },
              {
                name: "Cash Collect",
                href: "/cafe?tab=collect",
                icon: Wallet,
                badge: "Owner",
                badgeColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
              },
            ]
          : [
              {
                name: "Cash Collect",
                href: "#",
                icon: Wallet,
                disabled: true,
                badge: "By Owner",
                badgeColor: "bg-gray-800 text-gray-500 border border-gray-700",
              },
            ]),
      ],
    },
    {
      title: "Finances",
      items: [
        {
          name: "Expenses & Revenue",
          href: "/expenses",
          icon: Wallet,
        },
        ...(isAdmin
          ? [
              {
                name: "Financial Reports",
                href: "/reports",
                icon: BarChart3,
              },
            ]
          : []),
      ],
    },
    {
      title: "Administration",
      items: [
        {
          name: "Void Requests",
          href: "/void-requests",
          icon: ShieldAlert,
          badge: pendingVoidCount > 0 ? `${pendingVoidCount} Pending` : undefined,
          badgeColor: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
        },
        ...(isAdmin
          ? [
              {
                name: "Employees",
                href: "/management/employees",
                icon: Users,
              },
              {
                name: "Tables & Rates",
                href: "/management/tables",
                icon: Sliders,
              },
              {
                name: "Audit Trail",
                href: "/audit-log",
                icon: History,
              },
              {
                name: "Settings",
                href: "/settings",
                icon: Settings,
              },
            ]
          : [
              {
                name: "My Summary",
                href: "/my-summary",
                icon: UserCheck,
              },
            ]),
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Persistent Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#163022] bg-[#07130e] transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand / Logo Header */}
        <div className="flex h-16 items-center justify-between border-b border-[#163022] px-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            {/* Snooker ball logo badge */}
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-[#0b2417] border border-amber-500/50 shadow-md shadow-emerald-950">
              <span className="text-lg">🎱</span>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white block">
                Green Baize
              </span>
              <span className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold block">
                Snooker Club 2.0
              </span>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-[#13271c] hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Role Card */}
        <div className="p-3 mx-3 my-2 rounded-xl border border-emerald-900/40 bg-[#0d1e15]">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-semibold text-gray-200 truncate">
                {session?.user?.name || "Active Operator"}
              </p>
              <p className="text-[10px] text-gray-400">@{session?.user?.username || "user"}</p>
            </div>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isAdmin
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {role}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
          {navSections.map((section) => (
            <div key={section.title}>
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {section.title}
              </h3>
              <ul className="mt-1.5 space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href !== "#" &&
                    (pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href.split("?")[0])));

                  if (item.disabled) {
                    return (
                      <li key={item.name}>
                        <div
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-gray-500 cursor-not-allowed opacity-60"
                          title="Restricted: For Owner/Admin only"
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.name}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${item.badgeColor}`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (window.innerWidth < 1024) onClose();
                        }}
                        className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-emerald-900/60 to-[#0d261a] text-amber-300 border border-amber-500/30 shadow-sm"
                            : "text-gray-300 hover:bg-[#11261b] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              isActive ? "text-amber-400" : "text-emerald-500/70 group-hover:text-emerald-400"
                            }`}
                          />
                          <span className="truncate">{item.name}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${item.badgeColor}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer info */}
        <div className="border-t border-[#163022] p-3 text-center">
          <p className="text-[10px] text-gray-500">
            Green Baize Pro v2.4 • Vercel Ready
          </p>
        </div>
      </aside>
    </>
  );
}
