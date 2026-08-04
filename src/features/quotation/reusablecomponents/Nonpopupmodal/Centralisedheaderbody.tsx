import React from "react";
import "./Centralised.css";

interface CentralisedheaderbodyProps {
  header?: string;
  logo?: string;
  children: React.ReactNode;
  headerBgColor?: string;
  headerTextColor?: string;
  onClose?: () => void;
  className?: string;
}

const Centralisedheaderbody: React.FC<CentralisedheaderbodyProps> = ({
  header,
  logo,
  children,
  headerBgColor,
  headerTextColor,
  onClose,
  className = "",
}) => {
  return (
    <div className={`bg-gray-200 ${className}`}>
      <div
        className="flex justify-between items-center px-2"
        style={{
          backgroundColor: headerBgColor,
          color: headerTextColor,
        }}
      >
        <div className="header-left">
          {logo && (
            <div>
              <img src={logo} alt="Logo" loading="lazy" />
            </div>
          )}
          {header && <span className="text-base">{header}</span>}
        </div>

        {onClose && (
          <button className="text-lg " onClick={onClose}>
            &times;
          </button>
        )}
      </div>

      <div className="form-bodyB">{children}</div>
    </div>
  );
};

export default Centralisedheaderbody;
