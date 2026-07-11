import { useState } from "react";
import { toast } from "react-toastify";
import { useMapOptions } from "../../hooks/useMapOptions";
import * as turf from "@turf/turf";
import CenterCoordinates from "./ui/CenterCoordinates";
import BoundCoordinates from "./ui/BoundCoordinates";

interface CoordinateSettingsModalProps {
  onConfirm: () => void;
}

type CoordinateType = "lat" | "long";
type Tab = "centercoordinates" | "boundcoordinates";
interface DMS {
  degree: number;
  minutes: number;
  seconds: number;
  direction: string;
}

export const CoordinateSettingsModal: React.FC<
  CoordinateSettingsModalProps
> = ({ onConfirm }) => {
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
  const getDMS = (value: string, type: CoordinateType) =>
    value ? convertToDMS(Number(value), type) : null;

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

    let finalWidth: number;
    let finalHeight: number;

    if (shapeType === "Square") {
      if (!sideLength.trim()) {
        toast.error("Enter side length.");
        return;
      }

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

    if (
      Number.isNaN(ulLat) ||
      Number.isNaN(ulLon) ||
      Number.isNaN(lrLat) ||
      Number.isNaN(lrLon)
    ) {
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
      toast.error(
        "Upper Left latitude must be greater than Lower Right latitude.",
      );
      return;
    }

    if (ulLon > lrLon) {
      toast.error(
        "Upper Left longitude must be less than Lower Right longitude.",
      );
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

    if (
      Number.isNaN(ulLat) ||
      Number.isNaN(ulLon) ||
      Number.isNaN(lrLat) ||
      Number.isNaN(lrLon)
    ) {
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

  const latitudeDMS = getDMS(latitude, "lat");
  const longitudeDMS = getDMS(longitude, "long");

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
    latitude.trim() !== "" &&
    longitude.trim() !== "" &&
    !Number.isNaN(Number(latitude)) &&
    !Number.isNaN(Number(longitude)) &&
    Number(latitude) >= -90 &&
    Number(latitude) <= 90 &&
    Number(longitude) >= -180 &&
    Number(longitude) <= 180 &&
    (shapeType === "Square"
      ? sideLength.trim() !== "" && Number(sideLength) > 0
      : width.trim() !== "" &&
        height.trim() !== "" &&
        Number(width) > 0 &&
        Number(height) > 0);

  return (
    <div className="absolute left-full top-0 ml-0 bg-white border border-gray-200 p-4 w-120 z-50 flex flex-col space-y-3 pointer-events-auto text-left rounded-lg shadow-xl">
      <div className="text-[13px] text-gray-800 font-bold border-b border-gray-100 pb-1.5 select-none">
        Draw Rectangle by Coordinates
      </div>

      <div className="flex items-center space-x-2">
        <button
          className={`px-3 py-2 text-xs font-semibold transition-colors border-b-2 duration-200 ${
            selectedTab === "centercoordinates"
              ? "border-primary text-primary"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setselectedTab("centercoordinates")}
        >
          Center Coordinates
        </button>

        <button
          className={`px-3 py-2 text-xs font-semibold transition-colors border-b-2 duration-200 ${
            selectedTab === "boundcoordinates"
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
