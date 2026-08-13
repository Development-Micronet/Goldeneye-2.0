// components/OpacitySlider.tsx
import React from "react";
import { useRasterOpacity } from "../core/useRasterOpacity";

const OpacitySlider: React.FC<{ rasterId: string; initial?: number }> = ({
  rasterId,
  initial = 1,
}) => {
  const { opacity, preview, commit } = useRasterOpacity(rasterId, initial);

  return (
    <div className="mt-2.5 border-t border-gray-100 pt-2">
      <div className="flex items-center justify-between text-[10px] font-medium text-gray-500">
        <span>Opacity</span>
        <span className="font-mono text-gray-700">{Math.round(opacity * 100)}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={opacity}
        onChange={(e) => preview(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-teal-600"
      />
    </div>
  );
};

export default OpacitySlider;
