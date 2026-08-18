import { toast } from "react-toastify";
import MapTypeToggle from "../assests/MapTypeToggle";
import { MAP_LAYERS } from "../config/mapLayers";
import { useMapStore } from "../store/useMapStore";

interface BasemapPopupProps {
  onClose?: () => void;
}

export default function BasemapPopup({ onClose }: BasemapPopupProps) {
  const mapMode = useMapStore((s) => s.mapMode);
  const setMapMode = useMapStore((s) => s.setMapMode);
  const mapType = useMapStore((state) => state.Maptype);
  const setMaptype = useMapStore((state) => state.setMaptype);
  const handleLayerChange = (id: string) => {
    // if (mapType === "3d") {
    //   setMaptype("2d")
    //   toast.success("Map type changed to 2D")
    // }
    setMapMode(id);
    onClose?.();
  };

  return (
    <div className="absolute top-2 left-15 z-50 w-100 rounded-lg border border-gray-200 bg-white p-4 shadow-md">
      <div className="mb-2 text-lg font-semibold">Basemap</div>

      <MapTypeToggle />

      <ul className="space-y-1">
        {MAP_LAYERS.map((layer) => {
          const active = mapMode === layer.id;
          // console.log("mapmode", mapMode,layer)
          return (
            <li key={layer.id}>
              <label
                className={`flex w-full cursor-pointer items-center justify-between rounded px-2 py-2 ${active
                  ? "bg-primary-100 text-primary"
                  : "hover:bg-gray-100"
                  }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="basemap"
                    value={layer.id}
                    checked={active}
                    onChange={() => handleLayerChange(layer.id)}
                    className="h-4 w-4 accent-primary"
                  />

                  <span>{layer.name}</span>
                </span>


              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
