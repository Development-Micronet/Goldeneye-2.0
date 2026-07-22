import { Slider } from "antd";
import { FiCloud } from "react-icons/fi";
import { FiX } from "react-icons/fi";
import { useState } from "react";
import { useParameter } from "../hooks/useParameter";

const CloudCoverageSwitcher = () => {
  const { tab, setTab, setCloudCover } = useParameter();
  const isOpen = tab === "cloudcover";
  const [range, setRange] = useState<[number, number]>([0, 100]);
  const handleApply = () => {
    setCloudCover(range[0], range[1]);
    setTab("none");
  };

  return (
    <>
      {/* Button */}

      <button
        onClick={() => setTab(isOpen ? "none" : "cloudcover")}
        className={`flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 text-xs font-medium shadow-md transition ${
          isOpen ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-cyan-50"
        }`}
      >
        <FiCloud size={16} />
        <span>Cloud</span>
      </button>

      {/* Window */}
      {isOpen && (
        <div className="absolute top-[150%] left-[10%] z-50 w-80 rounded-xl bg-white p-4 shadow-2xl">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between pb-2">
            <h3 className="font-semibold text-gray-800">Cloud Coverage</h3>

            <button
              onClick={() => setTab("none")}
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Slider */}
          <div className="mb-5">
            <Slider
              range
              min={0}
              max={100}
              value={range}
              onChange={(value) => setRange(value as [number, number])}
              styles={{
                track: {
                  backgroundColor: "#38bdf8",
                },
                handle: {
                  backgroundColor: "#fff",
                },
                rail: {
                  backgroundColor: "#e5e7eb",
                },
              }}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3">
            <span className="text-xs text-gray-500">
              Range {range[0]}% to {range[1]}%
            </span>

            <button
              onClick={handleApply}
              className="bg-primary rounded-md px-5 py-2 text-sm font-medium text-white hover:bg-cyan-800"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CloudCoverageSwitcher;
