import AnalyticsButton from "../components/AnalyticsButton";
import BottomFilterSummary from "../components/BottomFilterSummary";
import FilterToolbar from "../components/FilterToolbar";
import LeftSidebar from "../components/LeftSidebar";
import MapSidebar from "../components/MapSidebar";
import ZoomSidebar from "../components/ZoomSidebar";
import MapView from "../components/map/MapView";
import { ArchiveProductDetails } from "../components/sidebar/component/ArchiveProductDetails";
import { useArchiveInfoStore } from "../hooks/useArchiveInfoStore";

export const DataPage = () => {
  const { infoProduct, setInfoProduct } = useArchiveInfoStore();
  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-100">
      <MapView />
      <LeftSidebar />
      <MapSidebar />
      <ZoomSidebar />
      <AnalyticsButton />
      <FilterToolbar />
      <BottomFilterSummary />
      {infoProduct && (
        <ArchiveProductDetails product={infoProduct} onClose={() => setInfoProduct(null)} />
      )}
    </div>
  );
};
