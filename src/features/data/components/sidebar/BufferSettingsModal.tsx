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
    <div className="pointer-events-auto absolute top-0 left-full z-50 ml-0 flex w-[240px] flex-col space-y-3 border border-gray-200 bg-white p-4 text-left">
      <div className="text-[13px] text-gray-700 select-none">
        <span className="font-bold text-gray-800">{title}</span>{" "}
        <span className="font-normal text-gray-400">(all sides)</span>
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
          className="focus:border-primary w-[75px] rounded border border-gray-200 px-2 py-1 text-center text-sm font-semibold text-gray-700 focus:outline-none"
        />
        <span className="text-sm font-medium text-gray-500 select-none">km</span>
      </div>
      <div className="flex items-center space-x-2 pt-1">
        <button
          type="button"
          onClick={onReset}
          className="text-primary border-primary/20 hover:bg-primary/5 flex-1 cursor-pointer rounded-full border bg-white py-1.5 text-xs font-semibold transition-colors focus:outline-none"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="bg-primary hover:bg-primary/90 flex-1 cursor-pointer rounded-full py-1.5 text-xs font-semibold text-white transition-colors focus:outline-none"
        >
          Confirm
        </button>
      </div>
    </div>
  );
};
