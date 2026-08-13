import { useMapStore } from "../store/useMapStore";

export default function MapTypeToggle() {
    const maptype = useMapStore((state) => state.Maptype);
    const setMaptype = useMapStore((state) => state.setMaptype);

    return (
        <div className="flex items-center gap-1 px-4 py-2">
            {/* 3D — LEFT */}
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

            {/* 2D — RIGHT */}
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
        </div>
    );
}