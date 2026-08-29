import React, { useState, useEffect } from "react";
import Close from "../../assets/Icons/sidebar-icons/Close.jpg";

interface CentralizedModalProps {
  show: boolean;
  handleClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const CentralizedModal: React.FC<CentralizedModalProps> = ({ show, handleClose, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!show && !isVisible) return null;

  return (
    <div
      className={`bg-opacity-50 fixed inset-0 z-50 flex w-[100vw] items-center justify-center bg-black transition-opacity duration-300 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`mx-3 mt-4 min-w-max transform rounded-lg bg-white pb-4 shadow-lg transition-transform duration-300 md:w-auto lg:w-auto xl:w-[70vw] ${
          show ? "scale-100" : "scale-95"
        }`}
      >
        <div className="p-4">
          <div className="flex items-start justify-end">
            <button
              onClick={handleClose}
              className="text-black transition duration-200 hover:text-red-500"
            >
              <img src={Close} alt="Close" className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default CentralizedModal;
