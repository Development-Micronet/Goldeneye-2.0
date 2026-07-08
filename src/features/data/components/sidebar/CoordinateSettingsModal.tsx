import React, { useState } from "react";
import { toast } from "react-toastify";
import { useMapStore } from "../../store/useMapStore";
import Toggle from "../ui/Toggle";
import { useMapOptions } from "../../hooks/useMapOptions";

interface CoordinateSettingsModalProps {
  onConfirm: () => void;
}

type CoordinateType = "lat" | "long";
interface DMS {
  degree: number;
  minutes: number;
  seconds: number;
  direction: string;
}

export const CoordinateSettingsModal: React.FC<
  CoordinateSettingsModalProps
> = ({ onConfirm }) => {
  const { setPlotCoordinates } = useMapOptions();
  const [selectedtab, setselectedtab] = useState("centercoordinates");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [sideLength, setSideLength] = useState<string>("5");
  const [width, setWidth] = useState<string>("5");
  const [height, setHeight] = useState<string>("10");
  const [shapeType, setShapeType] = useState<"Square" | "Rectangle">("Square");
  const isRectangle = shapeType === "Rectangle";

  const convertToDMS = (value: number, type: CoordinateType): DMS => {
    const abs = Math.abs(value);

    let degree = Math.floor(abs);

    const minutesFloat = (abs - degree) * 60;
    let minutes = Math.floor(minutesFloat);

    let seconds = Math.round((minutesFloat - minutes) * 60);

    // Fix 60 seconds issue
    if (seconds === 60) {
      seconds = 0;
      minutes += 1;
    }

    // Fix 60 minutes issue
    if (minutes === 60) {
      minutes = 0;
      degree += 1;
    }

    let direction = "";

    if (type === "lat") {
      direction = value >= 0 ? "N" : "S";
    } else {
      direction = value >= 0 ? "E" : "W";
    }

    return {
      degree,
      minutes,
      seconds,
      direction,
    };
  };
  const area =
    shapeType === "Square"
      ? Number(sideLength) * Number(sideLength)
      : Number(width) * Number(height);

  const handlePlot = () => {
    if (!latitude.trim() || !longitude.trim()) {
      toast.error("Please enter latitude and longitude.");
      return;
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      toast.error("Enter valid coordinates.");
      return;
    }

    if (lat < -90 || lat > 90) {
      toast.error("Latitude must be between -90 and 90.");
      return;
    }

    if (lon < -180 || lon > 180) {
      toast.error("Longitude must be between -180 and 180.");
      return;
    }

    let finalWidth = 0;
    let finalHeight = 0;

    if (shapeType === "Square") {
      if (!sideLength.trim()) {
        toast.error("Enter side length.");
        return;
      }

      const side = Number(sideLength);

      if (Number.isNaN(side) || side <= 0) {
        toast.error("Enter valid side length.");
        return;
      }

      finalWidth = side;
      finalHeight = side;
    } else {
      if (!width.trim() || !height.trim()) {
        toast.error("Enter width and height.");
        return;
      }

      const rectWidth = Number(width);
      const rectHeight = Number(height);

      if (
        Number.isNaN(rectWidth) ||
        Number.isNaN(rectHeight) ||
        rectWidth <= 0 ||
        rectHeight <= 0
      ) {
        toast.error("Enter valid rectangle dimensions.");
        return;
      }

      finalWidth = rectWidth;
      finalHeight = rectHeight;
    }

    setPlotCoordinates({
      lat,
      lon,
      shape: shapeType,
      width: finalWidth,
      height: finalHeight,
      area: finalWidth * finalHeight,
    });
  };

  const handleReset = () => {
    setLatitude("");
    setLongitude("");
    setSideLength("5");
    setShapeType("Square");
  };

  const latitudeDMS = latitude ? convertToDMS(Number(latitude), "lat") : null;

  const longitudeDMS = longitude
    ? convertToDMS(Number(longitude), "long")
    : null;

  return (
    <div className="absolute left-full top-0 ml-0 bg-white border border-gray-200 p-4 w-120 z-50 flex flex-col space-y-3 pointer-events-auto text-left rounded-lg shadow-xl">
      <div className="text-[13px] text-gray-800 font-bold border-b border-gray-100 pb-1.5 select-none">
        Draw Rectangle by Coordinates
      </div>

      <div className="flex items-center space-x-2">
        <button
          className={`px-3 py-2 text-xs font-semibold transition-colors border-b-2 duration-200 ${
            selectedtab === "centercoordinates"
              ? "border-primary text-primary"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setselectedtab("centercoordinates")}
        >
          Center Coordinates
        </button>

        <button
          className={`px-3 py-2 text-xs font-semibold transition-colors border-b-2 duration-200 ${
            selectedtab === "boundcoordinates"
              ? "border-primary text-primary"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setselectedtab("boundcoordinates")}
        >
          Bound Coordinates
        </button>
      </div>

      {selectedtab === "centercoordinates" && (
        <>
          <div className="px-2 py-1 text-[#3F3E3E]">
            <h2 className="text-xs font-normal mb-2">Center Coordinates</h2>
            <p className="text-[10px] text-gray-500 mb-2">
              Enter the center location in decimal degrees (DD). The DMS values
              are calculated automatically.
            </p>
            <div className="grid grid-cols-[55px_95px_65px_65px_65px_45px] gap-2 items-center text-[10px]">
              {/* Header */}
              <div></div>
              <div className="text-center">Degree Decimal(DD)</div>
              <div className="text-center">Degree °</div>
              <div className="text-center">Minutes '</div>
              <div className="text-center">Second "</div>
              <div className="text-center">DMS</div>

              {/* Latitude */}
              <div className="text-[11px] font-bold">Latitude</div>

              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1">
                  <input
                    value={latitude}
                    onChange={(e) => {
                      const value = e.target.value;

                      // Allow only numbers, one decimal point, and negative sign
                      if (/^-?\d*\.?\d*$/.test(value)) {
                        setLatitude(value);
                      }
                    }}
                    inputMode="decimal"
                    className="w-[85px] h-[22px] border rounded px-1 text-xs"
                  />
                </div>
                <span className="text-[14px] font-medium">°</span>
              </div>

              <div className="flex items-center gap-1">
                <input
                  value={latitudeDMS?.degree || ""}
                  readOnly
                  className="w-[55px] h-[22px] border rounded px-1 text-xs"
                />
                <span className="text-[14px] font-medium">°</span>
              </div>

              <div className="flex items-center gap-1">
                <input
                  value={latitudeDMS?.minutes || ""}
                  readOnly
                  className="w-[55px] h-[22px] border rounded px-1 text-xs"
                />
                <span className="text-[14px] font-medium">'</span>
              </div>

              <div className="flex items-center gap-1">
                <input
                  value={latitudeDMS?.seconds || ""}
                  readOnly
                  className="w-[55px] h-[22px] border rounded px-1 text-xs"
                />
                <span className="text-[14px] font-medium">"</span>
              </div>

              <div className="flex items-center gap-1">
                <input
                  value={latitudeDMS?.direction || ""}
                  readOnly
                  className="w-[45px] h-[22px] border rounded px-1 text-xs"
                />
              </div>

              {/* Longitude */}
              <div className="text-[11px] font-bold">Longitude</div>

              <div className="flex items-center gap-1">
                <input
                  value={longitude}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (/^-?\d*\.?\d*$/.test(value)) {
                      setLongitude(value);
                    }
                  }}
                  inputMode="decimal"
                  className="w-[85px] h-[22px] border rounded px-1 text-xs"
                />
                <span className="text-[14px] font-medium">°</span>
              </div>

              <div className="flex items-center gap-1">
                <input
                  value={longitudeDMS?.degree || ""}
                  readOnly
                  className="w-[55px] h-[22px] border rounded px-1 text-xs"
                />
                <span className="text-[14px] font-medium">°</span>
              </div>

              <div className="flex items-center gap-1">
                <input
                  value={longitudeDMS?.minutes || ""}
                  readOnly
                  className="w-[55px] h-[22px] border rounded px-1 text-xs"
                />
                <span className="text-[14px] font-medium">'</span>
              </div>

              <div className="flex items-center gap-1">
                <input
                  value={longitudeDMS?.seconds || ""}
                  readOnly
                  className="w-[55px] h-[22px] border rounded px-1 text-xs"
                />
                <span className="text-[14px] font-medium">"</span>
              </div>

              <div className="flex items-center gap-1">
                <input
                  value={longitudeDMS?.direction || ""}
                  readOnly
                  className="w-[45px] h-[22px] border rounded px-1 text-xs"
                />
              </div>
            </div>
          </div>
          <div className="h-px w-full bg-primary" />
          <div className="px-2 py-1 text-[#3F3E3E] ">
            <h2 className="text-xs font-normal mb-2">Buffer Dimension</h2>
            <p className="text-[10px] text-gray-500 mb-2">
              Choose a shape and specify its dimensions. The buffer will be
              centered on the coordinates above.
            </p>
            <div className="flex flex-col items-center gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold ${
                    shapeType === "Square" ? "text-primary" : "text-gray-500"
                  }`}
                >
                  Square
                </span>

                <Toggle
                  checked={isRectangle}
                  onChange={(value) =>
                    setShapeType(value ? "Rectangle" : "Square")
                  }
                />

                <span
                  className={`text-[11px] font-bold ${
                    shapeType === "Rectangle" ? "text-primary" : "text-gray-500"
                  }`}
                >
                  Rectangle
                </span>
              </div>
              <div className="flex flex-col gap-2 text-[11px]">
                {shapeType === "Square" ? (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="w-[75px] text-gray-700 font-medium">
                        Side
                      </label>

                      <input
                        type="number"
                        value={sideLength}
                        onChange={(e) => setSideLength(e.target.value)}
                        className="w-[75px] h-[22px] border border-gray-300 rounded px-1 text-xs outline-none focus:border-primary"
                      />

                      <span className="text-gray-500">km</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="w-[75px] text-gray-700 font-medium">
                        Area
                      </label>

                      <input
                        readOnly
                        value={area}
                        className="w-[75px] h-[22px] border border-gray-200 bg-gray-50 rounded px-1 text-xs text-gray-600"
                      />

                      <span className="text-gray-500">sq km</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-[75px_75px_auto] items-center gap-2">
                      <label className="text-gray-700 font-medium">Width</label>

                      <input
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        className="w-[75px] h-[22px] border border-gray-300 rounded px-1 text-xs outline-none focus:border-primary"
                      />

                      <span className="text-gray-500">km</span>
                    </div>

                    <div className="grid grid-cols-[75px_75px_auto] items-center gap-2">
                      <label className="text-gray-700 font-medium">
                        Height
                      </label>

                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-[75px] h-[22px] border border-gray-300 rounded px-1 text-xs outline-none focus:border-primary"
                      />

                      <span className="text-gray-500">km</span>
                    </div>

                    <div className="grid grid-cols-[75px_75px_auto] items-center gap-2">
                      <label className="text-gray-700 font-medium">Area</label>

                      <input
                        readOnly
                        value={area}
                        className="w-[75px] h-[22px] border border-gray-200 bg-gray-50 rounded px-1 text-xs text-gray-600"
                      />

                      <span className="text-gray-500">sq km</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="mt-2 rounded bg-blue-50 border border-blue-200 px-2 py-1">
            <p className="text-[10px] text-blue-700">
              <strong>Tip:</strong> Latitude must be between <b>-90</b> and{" "}
              <b>90</b>, longitude between <b>-180</b> and <b>180</b>. Click{" "}
              <b>Draw</b> to create the buffer on the map.
            </p>
          </div>
          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer focus:outline-none border-none"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer focus:outline-none border-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePlot}
              className="flex-1 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-full transition-colors cursor-pointer focus:outline-none border-none"
            >
              Draw
            </button>
          </div>
        </>
      )}

      {selectedtab === "boundcoordinates" && (
        <>
          <h1>Boundary Coordinates</h1>
        </>
      )}
    </div>
  );
};
