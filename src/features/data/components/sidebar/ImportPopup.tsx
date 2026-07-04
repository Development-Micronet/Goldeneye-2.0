import React, { useState, useRef } from "react";
import { Paperclip, X } from "lucide-react";
import { toast } from "react-toastify";
import { useLayersStore } from "../../../../store/useLayersStore";
import { parseGeospatialFile } from "../../../../utils/geospatialUtils";

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

  const handleConfirm = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select a file to import");
      return;
    }

    let totalImported = 0;
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
          addLayer(layer);
          totalImported++;
        });
      } catch (err: any) {
        console.error(`Error importing file ${file.name}:`, err);
        errors.push(`${file.name}: ${err.message || err}`);
      }
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
        toast.error(
          "Invalid file type. Allowed: .shp, .kml, .kmz, .json, .geojson",
        );
      }
    }
  };

  return (
    <div className="absolute left-full -top-12 ml-3 w-[calc(100vw-70px)] max-w-[360px] sm:w-[340px] md:w-[360px] bg-white border border-gray-200 shadow-2xl px-5 py-3 z-50 flex flex-col space-y-2 pointer-events-auto text-left">
      <div className="flex flex-col text-left">
        <span className="text-gray-500 text-xs sm:text-[12px] leading-relaxed ">
          (Allowed File Types: .shp, .kml, .kmz, .json, .geojson)
        </span>
        <span className="text-gray-700 text-xs sm:text-[12px] leading-relaxed">
          Shapefile with Projection WGS84 EPSG:4326
        </span>
      </div>

      {/* File Selection Wrapper */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex items-center border rounded-lg overflow-hidden h-10 sm:h-11 transition-all bg-white cursor-pointer ${
          isDragging
            ? "border-dashed border-primary bg-primary/5"
            : "border-gray-200 hover:border-gray-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
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
          <div className="flex-1 px-3 py-2 text-left text-xs sm:text-sm text-gray-700 font-medium select-none overflow-hidden text-ellipsis whitespace-nowrap flex items-center justify-between">
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
              className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex-1 px-3 py-2 text-left text-xs sm:text-sm text-gray-400 select-none overflow-hidden text-ellipsis whitespace-nowrap">
            Search File From Folder
          </div>
        )}
        <div className="bg-primary/5 h-full px-3.5 flex items-center justify-center border-l border-gray-200 transition-colors hover:bg-primary/10">
          <Paperclip className="w-4 h-4 text-primary" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mt-1 justify-start">
        <button
          type="button"
          onClick={handleCancel}
          className="border border-primary text-primary bg-white hover:bg-primary/5 rounded-full px-5 py-1.5 sm:py-2 text-xs sm:text-[12px] font-semibold transition-all cursor-pointer focus:outline-none"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="bg-primary text-white hover:bg-primary/90 rounded-full px-7 py-1.5 sm:py-2 text-xs sm:text-[12px] font-semibold transition-all cursor-pointer focus:outline-none"
        >
          Confirm
        </button>
      </div>
    </div>
  );
};
export default ImportPopup;
