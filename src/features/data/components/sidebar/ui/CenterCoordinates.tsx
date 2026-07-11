import React from "react";
import Toggle from "../../ui/Toggle";
interface CenterCoordinatesProps {
  latitude: string;
  longitude: string;
  latitudeDMS: any;
  longitudeDMS: any;

  decimalRegex: RegExp;

  shapeType: "Square" | "Rectangle";
  setShapeType: (value: "Square" | "Rectangle") => void;

  isRectangle: boolean;
  setSideLength: (value: string) => void;
  setWidth: (value: string) => void;
  setHeight: (value: string) => void;

  sideLength: string;
  width: string;
  height: string;
  area: number;

  setLatitude: (value: string) => void;
  setLongitude: (value: string) => void;

  isValidCenterBuffer: boolean;

  handleReset: () => void;
  handlePlot: () => void;
  onConfirm: () => void;
}

const CenterCoordinates: React.FC<CenterCoordinatesProps> = ({
  latitude,
  longitude,
  latitudeDMS,
  longitudeDMS,
  decimalRegex,

  shapeType,
  setShapeType,

  isRectangle,
  setLatitude,
  setLongitude,

  sideLength,
  setSideLength,

  width,
  setWidth,

  height,
  setHeight,

  area,

  isValidCenterBuffer,

  handleReset,
  handlePlot,
  onConfirm,
}) => {
  return (
    <>
      <div className="px-2 py-1 text-[#3F3E3E]">
        <h2 className="text-xs font-normal mb-2">Center Coordinates</h2>
        <p className="text-[10px] text-gray-500 mb-2">
          Enter the center location in decimal degrees (DD). The DMS values are
          calculated automatically.
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
                  if (decimalRegex.test(value)) {
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

                if (decimalRegex.test(value)) {
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
          Choose a shape and specify its dimensions. The buffer will be centered
          on the coordinates above.
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
              onChange={(value) => setShapeType(value ? "Rectangle" : "Square")}
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
                    onChange={(e) => {
                      if (decimalRegex.test(e.target.value)) {
                        setSideLength(e.target.value);
                      }
                    }}
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
                    onChange={(e) => {
                      if (decimalRegex.test(e.target.value)) {
                        setWidth(e.target.value);
                      }
                    }}
                    className="w-[75px] h-[22px] border border-gray-300 rounded px-1 text-xs outline-none focus:border-primary"
                  />

                  <span className="text-gray-500">km</span>
                </div>

                <div className="grid grid-cols-[75px_75px_auto] items-center gap-2">
                  <label className="text-gray-700 font-medium">Height</label>

                  <input
                    type="number"
                    value={height}
                    onChange={(e) => {
                      if (decimalRegex.test(e.target.value)) {
                        setHeight(e.target.value);
                      }
                    }}
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
          disabled={!isValidCenterBuffer}
          onClick={handlePlot}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-colors ${
            isValidCenterBuffer
              ? "text-white bg-primary hover:bg-primary/90 cursor-pointer"
              : "text-gray-400 bg-gray-200 cursor-not-allowed"
          }`}
        >
          Draw
        </button>
      </div>
    </>
  );
};

export default CenterCoordinates;
