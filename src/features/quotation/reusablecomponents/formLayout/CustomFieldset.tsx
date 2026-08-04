import React from "react";
import "./CustomFieldset.css";

interface CustomFieldsetsProps {
  legend: string;
  children: React.ReactNode;
}

const CustomFieldsets: React.FC<CustomFieldsetsProps> = ({ legend, children }) => {
  return (
    <fieldset className="rounded-lg px-3 pb-2 w-full bg-white">
      <legend className="font-inter text-[17px] font-bold leading-[20.57px] text-left underline-from-font decoration-skip-ink-none">
        {legend}
      </legend>
      <div className="space-y-4">{children}</div>
      <hr className="border-t border-gray-500 mt-4" />
    </fieldset>
  );
};

export default CustomFieldsets;
