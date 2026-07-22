import React from "react";
import { AoiDrawIcon } from "../icons/AoiDrawIcon";

export const AnalyticsMenu: React.FC = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center select-none">
      <p className="text-primary mb-4 max-w-[240px] text-sm font-semibold sm:text-base">
        Please Create or Select AOI to Run Analytics.
      </p>
      <div className="border-primary bg-primary/10 hover:bg-primary/30 flex h-12 w-12 cursor-pointer items-center justify-center rounded border shadow-sm transition-colors">
        <AoiDrawIcon />
      </div>
    </div>
  );
};
