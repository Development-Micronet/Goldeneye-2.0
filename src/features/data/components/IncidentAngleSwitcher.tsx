import { Slider } from "antd";
import { FiCompass, FiX } from "react-icons/fi";
import { useState } from "react";
import { useParameter } from "../hooks/useParameter";

const IncidentAngleSwitcher = () => {
  const { incidentAngle, setIncidentAngle, tab, setTab } = useParameter();
  const open = tab === "incidence";
  const [min, max] = JSON.parse(incidentAngle) as [number, number];
  const [range, setRange] = useState<[number, number]>([min, max]);
  const apply = () => {
    setIncidentAngle(range[0], range[1]);
    setTab("none");
  };

  return (
    <>
      {/* Toggle Button */}

      <button
        onClick={() => setTab(open ? "none" : "incidence")}
        className={`flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 text-xs font-medium shadow-md transition ${
          open ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-cyan-50"
        }`}
      >
        <FiCompass size={16} />
        <span>Incident Angle</span>
      </button>
      {/* Popup */}
      {open && (
        <div className="absolute top-[150%] left-[45%] z-50 w-80 rounded-xl border border-gray-300 bg-white p-4 shadow-2xl">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between pb-2">
            <h3 className="font-semibold text-gray-800">Incident Angle</h3>

            <button
              onClick={() => setTab("none")}
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Slider */}
          <div className="mb-5 px-1">
            <Slider
              range
              min={0}
              max={60}
              value={range}
              onChange={(value) => setRange(value as [number, number])}
              styles={{
                track: {
                  backgroundColor: "#38bdf8",
                },
                handle: {
                  backgroundColor: "#ffffff",
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
              [{range[0]},{range[1]}]
            </span>

            <button
              onClick={apply}
              className="rounded-md bg-cyan-700 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-800"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default IncidentAngleSwitcher;
