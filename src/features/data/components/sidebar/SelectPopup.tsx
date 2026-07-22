import { toast } from "react-toastify";
import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Crosshair,
  Edit2,
  Eye,
  EyeOff,
  FileCode,
  FileJson,
  MoreVertical,
  Trash2,
  X,
} from "lucide-react";
import { useLayersStore } from "../../../../store/useLayersStore";
import type { DrawnLayer } from "../../../../store/useLayersStore";
import {
  exportLayersAsCSV,
  exportLayersAsGeoJSON,
  exportLayersAsKML,
} from "../../../../utils/exportUtils";
import { useMapStore } from "../../store/useMapStore";
import { useSelectedAOIStore } from "../../hooks/useSelectedAOIStore";

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
  const [activeMenuPosition, setActiveMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const layerMenuRef = useRef<HTMLDivElement>(null);
  const {setSelectedAOI} =useSelectedAOIStore()
  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
      if (layerMenuRef.current && !layerMenuRef.current.contains(event.target as Node)) {
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
        toast.info(
          "Shapefile export requires backend compilation. Downloading standard GeoJSON format instead.",
        );
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
    <div className="select-popup-modal pointer-events-auto absolute -top-24 left-full z-50 ml-3 flex w-[calc(100vw-70px)] max-w-[380px] flex-col rounded-lg border border-gray-200 bg-white px-4 py-3.5 text-left shadow-2xl select-none sm:w-[350px] md:w-[380px]">
      {/* Header section */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 pb-3.5">
        <h3 className="text-sm font-semibold text-gray-800 sm:text-base">Selected AOI</h3>

        <div className="flex items-center gap-2.5">
          {/* Delete All Action */}
          <button
            onClick={handleClearAll}
            disabled={layers.length === 0}
            className={`cursor-pointer rounded-md p-1.5 transition-colors focus:outline-none ${
              layers.length === 0
                ? "cursor-not-allowed text-gray-300"
                : "text-gray-500 hover:bg-red-50 hover:text-red-600"
            }`}
            title="Clear all layers"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          {/* Export All Action */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              disabled={layers.length === 0}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none sm:text-[13px] ${
                layers.length === 0
                  ? "cursor-not-allowed border border-gray-100 bg-gray-100 text-gray-400"
                  : "bg-primary hover:bg-primary/95 border-primary cursor-pointer border text-white shadow-sm"
              }`}
            >
              <span>Export all</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${isExportDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 z-[60] mt-1 w-44 rounded-md border border-gray-200 bg-white py-1.5 shadow-2xl">
                <button
                  onClick={() => handleExportAll("kml")}
                  className="hover:text-primary w-full cursor-pointer px-4 py-2 text-left text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Export as KML
                </button>
                <button
                  onClick={() => handleExportAll("kmz")}
                  className="hover:text-primary w-full cursor-pointer px-4 py-2 text-left text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Export as KMZ
                </button>
                <button
                  onClick={() => handleExportAll("shapefile")}
                  className="hover:text-primary w-full cursor-pointer px-4 py-2 text-left text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Export as Shapefile
                </button>
                <button
                  onClick={() => handleExportAll("geojson")}
                  className="hover:text-primary w-full cursor-pointer px-4 py-2 text-left text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Export as GeoJSON
                </button>
                <button
                  onClick={() => handleExportAll("csv")}
                  className="hover:text-primary w-full cursor-pointer px-4 py-2 text-left text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Export as CSV
                </button>
              </div>
            )}
          </div>

          {/* Close Popup */}
          <button
            onClick={onClose}
            className="cursor-pointer rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Layer List Section */}
      <div className="mt-3.5 max-h-[220px] space-y-1.5 overflow-y-auto pr-0.5">
        {layers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-xs text-gray-400 sm:text-sm">
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
                className={`group flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                  isSelected
                    ? "border-[#add3d3] bg-[#add3d3] text-black shadow-sm"
                    : "border-gray-100 bg-white text-gray-700 hover:border-gray-200 hover:bg-[#d5ebeb]/40"
                }`}
              >
                {/* Layer Name / Edit Field */}
                <div
                  className="mr-2 min-w-0 flex-1"
                  onClick={(e) => isEditing && e.stopPropagation()}
                >
                  {isEditing ? (
                    <div className="flex w-full items-center gap-1.5">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(layer.id);
                          if (e.key === "Escape") setEditingLayerId(null);
                        }}
                        className="border-primary/30 focus:border-primary w-full rounded border bg-white px-2 py-0.5 text-xs font-medium text-gray-800 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveRename(layer.id)}
                        className="cursor-pointer rounded bg-green-50 p-1 text-green-600 transition-colors hover:bg-green-100"
                        title="Save rename"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingLayerId(null)}
                        className="cursor-pointer rounded bg-gray-50 p-1 text-gray-400 transition-colors hover:bg-gray-100"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col text-left">
                      <span className="truncate text-xs leading-tight font-semibold sm:text-[13px]">
                        {layer.label}
                      </span>
                      {layer.area !== undefined && (
                        <span className="mt-0.5 text-[10px] leading-none font-medium opacity-75">
                          {layer.area.toFixed(2)} sqkm
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Layer Control Icons */}
                {!isEditing && (
                  <div
                    className="flex items-center gap-1 opacity-85 group-hover:opacity-100 sm:gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Visibility Toggle */}
                    <button
                      onClick={() => toggleLayerVisibility(layer.id)}
                      className={`cursor-pointer rounded p-1.5 transition-colors hover:bg-black/5 ${
                        isVisible
                          ? "text-gray-600 hover:text-black"
                          : "text-gray-300 hover:text-gray-400"
                      }`}
                      title={isVisible ? "Hide layer" : "Show layer"}
                    >
                      {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>

                    {/* Zoom / Center Layer */}
                    <button
                      onClick={() => {
                         setSelectedAOI(layer.id)
                        setFitLayerId(layer.id)}}
                      className="cursor-pointer rounded p-1.5 text-gray-600 transition-colors hover:bg-black/5 hover:text-black"
                      title="Zoom to layer"
                    >
                      <Crosshair className="h-4 w-4" />
                    </button>

                    {/* Delete Layer */}
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete layer "${layer.label}"?`)) {
                          removeLayer(layer.id);
                          if (isSelected) setSelectedLayerId(null);
                        }
                      }}
                      className="cursor-pointer rounded p-1.5 text-gray-500 transition-colors hover:bg-black/5 hover:text-red-600"
                      title="Delete layer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    {/* Actions Ellipsis Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => handleToggleMenu(e, layer.id)}
                        className={`cursor-pointer rounded p-1.5 transition-colors hover:bg-black/5 ${
                          isMenuOpen ? "bg-black/5 text-black" : "text-gray-500 hover:text-black"
                        }`}
                        title="More options"
                      >
                        <MoreVertical className="h-4 w-4" />
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
          className="w-36 rounded-md border border-gray-200 bg-white py-1 shadow-2xl"
        >
          <button
            onClick={() => {
              const layer = layers.find((l) => l.id === activeMenuLayerId);
              if (layer) handleStartRename(layer);
            }}
            className="hover:text-primary flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Edit2 className="mr-2 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            <span>Rename</span>
          </button>
          <button
            onClick={() => {
              const layer = layers.find((l) => l.id === activeMenuLayerId);
              if (layer) handleExportSingle(layer, "geojson");
            }}
            className="hover:text-primary flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <FileJson className="mr-2 h-3.5 w-3.5 flex-shrink-0 text-orange-500" />
            <span>Export GeoJSON</span>
          </button>
          <button
            onClick={() => {
              const layer = layers.find((l) => l.id === activeMenuLayerId);
              if (layer) handleExportSingle(layer, "kml");
            }}
            className="hover:text-primary flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <FileCode className="mr-2 h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
            <span>Export KML</span>
          </button>
        </div>
      )}
    </div>
  );
};
export default SelectPopup;
