import { useMapStore } from "../store/useMapStore";

export function useMapOptions() {
  const activeTool = useMapStore((state) => state.activeTool);
  const setActiveTool = useMapStore((state) => state.setActiveTool);
  const pointBufferDistance = useMapStore((state) => state.pointBufferDistance);
  const resetMapState = useMapStore((state) => state.resetMapState);
  const drawRectangleCoords = useMapStore((state) => state.drawRectangleCoords);
  const setDrawRectangleCoords = useMapStore((state) => state.setDrawRectangleCoords);
   const plotCoordinates = useMapStore((state) => state.plotCoordinates);
  const setPlotCoordinates = useMapStore(
    (state) => state.setPlotCoordinates
  );
  return {
    activeTool,
    setActiveTool,
    pointBufferDistance,
    resetMapState,
    drawRectangleCoords,
    setDrawRectangleCoords,
    plotCoordinates,
    setPlotCoordinates,
  };
}
