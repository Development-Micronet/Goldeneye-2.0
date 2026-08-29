import { useState } from "react";
import { FiX, FiPaperclip } from "react-icons/fi";

interface SupportingFile {
  name: string;
  fileType: "kml" | "html" | "jpg";
  file?: File;
}

interface ImageData {
  dataUrl: string;
  caption?: string;
  supportingfiles?: SupportingFile[];
}

interface ImageCardProps {
  img: ImageData;
  index: number;
  total: number;
  inputCls?: string;
  removeImage: (index: number) => void;
  updateCaption: (index: number, caption: string) => void;
  attachFile: (index: number, file: File, type: "kml" | "html" | "jpg") => void;
  detachFile: (index: number, type: "kml" | "html" | "jpg") => void;
  allowfile?: ("kml" | "html" | "jpg")[];
}

type FileConfig = {
  accept: string;
  label: string;
  color: string;
  type: "kml" | "html" | "jpg";
};

const ImageCard: React.FC<ImageCardProps> = ({
  img,
  index,
  total,
  inputCls = "",
  removeImage,
  updateCaption,
  attachFile,
  detachFile,
  allowfile = ["kml", "html", "jpg"],
}) => {
  const [showZoom, setShowZoom] = useState<boolean>(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const fileConfig: Record<"kml" | "html" | "jpg", FileConfig> = {
    kml: {
      accept: ".kml,.kmz",
      label: "KML",
      color: "text-green-700 bg-green-50 border-green-100",
      type: "kml",
    },
    html: {
      accept: ".html,.htm",
      label: "HTML",
      color: "text-blue-700 bg-blue-50 border-blue-100",
      type: "html",
    },
    jpg: {
      accept: ".jpg,.jpeg,.png",
      label: "Image",
      color: "text-purple-700 bg-purple-50 border-purple-100",
      type: "jpg",
    },
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();

    setZoomPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <>
      {/* CARD */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md">
        {/* IMAGE + TOP-RIGHT REMOVE */}
        <div
          className="group relative cursor-zoom-in"
          onMouseEnter={() => setShowZoom(true)}
          onMouseLeave={() => setShowZoom(false)}
          onMouseMove={handleMouseMove}
        >
          <img
            src={img.dataUrl}
            alt={img.caption || `Image ${index + 1}`}
            className="h-28 w-full object-cover"
          />

          <button
            type="button"
            onClick={() => removeImage(index)}
            className="absolute top-2 right-2 text-red-500 hover:text-red-600"
            title="Remove Image"
          >
            <FiX className="h-4 w-4" />
          </button>

          <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-[2px] text-[10px] text-white">
            {index + 1}/{total}
          </div>
        </div>

        {/* BODY */}
        <div className="space-y-2 p-2">
          {/* CAPTION */}
          <input
            className={`${inputCls} w-full rounded border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-gray-300`}
            value={img.caption || ""}
            placeholder="Add caption..."
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateCaption(index, e.target.value)
            }
          />

          {/* FILE ATTACHMENTS */}
          <div className="flex flex-wrap gap-2">
            {allowfile.map((type) => {
              const config = fileConfig[type];

              const existingFile = img.supportingfiles?.find((f) => f.fileType === type);

              return (
                <div key={type} className="flex flex-col gap-1">
                  <label
                    className={`flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-[10px] ${config.color}`}
                  >
                    <FiPaperclip className="h-3 w-3" />
                    {config.label}

                    <input
                      type="file"
                      accept={config.accept}
                      className="hidden"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          attachFile(index, file, config.type);
                        }
                      }}
                    />
                  </label>

                  {existingFile && (
                    <div className="flex items-center justify-between rounded border bg-gray-50 px-2 py-1 text-[9px]">
                      <span className="max-w-[80px] truncate">{existingFile.name}</span>

                      <FiX
                        className="h-3 w-3 cursor-pointer text-red-500"
                        onClick={() => detachFile(index, config.type)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ZOOM */}
      {showZoom && (
        <div className="fixed right-6 bottom-20 z-[9999] h-[380px] w-[380px] overflow-hidden rounded-xl border bg-black shadow-xl">
          <div className="bg-black/80 p-2 text-[10px] text-white">
            {img.caption || `Image ${index + 1}`}
          </div>

          <div
            className="h-full w-full"
            style={{
              backgroundImage: `url(${img.dataUrl})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "300%",
              backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
            }}
          />
        </div>
      )}
    </>
  );
};

export default ImageCard;
