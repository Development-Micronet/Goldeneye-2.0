import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./Button.css";

interface CentraliseButtonProps {
  text: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  icon?: string;
  iconPosition?: "left" | "right";
  type?: "button" | "submit" | "reset";
  className?: string;
  disabled?: boolean | string;
  variant?: string;
  fontAwesomeIcon?: any;
  padding?: string;
  hoverBgColor?: string;
  hoverTextColor?: string;
  hoverBorderColor?: string;
  textColor?: string;
  borderColor?: string;
  width?: string | null;
  margin?: string | null;
  fontsize?: string;
}

const CentraliseButton: React.FC<CentraliseButtonProps> = ({
  text,
  onClick,
  icon,
  iconPosition = "left",
  type = "button",
  className = "",
  disabled = false,
  variant = "transparent",
  fontAwesomeIcon,
  padding = "10px 20px",
  hoverBgColor = "#ccc",
  hoverTextColor = "#000",
  hoverBorderColor = "transparent",
  textColor = "#fff",
  borderColor = "transparent",
  width = null,
  margin = null,
  fontsize = "18px",
}) => {
  const [isClicked] = useState(false);

  const customStyles: any = {
    "--bg-color": variant,
    "--padding": padding,
    "--hover-bg-color": hoverBgColor,
    "--hover-text-color": hoverTextColor,
    "--hover-border-color": hoverBorderColor,
    "--text-color": textColor,
    "--border-color": borderColor,
    width: width,
    margin: margin,
    fontSize: fontsize,
  };

  return (
    <button
      type={type}
      className={`custom-button ${className} ${isClicked ? "clicked" : ""} ${disabled ? "disabled" : ""}`}
      onClick={onClick}
      disabled={Boolean(disabled)}
      style={customStyles}
    >
      {icon && iconPosition === "left" && !fontAwesomeIcon && (
        <img src={icon} alt="icon" className="button-icon-left" />
      )}
      {fontAwesomeIcon && iconPosition === "left" && (
        <FontAwesomeIcon icon={fontAwesomeIcon} className="button-icon-left" />
      )}
      {text}
      {icon && iconPosition === "right" && !fontAwesomeIcon && (
        <img src={icon} alt="icon" className="button-icon-right" />
      )}
      {fontAwesomeIcon && iconPosition === "right" && (
        <FontAwesomeIcon icon={fontAwesomeIcon} className="button-icon-right" />
      )}
    </button>
  );
};

export default CentraliseButton;
