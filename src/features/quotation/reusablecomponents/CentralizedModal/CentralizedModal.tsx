import React, { useState, useEffect } from "react";
import Close from "../../assets/Icons/sidebar-icons/Close.jpg";

interface CentralizedModalProps {
  show: boolean;
  handleClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const CentralizedModal: React.FC<CentralizedModalProps> = ({
  show,
  handleClose,
  children,
}) => {
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
      className={`fixed inset-0 bg-black bg-opacity-50 flex justify-center w-[100vw] items-center z-50 transition-opacity duration-300 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`bg-white rounded-lg mx-3 shadow-lg mt-4 min-w-max pb-4 md:w-auto lg:w-auto xl:w-[70vw] transform transition-transform duration-300 ${
          show ? "scale-100" : "scale-95"
        }`}
      >
        <div className="p-4">
          <div className="flex justify-end items-start ">
            <button
              onClick={handleClose}
              className="text-black hover:text-red-500 transition duration-200 "
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
