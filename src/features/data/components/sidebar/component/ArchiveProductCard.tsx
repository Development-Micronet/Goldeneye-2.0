import React from "react";
import { Check, Crosshair, Eye, ImageOff, Info, Pin, ShoppingCart } from "lucide-react";
import type { SelectedArchiveProduct } from "../store/useArchiveProductStore";
import { useArchiveHoverStore } from "../../../hooks/useArchiveHoverStore";
import { usePinnedProductStore } from "../../../hooks/usePinnedProductStore";
import { useArchiveInfoStore } from "../../../hooks/useArchiveInfoStore";

interface ArchiveProductCardProps {
  product: SelectedArchiveProduct;
  checked: boolean;
  isVisible: boolean;
  onToggleSelect: (product: SelectedArchiveProduct) => void;
  onToggleVisibility: (product: SelectedArchiveProduct) => void;
  onFlyToProduct: (product: SelectedArchiveProduct) => void;
}

export const ArchiveProductCard: React.FC<ArchiveProductCardProps> = ({
  product,
  checked,
  isVisible,
  onToggleSelect,
  onToggleVisibility,
  onFlyToProduct,
}) => {
  const { setHoveredProduct } = useArchiveHoverStore();
  const { addPinnedProduct, removePinnedProduct, isPinned } = usePinnedProductStore();
  const { infoProduct, setInfoProduct } = useArchiveInfoStore();
  return (
    <div
      onMouseEnter={() => setHoveredProduct(product)}
      onMouseLeave={() => setHoveredProduct(null)}
      className={`group transition ${checked ? "bg-primary/5" : "bg-white hover:bg-gray-50"}`}
    >
      <div className="flex gap-2 p-2.5">
        {/* Thumbnail */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-gray-100">
          <button
            onClick={() => onToggleSelect(product)}
            className={`absolute top-1 left-1 z-10 flex h-4 w-4 items-center justify-center border transition ${
              checked ? "border-primary bg-primary text-white" : "border-white bg-white"
            }`}
          >
            {checked && <Check size={10} strokeWidth={3} />}
          </button>

          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageOff size={16} className="text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <h3 className="text-primary truncate text-sm font-semibold">{product.name}</h3>

            <p className="text-[11px] text-gray-500">
              {product.acquisitionDate ? new Date(product.acquisitionDate).toUTCString() : "-"}
            </p>

            <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-gray-600">
              <span>
                <span className="font-medium">Res:</span> {product.resolution}m
              </span>

              <span>
                <span className="font-medium">Inc:</span> {product.incidenceAngle ?? "-"}°
              </span>

              <span>
                <span className="font-medium">Cloud:</span> {product.cloud_cover ?? "-"}%
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-2 flex items-center gap-1 text-gray-500">
            <button
              onClick={() => onFlyToProduct(product)}
              className="hover:text-primary p-1 transition hover:bg-gray-100"
              title="Zoom to product"
            >
              <Crosshair size={14} />
            </button>
            <button
              onClick={() => {
                if (isPinned(product.id)) {
                  removePinnedProduct(product.id);
                } else {
                  addPinnedProduct(product);
                }
              }}

              className="hover:text-primary p-1 transition hover:bg-gray-100"
              title={isPinned(product.id) ? "Remove Pin" : "Pin Product"}
            >
              <Pin size={14} className={isPinned(product.id) ? "text-primary" : "text-gray-400"} />
            </button>
            <button
              disabled={!checked}
              onClick={() => onToggleVisibility(product)}
              className={`p-1 transition ${
                !checked
                  ? "cursor-not-allowed text-gray-300"
                  : isVisible
                    ? "text-primary"
                    : "hover:text-primary hover:bg-gray-100"
              }`}
              title={!checked ? "Select product first" : isVisible ? "Hide Image" : "Show Image"}
            >
              <Eye size={14} />
            </button>

            <button
              onClick={() =>
                infoProduct?.id === product.id ? setInfoProduct(null) : setInfoProduct(product)
              }
              className={`flex h-6 w-6 items-center justify-center rounded-md transition-all duration-200 ${
                infoProduct?.id === product.id
                  ? "bg-primary shadow-primary/30 text-white shadow-sm"
                  : "hover:text-primary text-gray-500 hover:bg-gray-100"
              } `}
              title={infoProduct?.id === product.id ? "Close Information" : "Show Information"}
            >
              <Info size={14} />
            </button>

            <button
              className="hover:text-primary p-1 transition hover:bg-gray-100"
              title="Add to Cart"
            >
              <ShoppingCart size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
