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
        <h2 className="mb-2 text-xs font-normal">Center Coordinates</h2>
        <p className="mb-2 text-[10px] text-gray-500">
          Enter the center location in decimal degrees (DD). The DMS values are calculated
          automatically.
        </p>
        <div className="grid grid-cols-[55px_95px_65px_65px_65px_45px] items-center gap-2 text-[10px]">
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
                className="h-[22px] w-[85px] rounded border px-1 text-xs"
              />
            </div>
            <span className="text-[14px] font-medium">°</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={latitudeDMS?.degree || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">°</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={latitudeDMS?.minutes || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">'</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={latitudeDMS?.seconds || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">"</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={latitudeDMS?.direction || ""}
              readOnly
              className="h-[22px] w-[45px] rounded border px-1 text-xs"
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
              className="h-[22px] w-[85px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">°</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={longitudeDMS?.degree || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">°</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={longitudeDMS?.minutes || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">'</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={longitudeDMS?.seconds || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">"</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={longitudeDMS?.direction || ""}
              readOnly
              className="h-[22px] w-[45px] rounded border px-1 text-xs"
            />
          </div>
        </div>
      </div>
      <div className="bg-primary h-px w-full" />
      <div className="px-2 py-1 text-[#3F3E3E]">
        <h2 className="mb-2 text-xs font-normal">Buffer Dimension</h2>
        <p className="mb-2 text-[10px] text-gray-500">
          Choose a shape and specify its dimensions. The buffer will be centered on the coordinates
          above.
        </p>
        <div className="mb-2 flex flex-col items-center gap-2">
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
                  <label className="w-[75px] font-medium text-gray-700">Side</label>

                  <input
                    type="number"
                    value={sideLength}
                    onChange={(e) => {
                      if (decimalRegex.test(e.target.value)) {
                        setSideLength(e.target.value);
                      }
                    }}
                    className="focus:border-primary h-[22px] w-[75px] rounded border border-gray-300 px-1 text-xs outline-none"
                  />

                  <span className="text-gray-500">km</span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-[75px] font-medium text-gray-700">Area</label>

                  <input
                    readOnly
                    value={area}
                    className="h-[22px] w-[75px] rounded border border-gray-200 bg-gray-50 px-1 text-xs text-gray-600"
                  />

                  <span className="text-gray-500">sq km</span>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-[75px_75px_auto] items-center gap-2">
                  <label className="font-medium text-gray-700">Width</label>

                  <input
                    type="number"
                    value={width}
                    onChange={(e) => {
                      if (decimalRegex.test(e.target.value)) {
                        setWidth(e.target.value);
                      }
                    }}
                    className="focus:border-primary h-[22px] w-[75px] rounded border border-gray-300 px-1 text-xs outline-none"
                  />

                  <span className="text-gray-500">km</span>
                </div>

                <div className="grid grid-cols-[75px_75px_auto] items-center gap-2">
                  <label className="font-medium text-gray-700">Height</label>

                  <input
                    type="number"
                    value={height}
                    onChange={(e) => {
                      if (decimalRegex.test(e.target.value)) {
                        setHeight(e.target.value);
                      }
                    }}
                    className="focus:border-primary h-[22px] w-[75px] rounded border border-gray-300 px-1 text-xs outline-none"
                  />

                  <span className="text-gray-500">km</span>
                </div>

                <div className="grid grid-cols-[75px_75px_auto] items-center gap-2">
                  <label className="font-medium text-gray-700">Area</label>

                  <input
                    readOnly
                    value={area}
                    className="h-[22px] w-[75px] rounded border border-gray-200 bg-gray-50 px-1 text-xs text-gray-600"
                  />

                  <span className="text-gray-500">sq km</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 rounded border border-blue-200 bg-blue-50 px-2 py-1">
        <p className="text-[10px] text-blue-700">
          <strong>Tip:</strong> Latitude must be between <b>-90</b> and <b>90</b>, longitude between{" "}
          <b>-180</b> and <b>180</b>. Click <b>Draw</b> to create the buffer on the map.
        </p>
      </div>
      <div className="flex items-center space-x-2 pt-1">
        <button
          type="button"
          onClick={handleReset}
          className="flex-1 cursor-pointer rounded-full border-none bg-gray-100 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 cursor-pointer rounded-full border-none bg-gray-100 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!isValidCenterBuffer}
          onClick={handlePlot}
          className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors ${
            isValidCenterBuffer
              ? "bg-primary hover:bg-primary/90 cursor-pointer text-white"
              : "cursor-not-allowed bg-gray-200 text-gray-400"
          }`}
        >
          Draw
        </button>
      </div>
    </>
  );
};

export default CenterCoordinates;
