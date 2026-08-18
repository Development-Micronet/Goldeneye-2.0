import LeftSidebar from "../component/LeftSidebar";
import MapSidebar from "../component/MapSidebar";
import MapView from "./MapView";
import LocationSearch from "../component/LocationSearch";


export default function MapLayout() {

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Map */}
      <MapView />

      {/* Location search bar */}
      <LocationSearch />

      {/* Tools Sidebar */}
      <LeftSidebar />
      {/* mapsiderbar */}
      <MapSidebar />
    </div>
  );
}
