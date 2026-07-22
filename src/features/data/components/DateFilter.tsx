import { FiCalendar } from "react-icons/fi";
import { FiX } from "react-icons/fi";
import { useState } from "react";
import { useParameter } from "../hooks/useParameter";

type Mode = "between" | "after" | "before";
const DateFilter = () => {
  const { dateMode, startDate, endDate, setDateFilter, tab, setTab } = useParameter();
  const open = tab === "date";
  const [mode, setMode] = useState<Mode>(dateMode);
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const modes: Mode[] = ["between", "after", "before"];
  const apply = () => {
    setDateFilter(mode, start, end);
    setTab("none");
  };

  return (
    <>
      {/* Toggle Button */}

      <button
        onClick={() => setTab(open ? "none" : "date")}
        className={`flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 text-xs font-medium shadow-md transition ${
          open ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-cyan-50"
        }`}
      >
        <FiCalendar size={16} />
        <span>Date</span>
      </button>

      {open && (
        <div className="absolute top-[150%] left-1/2 z-50 w-80 rounded-2xl bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h3 className="text-base font-semibold text-gray-800">Select Date</h3>

            <button
              type="button"
              onClick={() => {
                setStart("");
                setEnd("");
                setMode("between");
                setTab("none");
              }}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="p-3">
            {/* Mode Selection */}
            <div className="mb-3">
              <div className="flex gap-2">
                {modes.map((item) => (
                  <label
                    key={item}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                      mode === item
                        ? "border-primary text-primary"
                        : "hover:border-primary border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={mode === item}
                      onChange={() => setMode(item)}
                      className="accent-primary"
                    />
                    <span className="capitalize">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Inputs */}
            <div className="">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  {mode === "between" ? "Start Date" : "Date"}
                </label>

                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="focus:border-primary focus:ring-primary/10 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition outline-none focus:ring-2"
                />
              </div>

              {mode === "between" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600">End Date</label>

                  <input
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="focus:border-primary focus:ring-primary/10 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition outline-none focus:ring-2"
                  />
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => {
                  setStart("");
                  setEnd("");
                  setMode("between");
                  setTab("none");
                  setTab("none");
                }}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={apply}
                className="bg-primary hover:bg-primary flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DateFilter;
