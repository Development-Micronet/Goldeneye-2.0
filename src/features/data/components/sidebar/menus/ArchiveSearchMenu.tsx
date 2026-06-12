import React from "react";
import { AoiDrawIcon } from "../icons/AoiDrawIcon";

export const ArchiveSearchMenu: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 select-none">
      <p className="text-primary text-sm sm:text-base font-semibold mb-4 max-w-[240px]">
        Please Create or Select AOI Before Searching.
      </p>
      <div className="w-12 h-12 rounded border border-primary bg-primary/10 flex items-center justify-center hover:bg-primary/30 transition-colors cursor-pointer shadow-sm">
        <AoiDrawIcon />
      </div>
    </div>
  );
};
