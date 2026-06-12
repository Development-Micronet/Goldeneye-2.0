import React from "react";

export const AdvanceDataMenu: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 select-none">
      <p className="text-[#106070] text-sm sm:text-base font-semibold mb-2">
        Advance Data Content
      </p>
      <p className="text-gray-500 text-xs sm:text-sm max-w-[200px]">
        Configure or view your advance data settings and search data.
      </p>
    </div>
  );
};
