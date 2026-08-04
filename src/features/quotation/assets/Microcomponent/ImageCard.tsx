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
  attachFile: (
    index: number,
    file: File,
    type: "kml" | "html" | "jpg"
  ) => void;
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

  const handleMouseMove = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();

    setZoomPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <>
      {/* CARD */}
      <div className="rounded-xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition">
        {/* IMAGE + TOP-RIGHT REMOVE */}
        <div
          className="relative group cursor-zoom-in"
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

          <div className="absolute bottom-2 left-2 text-[10px] bg-black/50 text-white px-2 py-[2px] rounded">
            {index + 1}/{total}
          </div>
        </div>

        {/* BODY */}
        <div className="p-2 space-y-2">
          {/* CAPTION */}
          <input
            className={`${inputCls} text-xs w-full border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-gray-300`}
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

              const existingFile = img.supportingfiles?.find(
                (f) => f.fileType === type
              );

              return (
                <div key={type} className="flex flex-col gap-1">
                  <label
                    className={`flex items-center gap-1 text-[10px] px-2 py-1 border rounded cursor-pointer ${config.color}`}
                  >
                    <FiPaperclip className="h-3 w-3" />
                    {config.label}

                    <input
                      type="file"
                      accept={config.accept}
                      className="hidden"
                      onChange={(
                        e: React.ChangeEvent<HTMLInputElement>
                      ) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          attachFile(index, file, config.type);
                        }
                      }}
                    />
                  </label>

                  {existingFile && (
                    <div className="flex items-center justify-between text-[9px] px-2 py-1 border rounded bg-gray-50">
                      <span className="truncate max-w-[80px]">
                        {existingFile.name}
                      </span>

                      <FiX
                        className="h-3 w-3 text-red-500 cursor-pointer"
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
        <div className="fixed bottom-20 right-6 z-[9999] w-[380px] h-[380px] border rounded-xl shadow-xl overflow-hidden bg-black">
          <div className="text-white text-[10px] p-2 bg-black/80">
            {img.caption || `Image ${index + 1}`}
          </div>

          <div
            className="w-full h-full"
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