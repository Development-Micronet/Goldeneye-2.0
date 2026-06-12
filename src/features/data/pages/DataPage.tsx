import MapView from "../components/map/MapView";
import MapSidebar from "../components/MapSidebar";
import LeftSidebar from "../components/LeftSidebar";

export const DataPage = () => {
  return (
    <div className="w-full h-full relative bg-gray-100 overflow-hidden">
      <MapView />
      <LeftSidebar />
      <MapSidebar />
    </div>
  );
};
