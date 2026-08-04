import React from "react";
import Draggable from "react-draggable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons";
import "./StkeyButton.css";

interface StkeyButtonProps {
  className?: string;
  icon?: any;
  isDraggable?: boolean;
}

const StkeyButton: React.FC<StkeyButtonProps> = ({
  className,
  icon,
  isDraggable = true,
}) => {
  const handleGoBack = () => {
    window.history.back();
  };

  const ButtonContent = (
    <button
      className={className || "px-3 py-2 bg-[#2c6671] text-white hover:bg-[#204e57] rounded-lg shadow font-medium transition-colors stkey-button"}
      title="Back"
      onClick={handleGoBack}
    >
      <FontAwesomeIcon icon={icon || faAngleLeft} />
    </button>
  );

  return isDraggable ? (
    <Draggable bounds="parent">{ButtonContent}</Draggable>
  ) : (
    ButtonContent
  );
};

export default StkeyButton;
