import React, { useState } from "react";
import { toast } from "react-toastify";
import { useMapStore } from "../../store/useMapStore";

interface CoordinateSettingsModalProps {
  onConfirm: () => void;
}

export const CoordinateSettingsModal: React.FC<CoordinateSettingsModalProps> = ({
  onConfirm,
}) => {
  const setDrawRectangleCoords = useMapStore((state) => state.setDrawRectangleCoords);

  const [topLeftLat, setTopLeftLat] = useState("");
  const [topLeftLon, setTopLeftLon] = useState("");
  const [bottomRightLat, setBottomRightLat] = useState("");
  const [bottomRightLon, setBottomRightLon] = useState("");

  const handleDraw = () => {
    const tLat = parseFloat(topLeftLat);
    const tLon = parseFloat(topLeftLon);
    const bLat = parseFloat(bottomRightLat);
    const bLon = parseFloat(bottomRightLon);

    if (isNaN(tLat) || isNaN(tLon) || isNaN(bLat) || isNaN(bLon)) {
      toast.error("Please enter valid numeric coordinates");
      return;
    }

    if (tLat < -90 || tLat > 90 || bLat < -90 || bLat > 90) {
      toast.error("Latitude must be between -90 and 90");
      return;
    }
    if (tLon < -180 || tLon > 180 || bLon < -180 || bLon > 180) {
      toast.error("Longitude must be between -180 and 180");
      return;
    }

    // Update store
    setDrawRectangleCoords({
      topLeftLat: tLat,
      topLeftLon: tLon,
      bottomRightLat: bLat,
      bottomRightLon: bLon,
    });

    onConfirm();
  };

  return (
    <div className="absolute left-full top-0 ml-0 bg-white border border-gray-200 p-4 w-[250px] z-50 flex flex-col space-y-3 pointer-events-auto text-left rounded-lg shadow-xl">
      <div className="text-[13px] text-gray-800 font-bold border-b border-gray-100 pb-1.5 select-none">
        Draw Rectangle by Coordinates
      </div>

      {/* Top Left Corner */}
      <div className="flex flex-col space-y-1">
        <span className="text-[11px] font-semibold text-gray-700">Top-Left Corner (Lat, Lon):</span>
        <div className="grid grid-cols-2 gap-1.5">
          <input
            type="number"
            step="any"
            placeholder="Lat"
            value={topLeftLat}
            onChange={(e) => setTopLeftLat(e.target.value)}
            className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary text-gray-700 font-medium"
          />
          <input
            type="number"
            step="any"
            placeholder="Lon"
            value={topLeftLon}
            onChange={(e) => setTopLeftLon(e.target.value)}
            className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary text-gray-700 font-medium"
          />
        </div>
      </div>

      {/* Bottom Right Corner */}
      <div className="flex flex-col space-y-1">
        <span className="text-[11px] font-semibold text-gray-700">Bottom-Right Corner (Lat, Lon):</span>
        <div className="grid grid-cols-2 gap-1.5">
          <input
            type="number"
            step="any"
            placeholder="Lat"
            value={bottomRightLat}
            onChange={(e) => setBottomRightLat(e.target.value)}
            className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary text-gray-700 font-medium"
          />
          <input
            type="number"
            step="any"
            placeholder="Lon"
            value={bottomRightLon}
            onChange={(e) => setBottomRightLon(e.target.value)}
            className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary text-gray-700 font-medium"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 pt-1">
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer focus:outline-none border-none"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDraw}
          className="flex-1 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-full transition-colors cursor-pointer focus:outline-none border-none"
        >
          Draw
        </button>
      </div>
    </div>
  );
};
