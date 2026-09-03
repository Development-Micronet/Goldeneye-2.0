import { FiCalendar, FiX } from "react-icons/fi";
import { useState, useEffect } from "react";
import { useParameter } from "../hooks/useParameter";

type Mode = "between" | "after" | "before";

const DateFilter = () => {
  const { dateMode, startDate, endDate, setDateFilter, tab, setTab } = useParameter();
  const isOpen = tab === "date";
  const [mode, setMode] = useState<Mode>(dateMode);
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const modes: Mode[] = ["between", "after", "before"];
  const today = new Date().toISOString().split("T")[0];

  const isFiltered = Boolean(startDate || endDate);

  useEffect(() => {
    setMode(dateMode);
    setStart(startDate);
    setEnd(endDate);
  }, [dateMode, startDate, endDate]);

  const handleApply = () => {
    setDateFilter(mode, start, end);
    setTab("none");
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStart("");
    setEnd("");
    setMode("between");
    setDateFilter("between", "", "");
    setTab("none");
  };

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const monthIndex = parseInt(month, 10) - 1;
      const monthName = months[monthIndex] || month;
      const dayPadded = day.padStart(2, "0");
      return `${dayPadded} ${monthName} ${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dayNum = String(d.getDate()).padStart(2, "0");
    const monthName = d.toLocaleString("en-US", { month: "short" });
    const yearNum = d.getFullYear();
    return `${dayNum} ${monthName} ${yearNum}`;
  };

  const getDateDisplayText = () => {
    const formattedStart = formatDisplayDate(startDate);
    const formattedEnd = formatDisplayDate(endDate);

    if (dateMode === "after" && startDate) {
      return `Acquired After ${formattedStart}`;
    }
    if (dateMode === "before" && (startDate || endDate)) {
      return `Acquired Before ${formattedStart || formattedEnd}`;
    }
    if (dateMode === "between" && startDate && endDate) {
      return `Acquired ${formattedStart} → ${formattedEnd}`;
    }
    if (startDate && endDate) {
      return `Acquired ${formattedStart} → ${formattedEnd}`;
    }
    return `Acquired ${formattedStart || formattedEnd}`;
  };

  return (
    <div className="relative inline-block">
      {/* Active Filtered Badge Pill or Default Button */}
      {isFiltered ? (
        <div
          onClick={() => setTab(isOpen ? "none" : "date")}
          className="border-primary bg-primary flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-semibold text-white shadow-md transition select-none hover:bg-[#1f4e57]"
        >
          <span>{getDateDisplayText()}</span>
          <button
            type="button"
            onClick={handleReset}
            className="ml-1 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-white/80 transition hover:bg-white/20 hover:text-white"
            title="Clear Date Filter"
          >
            <FiX size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setTab(isOpen ? "none" : "date")}
          className={`flex h-8 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 text-xs font-medium shadow-md transition select-none ${
            isOpen
              ? "border-primary bg-primary/10 text-primary font-semibold"
              : "text-gray-700 hover:bg-cyan-50"
          }`}
        >
          <FiCalendar size={14} />
          <span>Date</span>
        </button>
      )}

      {/* Popup Window */}
      {isOpen && (
        <div className="animate-fadeIn absolute top-[130%] right-0 z-50 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2.5">
            <h3 className="text-sm font-bold text-gray-800">Select Date</h3>

            <button
              type="button"
              onClick={() => setTab("none")}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <FiX size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {/* Mode Selection */}
            <div>
              <div className="flex gap-2">
                {modes.map((item) => (
                  <label
                    key={item}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                      mode === item
                        ? "border-primary text-primary bg-[#EFFBFD]"
                        : "hover:border-primary border-gray-200 text-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={mode === item}
                      onChange={() => setMode(item)}
                      className="accent-primary h-3 w-3"
                    />
                    <span className="capitalize">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Inputs */}
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  {mode === "between" ? "Start Date" : "Date"}
                </label>

                <input
                  type="date"
                  value={start}
                  max={today}
                  onChange={(e) => setStart(e.target.value)}
                  className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs transition outline-none focus:ring-1"
                />
              </div>

              {mode === "between" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">End Date</label>

                  <input
                    type="date"
                    value={end}
                    min={start || undefined}
                    max={today}
                    onChange={(e) => setEnd(e.target.value)}
                    className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs transition outline-none focus:ring-1"
                  />
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="bg-primary flex-1 rounded-lg py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#1f4e57]"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateFilter;
