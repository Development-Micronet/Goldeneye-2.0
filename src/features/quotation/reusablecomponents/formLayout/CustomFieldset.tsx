import React from "react";
import "./CustomFieldset.css";

interface CustomFieldsetsProps {
  legend: string;
  children: React.ReactNode;
}

const CustomFieldsets: React.FC<CustomFieldsetsProps> = ({ legend, children }) => {
  return (
    <fieldset className="w-full rounded-lg bg-white px-3 pb-2">
      <legend className="font-inter underline-from-font decoration-skip-ink-none text-left text-[17px] leading-[20.57px] font-bold">
        {legend}
      </legend>
      <div className="space-y-4">{children}</div>
      <hr className="mt-4 border-t border-gray-500" />
    </fieldset>
  );
};

export default CustomFieldsets;
