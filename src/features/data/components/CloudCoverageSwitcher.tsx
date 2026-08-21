import { Slider } from "antd";
import { FiCloud, FiX } from "react-icons/fi";
import { useState, useEffect } from "react";
import { useParameter } from "../hooks/useParameter";

const CloudCoverageSwitcher = () => {
  const { tab, setTab, cloudcover, setCloudCover } = useParameter();
  const isOpen = tab === "cloudcover";

  let min = 0;
  let max = 100;
  try {
    const parsed = JSON.parse(cloudcover);
    if (Array.isArray(parsed) && parsed.length === 2) {
      min = Number(parsed[0]);
      max = Number(parsed[1]);
    }
  } catch (e) {
    console.error(e);
  }

  const isFiltered = min > 0 || max < 100;
  const [range, setRange] = useState<[number, number]>([min, max]);

  useEffect(() => {
    setRange([min, max]);
  }, [cloudcover]);

  const handleApply = () => {
    setCloudCover(range[0], range[1]);
    setTab("none");
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCloudCover(0, 100);
    setRange([0, 100]);
    setTab("none");
  };

  return (
    <div className="relative inline-block">
      {/* Active Filtered Badge Pill or Default Button */}
      {isFiltered ? (
        <div
          onClick={() => setTab(isOpen ? "none" : "cloudcover")}
          className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-primary bg-primary px-3 text-xs font-semibold text-white shadow-md transition hover:bg-[#1f4e57] select-none"
        >
          <FiCloud size={14} />
          <span>
            {min > 0 && max < 100
              ? `Cloud: ${min}%-${max}%`
              : min > 0
              ? `Cloud ≥ ${min}%`
              : `Cloud ≤ ${max}%`}
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
            title="Clear Cloud Filter"
          >
            <FiX size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setTab(isOpen ? "none" : "cloudcover")}
          className={`flex h-8 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 text-xs font-medium shadow-md transition select-none ${
            isOpen ? "border-primary bg-primary/10 text-primary font-semibold" : "text-gray-700 hover:bg-cyan-50"
          }`}
        >
          <FiCloud size={14} />
          <span>Cloud</span>
        </button>
      )}

      {/* Popup Window */}
      {isOpen && (
        <div className="absolute top-[130%] left-0 z-50 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl animate-fadeIn">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-2.5">
            <h3 className="text-sm font-bold text-gray-800">Cloud Coverage</h3>

            <button
              onClick={() => setTab("none")}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <FiX size={16} />
            </button>
          </div>

          {/* Slider */}
          <div className="mb-5 px-1">
            <Slider
              range
              min={0}
              max={100}
              value={range}
              onChange={(value) => setRange(value as [number, number])}
              styles={{
                track: {
                  backgroundColor: "#2c6671",
                },
                handle: {
                  borderColor: "#2c6671",
                  backgroundColor: "#ffffff",
                },
                rail: {
                  backgroundColor: "#e5e7eb",
                },
              }}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-xs font-semibold text-gray-500">
              Range {range[0]}% to {range[1]}%
            </span>

            <button
              onClick={handleApply}
              className="rounded-lg bg-primary px-5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#1f4e57] transition cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloudCoverageSwitcher;
