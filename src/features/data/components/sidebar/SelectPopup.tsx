import React, { useState, useRef, useEffect } from "react";
import { 
  Trash2, 
  Eye, 
  EyeOff, 
  Crosshair, 
  MoreVertical, 
  X, 
  Check, 
  ChevronDown,
  Edit2,
  FileJson,
  FileCode
} from "lucide-react";
import { useLayersStore } from "../../../../store/useLayersStore";
import type { DrawnLayer } from "../../../../store/useLayersStore";
import { useMapStore } from "../../store/useMapStore";
import { exportLayersAsGeoJSON, exportLayersAsKML, exportLayersAsCSV } from "../../../../utils/exportUtils";
import { toast } from "react-toastify";

interface SelectPopupProps {
  onClose: () => void;
}

export const SelectPopup: React.FC<SelectPopupProps> = ({ onClose }) => {
  const layers = useLayersStore((state) => state.layers);
  const removeLayer = useLayersStore((state) => state.removeLayer);
  const clearLayers = useLayersStore((state) => state.clearLayers);
  const toggleLayerVisibility = useLayersStore((state) => state.toggleLayerVisibility);
  const updateLayerLabel = useLayersStore((state) => state.updateLayerLabel);

  const selectedLayerId = useMapStore((state) => state.selectedLayerId);
  const setSelectedLayerId = useMapStore((state) => state.setSelectedLayerId);
  const setFitLayerId = useMapStore((state) => state.setFitLayerId);

  // States
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [activeMenuLayerId, setActiveMenuLayerId] = useState<string | null>(null);
  const [activeMenuPosition, setActiveMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const layerMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsExportDropdownOpen(false);
      }
      if (
        layerMenuRef.current &&
        !layerMenuRef.current.contains(event.target as Node)
      ) {
        setActiveMenuLayerId(null);
        setActiveMenuPosition(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggleMenu = (e: React.MouseEvent, layerId: string) => {
    e.stopPropagation();
    if (activeMenuLayerId === layerId) {
      setActiveMenuLayerId(null);
      setActiveMenuPosition(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const parentEl = e.currentTarget.closest(".select-popup-modal");
      const parentRect = parentEl?.getBoundingClientRect();
      if (parentRect) {
        setActiveMenuPosition({
          top: rect.bottom - parentRect.top,
          right: parentRect.right - rect.right,
        });
        setActiveMenuLayerId(layerId);
      }
    }
  };

  const handleExportAll = (format: "geojson" | "kml" | "kmz" | "shapefile" | "csv") => {
    if (layers.length === 0) {
      toast.error("No layers available to export");
      return;
    }
    switch (format) {
      case "geojson":
        exportLayersAsGeoJSON(layers);
        toast.success("Exported all layers as GeoJSON");
        break;
      case "kml":
        exportLayersAsKML(layers);
        toast.success("Exported all layers as KML");
        break;
      case "kmz":
        toast.info("KMZ export is zipped on the server. Downloading standard KML format instead.");
        exportLayersAsKML(layers);
        break;
      case "shapefile":
        toast.info("Shapefile export requires backend compilation. Downloading standard GeoJSON format instead.");
        exportLayersAsGeoJSON(layers);
        break;
      case "csv":
        exportLayersAsCSV(layers);
        toast.success("Exported all layers metadata as CSV");
        break;
    }
    setIsExportDropdownOpen(false);
  };

  const handleExportSingle = (layer: DrawnLayer, format: "geojson" | "kml") => {
    if (format === "geojson") {
      exportLayersAsGeoJSON([layer]);
      toast.success(`Exported ${layer.label} as GeoJSON`);
    } else {
      exportLayersAsKML([layer]);
      toast.success(`Exported ${layer.label} as KML`);
    }
    setActiveMenuLayerId(null);
  };

  const handleStartRename = (layer: DrawnLayer) => {
    setEditingLayerId(layer.id);
    setRenameValue(layer.label);
    setActiveMenuLayerId(null);
  };

  const handleSaveRename = (id: string) => {
    if (!renameValue.trim()) {
      toast.error("Label cannot be empty");
      return;
    }
    updateLayerLabel(id, renameValue.trim());
    toast.success("Layer renamed successfully");
    setEditingLayerId(null);
  };

  const handleClearAll = () => {
    if (layers.length === 0) return;
    if (window.confirm("Are you sure you want to delete all plotted layers?")) {
      clearLayers();
      setSelectedLayerId(null);
      toast.success("All layers cleared");
    }
  };

  return (
    <div className="select-popup-modal absolute left-full -top-24 ml-3 w-[calc(100vw-70px)] max-w-[380px] sm:w-[350px] md:w-[380px] bg-white border border-gray-200 shadow-2xl rounded-lg py-3.5 px-4 z-50 flex flex-col pointer-events-auto text-left select-none">
      {/* Header section */}
      <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 flex-shrink-0">
        <h3 className="text-sm sm:text-base font-semibold text-gray-800">
          Selected AOI
        </h3>
        
        <div className="flex items-center gap-2.5">
          {/* Delete All Action */}
          <button
            onClick={handleClearAll}
            disabled={layers.length === 0}
            className={`p-1.5 rounded-md transition-colors cursor-pointer focus:outline-none ${
              layers.length === 0
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-500 hover:text-red-600 hover:bg-red-50"
            }`}
            title="Clear all layers"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Export All Action */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              disabled={layers.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-[13px] font-semibold transition-all focus:outline-none ${
                layers.length === 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-100"
                  : "bg-primary text-white hover:bg-primary/95 border border-primary cursor-pointer shadow-sm"
              }`}
            >
              <span>Export all</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 shadow-2xl rounded-md py-1.5 z-[60]">
                <button
                  onClick={() => handleExportAll("kml")}
                  className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer font-medium"
                >
                  Export as KML
                </button>
                <button
                  onClick={() => handleExportAll("kmz")}
                  className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer font-medium"
                >
                  Export as KMZ
                </button>
                <button
                  onClick={() => handleExportAll("shapefile")}
                  className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer font-medium"
                >
                  Export as Shapefile
                </button>
                <button
                  onClick={() => handleExportAll("geojson")}
                  className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer font-medium"
                >
                  Export as GeoJSON
                </button>
                <button
                  onClick={() => handleExportAll("csv")}
                  className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer font-medium"
                >
                  Export as CSV
                </button>
              </div>
            )}
          </div>

          {/* Close Popup */}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Layer List Section */}
      <div className="mt-3.5 max-h-[220px] overflow-y-auto pr-0.5 space-y-1.5">
        {layers.length === 0 ? (
          <div className="py-8 text-center text-xs sm:text-sm text-gray-400 flex flex-col items-center justify-center gap-2">
            <span>No areas of interest (AOIs) plotted.</span>
            <span className="text-[11px] text-gray-300">Use Draw or Import to add layers.</span>
          </div>
        ) : (
          layers.map((layer) => {
            const isSelected = selectedLayerId === layer.id;
            const isEditing = editingLayerId === layer.id;
            const isMenuOpen = activeMenuLayerId === layer.id;
            const isVisible = layer.visible !== false;

            return (
              <div
                key={layer.id}
                onClick={() => setSelectedLayerId(isSelected ? null : layer.id)}
                style={{ position: "relative", zIndex: isMenuOpen ? 999 : 1 }}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-colors border cursor-pointer ${
                  isSelected
                    ? "bg-[#add3d3] border-[#add3d3] text-black shadow-sm"
                    : "bg-white hover:bg-[#d5ebeb]/40 border-gray-100 text-gray-700 hover:border-gray-200"
                }`}
              >
                {/* Layer Name / Edit Field */}
                <div className="flex-1 min-w-0 mr-2" onClick={(e) => isEditing && e.stopPropagation()}>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(layer.id);
                          if (e.key === "Escape") setEditingLayerId(null);
                        }}
                        className="w-full bg-white border border-primary/30 rounded px-2 py-0.5 text-xs text-gray-800 focus:outline-none focus:border-primary font-medium"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveRename(layer.id)}
                        className="p-1 bg-green-50 text-green-600 hover:bg-green-100 rounded transition-colors cursor-pointer"
                        title="Save rename"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingLayerId(null)}
                        className="p-1 bg-gray-50 text-gray-400 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col text-left">
                      <span className="text-xs sm:text-[13px] font-semibold truncate leading-tight">
                        {layer.label}
                      </span>
                      {layer.area !== undefined && (
                        <span className="text-[10px] opacity-75 mt-0.5 leading-none font-medium">
                          {layer.area.toFixed(2)} sqkm
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Layer Control Icons */}
                {!isEditing && (
                  <div className="flex items-center gap-1 sm:gap-1.5 opacity-85 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                    {/* Visibility Toggle */}
                    <button
                      onClick={() => toggleLayerVisibility(layer.id)}
                      className={`p-1.5 rounded hover:bg-black/5 transition-colors cursor-pointer ${
                        isVisible ? "text-gray-600 hover:text-black" : "text-gray-300 hover:text-gray-400"
                      }`}
                      title={isVisible ? "Hide layer" : "Show layer"}
                    >
                      {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    {/* Zoom / Center Layer */}
                    <button
                      onClick={() => setFitLayerId(layer.id)}
                      className="p-1.5 rounded hover:bg-black/5 text-gray-600 hover:text-black transition-colors cursor-pointer"
                      title="Zoom to layer"
                    >
                      <Crosshair className="w-4 h-4" />
                    </button>

                    {/* Delete Layer */}
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete layer "${layer.label}"?`)) {
                          removeLayer(layer.id);
                          if (isSelected) setSelectedLayerId(null);
                        }
                      }}
                      className="p-1.5 rounded hover:bg-black/5 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                      title="Delete layer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Actions Ellipsis Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => handleToggleMenu(e, layer.id)}
                        className={`p-1.5 rounded hover:bg-black/5 transition-colors cursor-pointer ${
                          isMenuOpen ? "text-black bg-black/5" : "text-gray-500 hover:text-black"
                        }`}
                        title="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Dynamic Absolute 3-Dot Dropdown overlaying the whole modal */}
      {activeMenuLayerId && activeMenuPosition && (
        <div
          ref={layerMenuRef}
          style={{
            position: "absolute",
            top: `${activeMenuPosition.top}px`,
            right: `${activeMenuPosition.right}px`,
            zIndex: 1000,
          }}
          className="w-36 bg-white border border-gray-200 shadow-2xl rounded-md py-1"
        >
          <button
            onClick={() => {
              const layer = layers.find((l) => l.id === activeMenuLayerId);
              if (layer) handleStartRename(layer);
            }}
            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors flex items-center gap-2 cursor-pointer font-medium"
          >
            <Edit2 className="w-3.5 h-3.5 text-gray-400 mr-2 flex-shrink-0" />
            <span>Rename</span>
          </button>
          <button
            onClick={() => {
              const layer = layers.find((l) => l.id === activeMenuLayerId);
              if (layer) handleExportSingle(layer, "geojson");
            }}
            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors flex items-center gap-2 cursor-pointer font-medium"
          >
            <FileJson className="w-3.5 h-3.5 text-orange-500 mr-2 flex-shrink-0" />
            <span>Export GeoJSON</span>
          </button>
          <button
            onClick={() => {
              const layer = layers.find((l) => l.id === activeMenuLayerId);
              if (layer) handleExportSingle(layer, "kml");
            }}
            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors flex items-center gap-2 cursor-pointer font-medium"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-500 mr-2 flex-shrink-0" />
            <span>Export KML</span>
          </button>
        </div>
      )}
    </div>
  );
};
export default SelectPopup;
