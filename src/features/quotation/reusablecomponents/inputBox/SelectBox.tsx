import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons";

interface SelectBoxProps {
  className?: string;
  type?: "select" | "select-input";
  options?: string[];
  label?: string;
  value?: string;
  inputValue?: string;
  onChange?: (val: string) => void;
  onInputChange?: (val: string) => void;
  dissble?: boolean;
}

const SelectBox: React.FC<SelectBoxProps> = ({
  className = "",
  type = "select-input",
  options = [],
  label = "Product Name",
  value,
  inputValue = "",
  onChange,
  onInputChange,
  dissble,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>(options);
  const selectBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inputValue && !options.includes(inputValue)) {
      setFilteredOptions([...options, inputValue]);
    } else {
      setFilteredOptions(options);
    }
  }, [inputValue, options]);

  const handleSelectChange = (selectedValue: string) => {
    setShowOptions(false);
    if (onChange) onChange(selectedValue);
  };

  const toggleOptions = () => {
    if (!dissble) {
      setShowOptions((prev) => !prev);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (inputValue.trim()) {
        handleSelectChange(inputValue);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectBoxRef.current &&
        !selectBoxRef.current.contains(event.target as Node)
      ) {
        setShowOptions(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-full mx-auto" ref={selectBoxRef}>
      <label className="text-inter mb-1 font-normal text-[#515151]">
        {label}
      </label>
      <div className="w-full">
        <div
          onClick={toggleOptions}
          className={`flex items-center justify-between overflow-hidden ${className} ${
            dissble ? "pointer-events-none opacity-50" : ""
          } border p-4 h-14 w-full rounded-lg`}
        >
          <span>{value || ""}</span>
          <FontAwesomeIcon icon={faAngleDown} className="ml- text-gray-900" />
        </div>

        {showOptions && (type === "select" || type === "select-input") && (
          <div className="absolute border border-gray-300 bg-white mt-1 rounded w-[256px] max-h-60 shadow-lg z-[100]">
            <div className="max-h-48 overflow-y-auto text-inter overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
              {filteredOptions.map((option, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectChange(option)}
                  className="px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100"
                >
                  {option}
                </div>
              ))}
            </div>
            {type === "select-input" && (
              <div className="sticky bottom-0 bg-white p-1 border-t">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => onInputChange?.(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="border border-gray-300 px-2 py-1 rounded-sm w-full"
                  placeholder="Add New Product"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectBox;
