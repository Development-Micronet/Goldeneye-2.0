import { useMapStore } from "../store/useMapStore";

export default function MapTypeToggle() {
    const maptype = useMapStore((state) => state.Maptype);
    const setMaptype = useMapStore((state) => state.setMaptype);

    // const buildingColor = useMapStore((state) => state.buildingColor);
    // const setBuildingColor = useMapStore(
    //     (state) => state.setBuildingColor
    // );

    return (
        <div className="flex items-center gap-2 px-4 py-2">
            {/* 3D */}
            <button
                type="button"
                onClick={() => setMaptype("3d")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${maptype === "3d"
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                    }`}
            >
                3D
            </button>

            {/* 2D */}
            <button
                type="button"
                onClick={() => setMaptype("2d")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${maptype === "2d"
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                    }`}
            >
                2D
            </button>

            {/* Building Color
            {maptype === "3d" && (
                <div className="ml-2 flex items-center gap-2 border-l border-gray-200 pl-3">
                    <span className="text-xs font-semibold text-gray-600">
                        Building
                    </span>

                    <input
                        type="color"
                        value={buildingColor}
                        onChange={(e) =>
                            setBuildingColor(e.target.value)
                        }
                        title="Building color"
                        className="h-7 w-8 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
                    />

                    <span className="font-mono text-[10px] uppercase text-gray-500">
                        {buildingColor}
                    </span>
                </div>
            )} */}
        </div>
    );
}
