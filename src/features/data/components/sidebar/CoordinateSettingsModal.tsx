import * as turf from "@turf/turf";
import { toast } from "react-toastify";
import { useState } from "react";
import { useMapOptions } from "../../hooks/useMapOptions";
import BoundCoordinates from "./ui/BoundCoordinates";
import CenterCoordinates from "./ui/CenterCoordinates";

interface CoordinateSettingsModalProps {
  onConfirm: () => void;
}
// Supports decimal and DMS coordinates

const parseCoordinate = (
  value: string,
  type: CoordinateType
): number | null => {
  const input = value.trim().toUpperCase();

  if (!input) return null;

  // Decimal degrees: 26.507408 or -26.507408
  if (/^-?\d+(\.\d+)?$/.test(input)) {
    const decimal = Number(input);
    const max = type === "lat" ? 90 : 180;

    return Math.abs(decimal) <= max ? decimal : null;
  }

  // DMS: 26°30'26.67"N
  // Also supports: 26 30 26.67 N
  const match = input.match(
    /^(\d{1,3})\s*°?\s*(\d{1,2})\s*['′]?\s*(\d{1,2}(?:\.\d+)?)?\s*["″]?\s*([NSEW])$/
  );

  if (!match) return null;

  const degrees = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  const direction = match[4];

  if (minutes >= 60 || seconds >= 60) return null;

  if (
    (type === "lat" && !["N", "S"].includes(direction)) ||
    (type === "long" && !["E", "W"].includes(direction))
  ) {
    return null;
  }

  const max = type === "lat" ? 90 : 180;

  if (
    degrees > max ||
    (degrees === max && (minutes > 0 || seconds > 0))
  ) {
    return null;
  }

  let result = degrees + minutes / 60 + seconds / 3600;

  if (direction === "S" || direction === "W") {
    result *= -1;
  }

  return result;
};


type CoordinateType = "lat" | "long";
type Tab = "centercoordinates" | "boundcoordinates";
export interface DMS {
  degree: number | string;
  minutes: number | string;
  seconds: number | string;
  direction: string;
}

export const CoordinateSettingsModal: React.FC<CoordinateSettingsModalProps> = ({ onConfirm }) => {
  const { setPlotCoordinates, setPlotBoundCoordinates } = useMapOptions();
  const [selectedTab, setselectedTab] = useState<Tab>("centercoordinates");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [sideLength, setSideLength] = useState<string>("5");
  const [width, setWidth] = useState<string>("5");
  const [height, setHeight] = useState<string>("10");
  const [shapeType, setShapeType] = useState<"Square" | "Rectangle">("Square");
  const isRectangle = shapeType === "Rectangle";
  const [upperLeft, setUpperLeft] = useState({
    latitude: "",
    longitude: "",
  });
  const [lowerRight, setLowerRight] = useState({
    latitude: "",
    longitude: "",
  });
  const side = Number(sideLength);
  const rectWidth = Number(width);
  const rectHeight = Number(height);
  const decimalRegex = /^-?\d*\.?\d*$/;

  
 
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

    let direction: string;
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
  const [dmsDrafts, setDmsDrafts] = useState<{
    lat: Partial<DMS>;
    long: Partial<DMS>;
  }>({
    lat: {},
    long: {},
  });

  const getDMS = (value: string, type: CoordinateType) => {
    if (!value.trim()) return null;

    const decimal = parseCoordinate(value, type);

    return decimal !== null ? convertToDMS(decimal, type) : null;
  };

  const handleDecimalChange = (value: string, type: CoordinateType) => {
    // Clear draft when decimal input changes
    setDmsDrafts((prev) => ({ ...prev, [type]: {} }));
    if (type === "lat") {
      setLatitude(value);
    } else {
      setLongitude(value);
    }
  };

  const handleDMSChange = (
    field: keyof DMS,
    val: string,
    type: CoordinateType
  ) => {
    const computedDMS =
      type === "lat"
        ? (latitudeDMS ?? { degree: "", minutes: "", seconds: "", direction: "N" })
        : (longitudeDMS ?? { degree: "", minutes: "", seconds: "", direction: "E" });

    const newDraft = {
      ...computedDMS,
      ...dmsDrafts[type],
      [field]: val,
    };

    setDmsDrafts((prev) => ({ ...prev, [type]: newDraft }));

    const degStr = String(newDraft.degree ?? "");
    const minStr = String(newDraft.minutes ?? "");
    const secStr = String(newDraft.seconds ?? "");
    const dir = String(newDraft.direction || (type === "lat" ? "N" : "E"));

    if (degStr === "" && minStr === "" && secStr === "") {
      if (type === "lat") setLatitude("");
      else setLongitude("");
      return;
    }

    const deg = Number(degStr) || 0;
    const min = Number(minStr) || 0;
    const sec = Number(secStr) || 0;

    let decimal = deg + min / 60 + sec / 3600;
    if (dir === "S" || dir === "W") {
      decimal *= -1;
    }

    const max = type === "lat" ? 90 : 180;
    if (Math.abs(decimal) <= max) {
      const formatted = Number(decimal.toFixed(6)).toString();
      if (type === "lat") setLatitude(formatted);
      else setLongitude(formatted);
    }
  };
  // const handlePlot = () => {
  //   if (!latitude.trim() || !longitude.trim()) {
  //     toast.error("Please enter latitude and longitude.");
  //     return;
  //   }

  //   const lat = parseCoordinate(latitude, "lat");
  //   const lon = parseCoordinate(longitude, "long");

  //   if (lat === null || lon === null) {
  //     toast.error("Enter valid decimal or DMS coordinates.");
  //     return;
  //   }

  //   if (Number.isNaN(lat) || Number.isNaN(lon)) {
  //     toast.error("Enter valid coordinates.");
  //     return;
  //   }

  //   if (lat < -90 || lat > 90) {
  //     toast.error("Latitude must be between -90 and 90.");
  //     return;
  //   }

  //   if (lon < -180 || lon > 180) {
  //     toast.error("Longitude must be between -180 and 180.");
  //     return;
  //   }

  //   let finalWidth: number;
  //   let finalHeight: number;

  //   if (shapeType === "Square") {
  //     if (!sideLength.trim()) {
  //       toast.error("Enter side length.");
  //       return;
  //     }

  //     if (Number.isNaN(side) || side <= 0) {
  //       toast.error("Enter valid side length.");
  //       return;
  //     }

  //     finalWidth = side;
  //     finalHeight = side;
  //   } else {
  //     if (!width.trim() || !height.trim()) {
  //       toast.error("Enter width and height.");
  //       return;
  //     }

  //     if (
  //       Number.isNaN(rectWidth) ||
  //       Number.isNaN(rectHeight) ||
  //       rectWidth <= 0 ||
  //       rectHeight <= 0
  //     ) {
  //       toast.error("Enter valid rectangle dimensions.");
  //       return;
  //     }

  //     finalWidth = rectWidth;
  //     finalHeight = rectHeight;
  //   }

  //   setPlotCoordinates({
  //     lat,
  //     lon,
  //     shape: shapeType,
  //     width: finalWidth,
  //     height: finalHeight,
  //     area: finalWidth * finalHeight,
  //   });
  // };


  const handlePlot = () => {
    const lat = parseCoordinate(latitude, "lat");
    const lon = parseCoordinate(longitude, "long");

    if (lat === null || lon === null) {
      toast.error("Enter valid latitude and longitude in DD or DMS format.");
      return;
    }

    let finalWidth: number;
    let finalHeight: number;

    if (shapeType === "Square") {
      if (!sideLength.trim() || !Number.isFinite(side) || side <= 0) {
        toast.error("Enter valid side length.");
        return;
      }

      finalWidth = side;
      finalHeight = side;
    } else {
      if (
        !width.trim() ||
        !height.trim() ||
        !Number.isFinite(rectWidth) ||
        !Number.isFinite(rectHeight) ||
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




  const handlePlotBound = () => {
    if (
      !upperLeft.latitude.trim() ||
      !upperLeft.longitude.trim() ||
      !lowerRight.latitude.trim() ||
      !lowerRight.longitude.trim()
    ) {
      toast.error("Please enter all bound coordinates.");
      return;
    }

    const ulLat = Number(upperLeft.latitude);
    const ulLon = Number(upperLeft.longitude);
    const lrLat = Number(lowerRight.latitude);
    const lrLon = Number(lowerRight.longitude);

    if (Number.isNaN(ulLat) || Number.isNaN(ulLon) || Number.isNaN(lrLat) || Number.isNaN(lrLon)) {
      toast.error("Enter valid bound coordinates.");
      return;
    }

    if (ulLat < -90 || ulLat > 90 || lrLat < -90 || lrLat > 90) {
      toast.error("Latitude must be between -90 and 90.");
      return;
    }

    if (ulLon < -180 || ulLon > 180 || lrLon < -180 || lrLon > 180) {
      toast.error("Longitude must be between -180 and 180.");
      return;
    }

    // Validate rectangle direction
    if (ulLat < lrLat) {
      toast.error("Upper Left latitude must be greater than Lower Right latitude.");
      return;
    }

    if (ulLon > lrLon) {
      toast.error("Upper Left longitude must be less than Lower Right longitude.");
      return;
    }

    setPlotBoundCoordinates({
      upperLeft: {
        lat: ulLat,
        lon: ulLon,
      },

      lowerRight: {
        lat: lrLat,
        lon: lrLon,
      },

      area: calculateBoundArea(),
    });
  };
  const handleReset = () => {
    setDmsDrafts({ lat: {}, long: {} });
    setLatitude("");
    setLongitude("");

    setSideLength("5");
    setWidth("5");
    setHeight("10");

    setShapeType("Square");

    setUpperLeft({
      latitude: "",
      longitude: "",
    });

    setLowerRight({
      latitude: "",
      longitude: "",
    });
  };
  const calculateBoundArea = () => {
    const ulLat = Number(upperLeft.latitude);
    const ulLon = Number(upperLeft.longitude);
    const lrLat = Number(lowerRight.latitude);
    const lrLon = Number(lowerRight.longitude);

    if (Number.isNaN(ulLat) || Number.isNaN(ulLon) || Number.isNaN(lrLat) || Number.isNaN(lrLon)) {
      return 0;
    }

    const polygon = turf.polygon([
      [
        [ulLon, ulLat],
        [lrLon, ulLat],
        [lrLon, lrLat],
        [ulLon, lrLat],
        [ulLon, ulLat],
      ],
    ]);
    const area = turf.area(polygon) / 1000000; // m² to km²

    return Number(area.toFixed(2));
  };
  const area = shapeType === "Square" ? side * side : rectWidth * rectHeight;
  const baseLatitudeDMS = getDMS(latitude, "lat");
  const baseLongitudeDMS = getDMS(longitude, "long");

  const latitudeDMS: DMS | null =
    baseLatitudeDMS || dmsDrafts.lat.degree !== undefined
      ? ({
          degree: dmsDrafts.lat.degree ?? baseLatitudeDMS?.degree ?? "",
          minutes: dmsDrafts.lat.minutes ?? baseLatitudeDMS?.minutes ?? "",
          seconds: dmsDrafts.lat.seconds ?? baseLatitudeDMS?.seconds ?? "",
          direction: dmsDrafts.lat.direction ?? baseLatitudeDMS?.direction ?? "N",
        } as DMS)
      : null;

  const longitudeDMS: DMS | null =
    baseLongitudeDMS || dmsDrafts.long.degree !== undefined
      ? ({
          degree: dmsDrafts.long.degree ?? baseLongitudeDMS?.degree ?? "",
          minutes: dmsDrafts.long.minutes ?? baseLongitudeDMS?.minutes ?? "",
          seconds: dmsDrafts.long.seconds ?? baseLongitudeDMS?.seconds ?? "",
          direction: dmsDrafts.long.direction ?? baseLongitudeDMS?.direction ?? "E",
        } as DMS)
      : null;

  const upperLeftLatDMS = getDMS(upperLeft.latitude, "lat");
  const upperLeftLonDMS = getDMS(upperLeft.longitude, "long");
  const lowerRightLatDMS = getDMS(lowerRight.latitude, "lat");
  const lowerRightLonDMS = getDMS(lowerRight.longitude, "long");
  const isValidBound: boolean =
    !!upperLeft.latitude &&
    !!upperLeft.longitude &&
    !!lowerRight.latitude &&
    !!lowerRight.longitude &&
    Number(upperLeft.latitude) >= Number(lowerRight.latitude) &&
    Number(upperLeft.longitude) <= Number(lowerRight.longitude);

  const isValidCenterBuffer =
    parseCoordinate(latitude, "lat") !== null &&
    parseCoordinate(longitude, "long") !== null &&
    (shapeType === "Square"
      ? sideLength.trim() !== "" && Number(sideLength) > 0
      : width.trim() !== "" &&
      height.trim() !== "" &&
      Number(width) > 0 &&
      Number(height) > 0);


  return (
    <div className="pointer-events-auto absolute top-20 left-full z-50 ml-0 flex w-120 flex-col space-y-3 rounded-lg border border-gray-200 bg-white p-4 text-left shadow-xl">
      <div className="border-b border-gray-100 pb-1.5 text-[13px] font-bold text-gray-800 select-none">
        Draw Rectangle by Coordinates
      </div>

      <div className="flex items-center space-x-2">
        <button
          className={`border-b-2 px-3 py-2 text-xs font-semibold transition-colors duration-200 ${selectedTab === "centercoordinates"
            ? "border-primary text-primary"
            : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          onClick={() => setselectedTab("centercoordinates")}
        >
          Center Coordinates
        </button>

        <button
          className={`border-b-2 px-3 py-2 text-xs font-semibold transition-colors duration-200 ${selectedTab === "boundcoordinates"
            ? "border-primary text-primary"
            : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          onClick={() => setselectedTab("boundcoordinates")}
        >
          Bound Coordinates
        </button>
      </div>

      {selectedTab === "centercoordinates" && (
        <CenterCoordinates
          latitude={latitude}
          longitude={longitude}
          latitudeDMS={latitudeDMS}
          longitudeDMS={longitudeDMS}
          onDecimalChange={handleDecimalChange}
          onDMSChange={handleDMSChange}
          decimalRegex={decimalRegex}
          shapeType={shapeType}
          setShapeType={setShapeType}
          isRectangle={isRectangle}
          setLatitude={setLatitude}
          setLongitude={setLongitude}
          sideLength={sideLength}
          setSideLength={setSideLength}
          width={width}
          setWidth={setWidth}
          height={height}
          setHeight={setHeight}
          area={area}
          isValidCenterBuffer={isValidCenterBuffer}
          handleReset={handleReset}
          handlePlot={handlePlot}
          onConfirm={onConfirm}
        />
      )}
      {selectedTab === "boundcoordinates" && (
        <BoundCoordinates
          upperLeft={upperLeft}
          lowerRight={lowerRight}
          setUpperLeft={setUpperLeft}
          setLowerRight={setLowerRight}
          upperLeftLatDMS={upperLeftLatDMS}
          upperLeftLonDMS={upperLeftLonDMS}
          lowerRightLatDMS={lowerRightLatDMS}
          lowerRightLonDMS={lowerRightLonDMS}
          decimalRegex={decimalRegex}
          isValidBound={isValidBound}
          handleReset={handleReset}
          handlePlotBound={handlePlotBound}
          onConfirm={onConfirm}
        />
      )}
    </div>
  );
};
