import React from "react";

interface AoiDrawIconProps {
  className?: string;
}

export const AoiDrawIcon: React.FC<AoiDrawIconProps> = ({ className = "w-8 h-8 text-primary" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" strokeDasharray="2 2" />
    <circle cx="12" cy="3" r="2" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="20" cy="7.5" r="2" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="20" cy="16.5" r="2" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="21" r="2" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="4" cy="16.5" r="2" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="4" cy="7.5" r="2" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <path d="M18 10L14 14L13 18L17 17L21 13L18 10Z" fill="currentColor" />
  </svg>
);
