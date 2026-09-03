import React from "react";
import { Crosshair, ImageOff, Info, Pin, ShoppingCart } from "lucide-react";

import type { SelectedArchiveProduct } from "../store/useArchiveProductStore";
import { useArchiveHoverStore } from "../../../hooks/useArchiveHoverStore";
import { usePinnedProductStore } from "../../../hooks/usePinnedProductStore";
import { useArchiveInfoStore } from "../../../hooks/useArchiveInfoStore";
import { useIsCartHidden } from "../../../../../utils/cartPermissions";
import { EyeIcon } from "../../../../../assets/index";

/** Shared with the toolbar so both eyes match. */
export const VisibilityIcon: React.FC<{ dimmed?: boolean }> = ({ dimmed }) => (
  <img
    src={EyeIcon}
    alt=""
    aria-hidden="true"
    className={`h-4 w-4 object-contain transition-all duration-300 ${dimmed ? "opacity-30 grayscale" : ""
      }`}
  />
);

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/** Angles and cloud cover read better as whole numbers. */
const rounded = (value?: number | null) =>
  typeof value === "number" && !Number.isNaN(value) ? Math.round(value) : "-";

/** "Tue, 01 Sep 2026 05:42:12 UTC" */
const formatAcquired = (iso?: string) => {
  if (!iso) return "—";

  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : `${dateFormat.format(date)} UTC`;
};

interface ArchiveProductCardProps {
  product: SelectedArchiveProduct;
  checked: boolean;
  isVisible: boolean;
  onToggleSelect: (product: SelectedArchiveProduct) => void;
  onToggleVisibility: (product: SelectedArchiveProduct) => void;
  onFlyToProduct: (product: SelectedArchiveProduct) => void;
  onOrder: (product: SelectedArchiveProduct) => void;
}

export const ArchiveProductCard: React.FC<ArchiveProductCardProps> = ({
  product,
  checked,
  isVisible,
  onToggleSelect,
  onToggleVisibility,
  onFlyToProduct,
  onOrder,
}) => {
  const { setHoveredProduct } = useArchiveHoverStore();
  const { addPinnedProduct, removePinnedProduct, isPinned } = usePinnedProductStore();
  const { infoProduct, setInfoProduct } = useArchiveInfoStore();

  const isCartHidden = useIsCartHidden();

  const pinned = isPinned(product.id);
  const infoOpen = infoProduct?.id === product.id;

  const button = "rounded p-0.5 transition-all duration-300";
  /** Inactive controls sit back; the active one takes the primary colour. */
  const tone = (active: boolean) =>
    active ? "text-primary opacity-100" : "text-gray-600 opacity-30 hover:opacity-70";

  return (
    <div
      onMouseEnter={() => setHoveredProduct(product)}
      onMouseLeave={() => setHoveredProduct(null)}
      className={`flex gap-2 border-b border-gray-100 px-3 py-2 transition ${checked ? "bg-[#F0FDFD]" : "bg-white hover:bg-gray-50"
        }`}
    >
      {/* Checkbox, aligned to the top of the row */}
      <div className="shrink-0 pt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggleSelect(product)}
          aria-label={`Select ${product.name}`}
          className="accent-primary h-3.5 w-3.5 cursor-pointer rounded border-gray-100"
        />
      </div>

      {/* Thumbnail */}
      {/* Thumbnail */}
      <div className="mr-2 w-[4rem] shrink-0 sm:w-[5rem] md:w-[6rem]">
        <div className="relative box-border flex items-center justify-center bg-black">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              className="h-[100px] w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageOff className="h-3.5 w-3.5 text-gray-500" />
            </div>
          )}
        </div>
      </div>


      {/* Content */}
      <div className="min-w-0 flex-1 gap-2">
        <div className="mb-1 w-full">
          <p className="text-primary mb-2 truncate text-[0.8rem] leading-tight font-medium">
            {product.name}
          </p>

          <p className="text-primary mb-2 truncate text-[0.75rem] leading-tight font-medium">
            {formatAcquired(product.acquisitionDate ?? product.date)}
          </p>

          <p className="mb-1 truncate text-[0.75rem] leading-tight font-medium text-gray-600">
            Res: <span className="text-primary">{product.resolution ?? "-"}m</span>
            <span className="mx-1 text-gray-300">|</span>
            IncAng (°): <span className="text-primary">{rounded(product.incidenceAngle)}</span>
            <span className="mx-1 text-gray-300">|</span>
            Cloud (%): <span className="text-primary">{rounded(product.cloud_cover)}</span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => onFlyToProduct(product)}
            data-tooltip-id="archive-tooltip"
            data-tooltip-content="Zoom to target"
            className={`${button} ${tone(false)}`}
          >
            <Crosshair className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => (pinned ? removePinnedProduct(product.id) : addPinnedProduct(product))}
            data-tooltip-id="archive-tooltip"
            data-tooltip-content={pinned ? "Remove pin" : "Select"}
            className={`${button} ${tone(pinned)}`}
          >
            <Pin className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onToggleVisibility(product)}
            data-tooltip-id="archive-tooltip"
            data-tooltip-content={isVisible ? "Hide image" : "Visibility"}
            className={button}
          >
            <VisibilityIcon dimmed={!isVisible} />
          </button>

          {!isCartHidden && (
            <button
              type="button"
              onClick={() => onOrder(product)}
              data-tooltip-id="archive-tooltip"
              data-tooltip-content="Add to Cart"
              className={`${button} ${tone(false)}`}
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setInfoProduct(infoOpen ? null : product)}
            data-tooltip-id="archive-tooltip"
            data-tooltip-content="More information"
            className={`${button} ${tone(infoOpen)}`}
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};