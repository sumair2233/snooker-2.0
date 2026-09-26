"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "gold" | "green" | "red" | "emerald" | "default";
  trend?: string;
  badge?: string;
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  trend,
  badge,
  onClick,
}: StatsCardProps) {
  const variantStyles = {
    gold: {
      border: "border-amber-500/30 hover:border-amber-500/50",
      bg: "bg-gradient-to-br from-[#1c180b] to-[#0f1f17]",
      iconBg: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
      text: "text-amber-300",
      badge: "bg-amber-500/20 text-amber-300",
    },
    green: {
      border: "border-emerald-500/30 hover:border-emerald-500/50",
      bg: "bg-gradient-to-br from-[#0c2419] to-[#0a1811]",
      iconBg: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
      text: "text-emerald-300",
      badge: "bg-emerald-500/20 text-emerald-300",
    },
    red: {
      border: "border-rose-500/30 hover:border-rose-500/50",
      bg: "bg-gradient-to-br from-[#240c0f] to-[#140b0e]",
      iconBg: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
      text: "text-rose-300",
      badge: "bg-rose-500/20 text-rose-300",
    },
    emerald: {
      border: "border-teal-500/30 hover:border-teal-500/50",
      bg: "bg-gradient-to-br from-[#0c2222] to-[#0a1817]",
      iconBg: "bg-teal-500/15 text-teal-400 border border-teal-500/30",
      text: "text-teal-300",
      badge: "bg-teal-500/20 text-teal-300",
    },
    default: {
      border: "border-[#1a3828] hover:border-emerald-600/40",
      bg: "bg-[#0c1c14]",
      iconBg: "bg-emerald-950/50 text-emerald-400 border border-emerald-900/50",
      text: "text-white",
      badge: "bg-gray-800 text-gray-300",
    },
  }[variant];

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-4 transition-all shadow-sm ${variantStyles.border} ${variantStyles.bg} ${
        onClick ? "cursor-pointer hover:scale-[1.01] active:scale-[0.99]" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">{title}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${variantStyles.iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className={`text-xl font-bold tracking-tight ${variantStyles.text}`}>
          {value}
        </span>
        {badge && (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${variantStyles.badge}`}>
            {badge}
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
          <span>{subtitle}</span>
          {trend && <span className="font-medium text-emerald-400">{trend}</span>}
        </div>
      )}
    </div>
  );
}
