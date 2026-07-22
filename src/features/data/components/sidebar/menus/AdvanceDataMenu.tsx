import React from "react";

export const AdvanceDataMenu: React.FC = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center select-none">
      <p className="mb-2 text-sm font-semibold text-[#106070] sm:text-base">Advance Data Content</p>
      <p className="max-w-[200px] text-xs text-gray-500 sm:text-sm">
        Configure or view your advance data settings and search data.
      </p>
    </div>
  );
};
