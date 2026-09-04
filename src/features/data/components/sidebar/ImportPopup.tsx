import { toast } from "react-toastify";
import React, { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { useLayersStore } from "../../../../store/useLayersStore";
import { useSelectedAOIStore } from "../../hooks/useSelectedAOIStore";
import { parseGeospatialFile } from "../../../../utils/geospatialUtils";
import { logger } from "../../../../utils/logger";

interface ImportPopupProps {
  onClose: () => void;
}

export const ImportPopup: React.FC<ImportPopupProps> = ({ onClose }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };
  const handleClearFile = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  const handleCancel = () => {
    handleClearFile();
    onClose();
  };
  const addLayer = useLayersStore((state) => state.addLayer);
  const setSelectedAOI = useSelectedAOIStore((state) => state.setSelectedAOI);
  const handleConfirm = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select a file to import");
      return;
    }

    let totalImported = 0;
    let firstImportedLayerId: string | null = null;
    const errors: string[] = [];

    for (const file of selectedFiles) {
      try {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read file."));
          reader.readAsText(file);
        });
        const parsedLayers = parseGeospatialFile(text, file.name);
        parsedLayers.forEach((layer) => {
          const newLayer = addLayer(layer);
          if (!firstImportedLayerId) {
            firstImportedLayerId = newLayer.id;
          }
          totalImported++;
        });
      } catch (err: any) {
        logger.error(`Error importing file ${file.name}:`, err);
        errors.push(`${file.name}: ${err.message || err}`);
      }
    }

    if (firstImportedLayerId) {
      setSelectedAOI(firstImportedLayerId);
    }

    if (totalImported > 0) {
      toast.success(`Successfully imported ${totalImported} layer${totalImported > 1 ? "s" : ""}.`);
    }

    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
    }

    handleClearFile();
    onClose();
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      const allowedExtensions = [".shp", ".kml", ".kmz", ".json", ".geojson"];
      const validFiles = filesArray.filter((file) => {
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        return allowedExtensions.includes(ext);
      });

      if (validFiles.length > 0) {
        setSelectedFiles(validFiles);
        if (validFiles.length < filesArray.length) {
          toast.warning("Some files were skipped due to unsupported file type");
        }
      } else {
        toast.error("Invalid file type. Allowed: .shp, .kml, .kmz, .json, .geojson");
      }
    }
  };

  return (
    <div className="pointer-events-auto absolute -top-12 left-full z-50 ml-3 flex w-[calc(100vw-70px)] max-w-[360px] flex-col space-y-2 border border-gray-200 bg-white px-5 py-3 text-left shadow-2xl sm:w-[340px] md:w-[360px]">
      <div className="flex flex-col text-left">
        <span className="text-xs leading-relaxed text-gray-500 sm:text-[12px]">
          (Allowed File Types: .shp, .kml, .kmz, .json, .geojson)
        </span>
        <span className="text-xs leading-relaxed text-gray-700 sm:text-[12px]">
          Shapefile with Projection WGS84 EPSG:4326
        </span>
      </div>

      {/* File Selection Wrapper */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex h-10 cursor-pointer items-center overflow-hidden rounded-lg border bg-white transition-all sm:h-11 ${
          isDragging
            ? "border-primary bg-primary/5 border-dashed"
            : "focus-within:border-primary focus-within:ring-primary border-gray-200 focus-within:ring-1 hover:border-gray-300"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".shp,.kml,.kmz,.json,.geojson"
          className="hidden"
          multiple
        />
        {selectedFiles.length > 0 ? (
          <div className="flex flex-1 items-center justify-between overflow-hidden px-3 py-2 text-left text-xs font-medium text-ellipsis whitespace-nowrap text-gray-700 select-none sm:text-sm">
            <span className="truncate">
              {selectedFiles.length === 1
                ? selectedFiles[0].name
                : `${selectedFiles.length} files selected`}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClearFile();
              }}
              className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden px-3 py-2 text-left text-xs text-ellipsis whitespace-nowrap text-gray-400 select-none sm:text-sm">
            Search File From Folder
          </div>
        )}
        <div className="bg-primary/5 hover:bg-primary/10 flex h-full items-center justify-center border-l border-gray-200 px-3.5 transition-colors">
          <Paperclip className="text-primary h-4 w-4" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-1 flex items-center justify-start gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="border-primary text-primary hover:bg-primary/5 cursor-pointer rounded-full border bg-white px-5 py-1.5 text-xs font-semibold transition-all focus:outline-none sm:py-2 sm:text-[12px]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="bg-primary hover:bg-primary/90 cursor-pointer rounded-full px-7 py-1.5 text-xs font-semibold text-white transition-all focus:outline-none sm:py-2 sm:text-[12px]"
        >
          Confirm
        </button>
      </div>
    </div>
  );
};
export default ImportPopup;
