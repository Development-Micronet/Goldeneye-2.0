import React from "react";

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full min-w-md max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 p-4">
        <div className="flex justify-between items-center border-b pb-1">
          <h3 className="text-xl font-semibold text-gray-900 ">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:bg-gray-200 rounded-full p-2 dark:hover:bg-gray-600"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
};

export default CustomModal;
