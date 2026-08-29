import React from "react";
import { useScreenshotStore } from "../../mystore/features/useScreenshotStore";

interface ScreenshotButtonProps {
  fileName?: string;
}

export function ScreenshotButton({ fileName = "screenshot.png" }: ScreenshotButtonProps) {
  const loading = useScreenshotStore((state) => state.loading);
  const captureScreenshot = useScreenshotStore((state) => state.captureScreenshot);

  const handleScreenshot = async () => {
    const result = await captureScreenshot();

    if (result.meta.requestStatus === "fulfilled" && result.payload) {
      const link = document.createElement("a");
      link.href = result.payload.base64;
      link.download = fileName;
      link.click();
    }
  };

  return (
    <button
      onClick={handleScreenshot}
      disabled={loading}
      className="bg-primary-600 hover:bg-primary-500 flex items-center gap-2 rounded-lg px-3 py-2 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Capturing...
        </>
      ) : (
        <>📸 Take Screenshot</>
      )}
    </button>
  );
}
