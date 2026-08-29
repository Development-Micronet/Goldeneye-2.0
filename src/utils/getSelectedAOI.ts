import { useSelectedAOIStore } from "../features/data/hooks/useSelectedAOIStore";
import { useLayersStore } from "../store/useLayersStore";

export const getSelectedAOI = () => {
  const { layers } = useLayersStore.getState();

  const { selectedAOIId } = useSelectedAOIStore.getState();

  const layer = layers.find((l) => l.id === selectedAOIId);

  if (!layer) return null;

  return layer.geojson.geometry;
};
