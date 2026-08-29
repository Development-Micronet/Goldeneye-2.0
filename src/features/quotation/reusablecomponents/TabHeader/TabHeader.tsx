import React from "react";

interface TabHeaderProps {
  headingTitle: string;
  imgSrc?: string;
  imgCancle?: string;
  toggleOffCanvas: (val: any) => void;
}

const TabHeader: React.FC<TabHeaderProps> = ({ headingTitle, imgCancle, toggleOffCanvas }) => {
  return (
    <div className="flex w-full items-center justify-between border-b">
      <div className="flex items-center">
        <h1 className="cursor-pointer px-3 pt-3 pb-1 text-lg leading-tight text-black">
          {headingTitle}
        </h1>
      </div>

      <span
        className="cursor-pointer text-black hover:text-black"
        onClick={() => toggleOffCanvas(null)}
      >
        {imgCancle && (
          <img className="mt-2 mr-5 mb-2 h-5 w-5" src={imgCancle} alt="Cancel" loading="lazy" />
        )}
      </span>
    </div>
  );
};

export default TabHeader;
