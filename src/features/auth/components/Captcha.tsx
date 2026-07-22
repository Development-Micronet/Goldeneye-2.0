import React, { useEffect, useRef } from "react";

interface CaptchaProps {
  code: string;
  onRefresh: () => void;
}

export const Captcha: React.FC<CaptchaProps> = ({ code, onRefresh }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawCaptcha = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background fill
    ctx.fillStyle = "#f1f5f9"; // slate-100
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid background pattern similar to the image
    ctx.strokeStyle = "#cbd5e1"; // slate-300
    ctx.lineWidth = 1;

    // Horizontal lines
    for (let i = 0; i < canvas.height; i += 4) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Add extra random noise lines for captcha authenticity
    ctx.strokeStyle = "#94a3b8"; // slate-400
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Draw characters with random rotations and styles
    ctx.font = 'bold 22px "Courier New", Courier, monospace';
    ctx.textBaseline = "middle";

    // Adjust character placement dynamically
    const charWidth = (canvas.width - 24) / code.length;
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      ctx.save();

      const x = 12 + i * charWidth + Math.random() * 4;
      const y = canvas.height / 2 + (Math.random() * 6 - 3);

      ctx.translate(x, y);
      const angle = ((Math.random() * 20 - 10) * Math.PI) / 180;
      ctx.rotate(angle);

      // Alternating dark colors
      ctx.fillStyle = i % 2 === 0 ? "#1e3a8a" : "#1e5d66";

      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  };

  useEffect(() => {
    drawCaptcha();
  }, [code]);

  return (
    <div className="flex items-center gap-2">
      <canvas
        ref={canvasRef}
        width={130}
        height={42}
        className="cursor-pointer rounded border border-gray-300 select-none"
        onClick={onRefresh}
        title="Click to refresh CAPTCHA"
      />
      <button
        type="button"
        onClick={onRefresh}
        className="rounded-full p-2 text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700"
        title="Refresh CAPTCHA"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="animate-spin-hover h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
      </button>
    </div>
  );
};
