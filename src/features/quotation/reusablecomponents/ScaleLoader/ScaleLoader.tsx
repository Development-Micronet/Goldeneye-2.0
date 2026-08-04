import React from "react";

interface ScaleLoaderProps {
  loading?: boolean;
  color?: string;
  speedMultiplier?: number;
  cssOverride?: React.CSSProperties;
  height?: number | string;
  width?: number | string;
  radius?: number | string;
  margin?: number | string;
  [key: string]: any;
}

const ScaleLoader: React.FC<ScaleLoaderProps> = ({
  loading = true,
  color = "#000000",
  speedMultiplier = 1,
  cssOverride = {},
  height = 35,
  width = 4,
  radius = 2,
  margin = 2,
  ...additionalprops
}) => {
  if (!loading) return null;

  const wrapper: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    ...cssOverride,
  };

  const style = (i: number): React.CSSProperties => ({
    backgroundColor: color,
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    margin: typeof margin === "number" ? `${margin}px` : margin,
    borderRadius: typeof radius === "number" ? `${radius}px` : radius,
    display: "inline-block",
    animation: `scaleLoaderKeyframe ${1 / speedMultiplier}s ${i * 0.1}s infinite cubic-bezier(0.2, 0.68, 0.18, 1.08)`,
    animationFillMode: "both",
  });

  return (
    <>
      <style>{`
        @keyframes scaleLoaderKeyframe {
          0% { transform: scaleY(1.0); }
          50% { transform: scaleY(0.4); }
          100% { transform: scaleY(1.0); }
        }
      `}</style>
      <span style={wrapper} {...additionalprops}>
        <span style={style(1)} />
        <span style={style(2)} />
        <span style={style(3)} />
        <span style={style(4)} />
        <span style={style(5)} />
      </span>
    </>
  );
};

export default ScaleLoader;
