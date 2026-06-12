import React from "react";

interface BufferSettingsModalProps {
  title: string;
  value: string;
  onChange: (val: string) => void;
  onReset: () => void;
  onConfirm: () => void;
}

export const BufferSettingsModal: React.FC<BufferSettingsModalProps> = ({
  title,
  value,
  onChange,
  onReset,
  onConfirm,
}) => {
  return (
    <div className="absolute left-full top-0 ml-0 bg-white border border-gray-200 p-4 w-[240px] z-50 flex flex-col space-y-3 pointer-events-auto text-left">
      <div className="text-[13px] text-gray-700 select-none">
        <span className="font-bold text-gray-800">{title}</span>{" "}
        <span className="text-gray-400 font-normal">(all sides)</span>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            if (/^\d*\.?\d*$/.test(val)) {
              onChange(val);
            }
          }}
          className="w-[75px] px-2 py-1 text-center border border-gray-200 rounded focus:outline-none focus:border-primary text-sm text-gray-700 font-semibold"
        />
        <span className="text-gray-500 text-sm font-medium select-none">km</span>
      </div>
      <div className="flex items-center space-x-2 pt-1">
        <button
          type="button"
          onClick={onReset}
          className="flex-1 py-1.5 text-xs font-semibold text-primary bg-white border border-primary/20 hover:bg-primary/5 rounded-full transition-colors cursor-pointer focus:outline-none"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-full transition-colors cursor-pointer focus:outline-none"
        >
          Confirm
        </button>
      </div>
    </div>
  );
};
