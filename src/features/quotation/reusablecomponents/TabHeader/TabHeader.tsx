import React from "react";

interface TabHeaderProps {
  headingTitle: string;
  imgSrc?: string;
  imgCancle?: string;
  toggleOffCanvas: (val: any) => void;
}

const TabHeader: React.FC<TabHeaderProps> = ({
  headingTitle,
  imgCancle,
  toggleOffCanvas,
}) => {
  return (
    <div className="flex justify-between items-center w-full border-b">
      <div className="flex items-center">
        <h1 className="text-lg text-black leading-tight cursor-pointer px-3 pt-3 pb-1 ">
          {headingTitle}
        </h1>
      </div>

      <span
        className="text-black cursor-pointer hover:text-black"
        onClick={() => toggleOffCanvas(null)}
      >
        {imgCancle && (
          <img
            className="w-5 h-5 mr-5 mt-2 mb-2"
            src={imgCancle}
            alt="Cancel"
            loading="lazy"
          />
        )}
      </span>
    </div>
  );
};

export default TabHeader;
