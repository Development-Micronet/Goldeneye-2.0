import React, { useState, useEffect } from "react";
import "./GeopicxPopupModals.css";

interface GeopicxPopupModalsProps {
  isOpen: boolean;
  type?: string;
  logo?: string;
  icon?: string;
  modalHeaderHeading?: string;
  modalBodyHeading?: string;
  children?: React.ReactNode;
  message?: string;
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

const GeopicxPopupModals: React.FC<GeopicxPopupModalsProps> = ({
  isOpen,
  type,
  icon,
  modalBodyHeading,
  message,
  onConfirm,
  onCancel,
  confirmButtonText = "CONFIRM",
  cancelButtonText = "Cancel",
}) => {
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  const renderButtons = () => {
    if (type === "confirm") {
      return (
        <>
          <button className="GeopicxModalConfirmButton" onClick={onConfirm}>
            {confirmButtonText}
          </button>
          <button className="GeopicxModalCancelButton" onClick={onCancel}>
            {cancelButtonText}
          </button>
        </>
      );
    }
    return (
      <button className="GeopicxModalConfirmButton" onClick={onConfirm}>
        {confirmButtonText}
      </button>
    );
  };

  return (
    <div className={`GeopicxModalOverlay ${!isOpen ? "fadeOut" : ""}`}>
      <div className={`GeopicxModal GeopicxModal--${type} ${!isOpen ? "slideOut" : ""}`}>
        <div className="GeopicxModalBody ">
          {icon && <img src={icon} alt={`${type} icon`} className="GeopicxModalIcon" />}
          <h2 className="GeopicxModalHeading">{modalBodyHeading}</h2>
          <div className="GeopicxModalMessageBox">
            <div
              className="GeopicxModalMessage "
              dangerouslySetInnerHTML={{ __html: message || "" }}
            />
          </div>
        </div>
        <div className="GeopicxModalFooter">{renderButtons()}</div>
      </div>
    </div>
  );
};

export default GeopicxPopupModals;
