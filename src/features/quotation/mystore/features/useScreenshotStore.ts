import { create } from "zustand";

interface ScreenshotStore {
  base64: string | null;
  timestamp: number | null;
  loading: boolean;
  error: any;
  captureScreenshot: () => Promise<{
    meta: { requestStatus: "fulfilled" | "rejected" };
    payload?: { base64: string; timestamp: number };
  }>;
  clearScreenshot: () => void;
}

const captureMapCanvas = (): string | null => {
  try {
    const viewport =
      document.querySelector(".ol-viewport") ||
      document.querySelector("#map") ||
      document.querySelector(".map-container");

    if (!viewport) return null;

    const canvases = Array.from(viewport.querySelectorAll("canvas")) as HTMLCanvasElement[];

    if (!canvases || canvases.length === 0) return null;

    const viewportRect = viewport.getBoundingClientRect();
    const width = viewportRect.width || viewport.clientWidth || 1200;
    const height = viewportRect.height || viewport.clientHeight || 800;

    const compositeCanvas = document.createElement("canvas");
    compositeCanvas.width = width;
    compositeCanvas.height = height;
    const ctx = compositeCanvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    let drawnCount = 0;
    canvases.forEach((canvas) => {
      if (canvas.width > 0 && canvas.height > 0) {
        const opacity = canvas.style.opacity ? parseFloat(canvas.style.opacity) : 1;
        ctx.globalAlpha = isNaN(opacity) ? 1 : opacity;

        const rect = canvas.getBoundingClientRect();
        const x = rect.left - viewportRect.left;
        const y = rect.top - viewportRect.top;

        ctx.drawImage(canvas, x, y, rect.width, rect.height);
        drawnCount++;
      }
    });

    ctx.globalAlpha = 1;

    if (drawnCount === 0) return null;

    return compositeCanvas.toDataURL("image/png");
  } catch (e: any) {
    if (e?.name === "SecurityError") {
      console.warn(
        "Direct map canvas capture tainted by CORS tiles, switching to display media capture fallback.",
      );
    } else {
      console.error("Direct map canvas capture error:", e);
    }
    return null;
  }
};

const captureWithDisplayMedia = async (): Promise<string | null> => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "browser",
        width: { ideal: window.screen.width },
        height: { ideal: window.screen.height },
      },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
    } as any);

    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => video.play().then(resolve).catch(reject);
      video.onerror = reject;
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => setTimeout(resolve, 250));

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    stream.getTracks().forEach((track) => track.stop());

    return canvas.toDataURL("image/png");
  } catch (e) {
    console.error("DisplayMedia capture fallback error:", e);
    return null;
  }
};

export const useScreenshotStore = create<ScreenshotStore>((set) => ({
  base64: null,
  timestamp: null,
  loading: false,
  error: null,

  clearScreenshot: () => set({ base64: null, timestamp: null, error: null }),

  captureScreenshot: async () => {
    set({ loading: true, error: null });
    try {
      // 1. Try silent direct OpenLayers map canvas export with exact bounding rect positioning
      let base64 = captureMapCanvas();

      // 2. Fallback to DisplayMedia stream if map canvas capture returns empty/invalid
      if (!base64 || base64.length < 1000) {
        base64 = await captureWithDisplayMedia();
      }

      if (!base64) {
        set({ loading: false, error: "Failed to capture screenshot" });
        return { meta: { requestStatus: "rejected" } };
      }

      const payload = { base64, timestamp: Date.now() };
      set({ base64, timestamp: payload.timestamp, loading: false, error: null });
      return { meta: { requestStatus: "fulfilled" }, payload };
    } catch (err: any) {
      console.error("Screenshot capture error:", err);
      set({ loading: false, error: err?.message || "Screenshot failed" });
      return { meta: { requestStatus: "rejected" } };
    }
  },
}));
