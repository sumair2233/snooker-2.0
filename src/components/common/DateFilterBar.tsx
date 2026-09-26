"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from "lucide-react";

interface DateFilterBarProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (newDate: string) => void;
  onClear: () => void;
  className?: string;
}

export function DateFilterBar({
  selectedDate,
  onDateChange,
  onClear,
  className = "",
}: DateFilterBarProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = selectedDate === todayStr;

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split("T")[0]);
  };

  const formattedDisplay = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Date navigation button group */}
      <div className="flex items-center rounded-xl border border-[#1b3a2a] bg-[#0c1c14] p-1 shadow-sm">
        <button
          onClick={handlePrevDay}
          title="Previous Day"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-[#152e21] hover:text-white transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 px-3 py-1">
          <Calendar className="h-4 w-4 text-amber-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className="bg-transparent text-xs font-semibold text-gray-200 focus:outline-none cursor-pointer [color-scheme:dark]"
          />
          <span className="hidden sm:inline text-xs text-gray-400 border-l border-gray-700 pl-2">
            {formattedDisplay}
          </span>
        </div>

        <button
          onClick={handleNextDay}
          title="Next Day"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-[#152e21] hover:text-white transition-all"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Quick Today Button */}
      <button
        onClick={() => onDateChange(todayStr)}
        className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all border ${
          isToday
            ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
            : "border-[#1b3a2a] bg-[#0c1c14] text-gray-400 hover:text-white hover:bg-[#14291e]"
        }`}
      >
        Today
      </button>

      {/* Clear Filters Button */}
      <button
        onClick={onClear}
        title="Reset to today's operations"
        className="flex items-center gap-1.5 rounded-xl border border-gray-800 bg-[#0c1c14] px-3 py-2 text-xs font-medium text-gray-400 hover:border-gray-700 hover:text-gray-200 transition-all"
      >
        <RotateCcw className="h-3 w-3" />
        <span>Clear Filters</span>
      </button>
    </div>
  );
}
