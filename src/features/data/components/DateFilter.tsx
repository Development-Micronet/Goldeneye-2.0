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

  const getDateDisplayText = () => {
    if (mode === "between" && startDate && endDate) {
      return `Date: ${startDate} → ${endDate}`;
    }
    if (mode === "after" && startDate) {
      return `Date > ${startDate}`;
    }
    if (mode === "before" && startDate) {
      return `Date < ${startDate}`;
    }
    return `Date: ${startDate || endDate}`;
  };

  return (
    <div className="relative inline-block">
      {/* Active Filtered Badge Pill or Default Button */}
      {isFiltered ? (
        <div
          onClick={() => setTab(isOpen ? "none" : "date")}
          className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-primary bg-primary px-3 text-xs font-semibold text-white shadow-md transition hover:bg-[#1f4e57] select-none"
        >
          <FiCalendar size={14} />
          <span>{getDateDisplayText()}</span>
          <button
            type="button"
            onClick={handleReset}
            className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
            title="Clear Date Filter"
          >
            <FiX size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setTab(isOpen ? "none" : "date")}
          className={`flex h-8 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 text-xs font-medium shadow-md transition select-none ${
            isOpen ? "border-primary bg-primary/10 text-primary font-semibold" : "text-gray-700 hover:bg-cyan-50"
          }`}
        >
          <FiCalendar size={14} />
          <span>Date</span>
        </button>
      )}

      {/* Popup Window */}
      {isOpen && (
        <div className="absolute top-[130%] right-0 z-50 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3">
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
                        ? "border-primary bg-[#EFFBFD] text-primary"
                        : "border-gray-200 text-gray-600 hover:border-primary"
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
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs transition outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {mode === "between" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">End Date</label>

                  <input
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs transition outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
                className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-bold text-white transition hover:bg-[#1f4e57] shadow-xs"
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
