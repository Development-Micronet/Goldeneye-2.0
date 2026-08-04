import React from "react";
import "./CustomBtn.css";

interface CustomBtnProps {
  type?: "button" | "submit" | "reset";
  label: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  disabled?: boolean;
}

const CustomBtn: React.FC<CustomBtnProps> = ({
  type = "button",
  label,
  onClick = () => {},
  className = "",
  disabled = false,
}) => {
  return (
    <button
      disabled={disabled}
      type={type}
      className={className}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

export default CustomBtn;
