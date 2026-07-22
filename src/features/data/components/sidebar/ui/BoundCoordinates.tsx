import React from "react";

interface BoundCoordinatesProps {
  upperLeft: {
    latitude: string;
    longitude: string;
  };

  lowerRight: {
    latitude: string;
    longitude: string;
  };

  setUpperLeft: React.Dispatch<
    React.SetStateAction<{
      latitude: string;
      longitude: string;
    }>
  >;

  setLowerRight: React.Dispatch<
    React.SetStateAction<{
      latitude: string;
      longitude: string;
    }>
  >;

  upperLeftLatDMS: any;
  upperLeftLonDMS: any;

  lowerRightLatDMS: any;
  lowerRightLonDMS: any;

  decimalRegex: RegExp;

  isValidBound: boolean;

  handleReset: () => void;
  handlePlotBound: () => void;
  onConfirm: () => void;
}

const BoundCoordinates: React.FC<BoundCoordinatesProps> = ({
  upperLeft,
  lowerRight,

  setUpperLeft,
  setLowerRight,

  upperLeftLatDMS,
  upperLeftLonDMS,

  lowerRightLatDMS,
  lowerRightLonDMS,

  decimalRegex,

  isValidBound,

  handleReset,
  handlePlotBound,
  onConfirm,
}) => {
  return (
    <>
      <div className="px-2 py-1 text-[#3F3E3E]">
        <h2 className="mb-2 text-xs font-normal">Upper Left</h2>

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
                value={upperLeft.latitude}
                onChange={(e) => {
                  const value = e.target.value;

                  if (decimalRegex.test(value)) {
                    setUpperLeft((prev) => ({
                      ...prev,
                      latitude: value,
                    }));
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
              value={upperLeftLatDMS?.degree || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">°</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={upperLeftLatDMS?.minutes || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">'</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={upperLeftLatDMS?.seconds || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">"</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={upperLeftLatDMS?.direction || ""}
              readOnly
              className="h-[22px] w-[45px] rounded border px-1 text-xs"
            />
          </div>

          {/* Longitude */}
          <div className="text-[11px] font-bold">Longitude</div>

          <div className="flex items-center gap-1">
            <input
              value={upperLeft.longitude}
              onChange={(e) => {
                const value = e.target.value;

                if (decimalRegex.test(value)) {
                  setUpperLeft((prev) => ({
                    ...prev,
                    longitude: value,
                  }));
                }
              }}
              inputMode="decimal"
              className="h-[22px] w-[85px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">°</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={upperLeftLonDMS?.degree || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">°</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={upperLeftLonDMS?.minutes || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">'</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={upperLeftLonDMS?.seconds || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">"</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={upperLeftLonDMS?.direction || ""}
              readOnly
              className="h-[22px] w-[45px] rounded border px-1 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="bg-primary h-px w-full" />

      <div className="px-2 py-1 text-[#3F3E3E]">
        <h2 className="mb-2 text-xs font-normal">Lower Right </h2>

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
                value={lowerRight.latitude}
                onChange={(e) => {
                  const value = e.target.value;

                  if (decimalRegex.test(value)) {
                    setLowerRight((prev) => ({
                      ...prev,
                      latitude: value,
                    }));
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
              value={lowerRightLatDMS?.degree || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">°</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={lowerRightLatDMS?.minutes || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">'</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={lowerRightLatDMS?.seconds || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">"</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={lowerRightLatDMS?.direction || ""}
              readOnly
              className="h-[22px] w-[45px] rounded border px-1 text-xs"
            />
          </div>

          {/* Longitude */}
          <div className="text-[11px] font-bold">Longitude</div>

          <div className="flex items-center gap-1">
            <input
              value={lowerRight.longitude}
              onChange={(e) => {
                const value = e.target.value;

                if (decimalRegex.test(value)) {
                  setLowerRight((prev) => ({
                    ...prev,
                    longitude: value,
                  }));
                }
              }}
              inputMode="decimal"
              className="h-[22px] w-[85px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">°</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={lowerRightLonDMS?.degree || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">°</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={lowerRightLonDMS?.minutes || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">'</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={lowerRightLonDMS?.seconds || ""}
              readOnly
              className="h-[22px] w-[55px] rounded border px-1 text-xs"
            />
            <span className="text-[14px] font-medium">"</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              value={lowerRightLonDMS?.direction || ""}
              readOnly
              className="h-[22px] w-[45px] rounded border px-1 text-xs"
            />
          </div>
        </div>
      </div>
      <div className="mt-2 rounded-md bg-gray-50 px-2 py-2 text-[10px] text-[#555]">
        <div className="mb-1 text-[11px] font-semibold">Coordinate Entry Guidelines:</div>

        <ul className="list-disc space-y-0.5 pl-4">
          <li>
            Enter coordinates in <b>Decimal Degree (DD)</b> format. Example: <b>23.55</b>
          </li>

          <li>
            <b>Upper Left</b> should represent the top-left corner of the area.
          </li>

          <li>
            <b>Lower Right</b> should represent the bottom-right corner of the area.
          </li>

          <li>
            Upper Left Latitude must be <b>greater</b> than Lower Right Latitude.
            <br />
            Example: 23.55 (UL) &gt; 20.55 (LR)
          </li>

          <li>
            Upper Left Longitude must be <b>less</b> than Lower Right Longitude.
            <br />
            Example: 73.55 (UL) &lt; 78.55 (LR)
          </li>

          <li>
            Latitude range: <b>-90 to 90</b>
          </li>

          <li>
            Longitude range: <b>-180 to 180</b>
          </li>

          <li>
            Negative values are allowed:
            <br />
            Latitude: -23.55 = South (S)
            <br />
            Longitude: -73.55 = West (W)
          </li>
        </ul>
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
          disabled={!isValidBound}
          onClick={handlePlotBound}
          className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors ${
            isValidBound
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

export default BoundCoordinates;
