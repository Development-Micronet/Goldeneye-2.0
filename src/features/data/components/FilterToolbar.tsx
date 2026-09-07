import { useMapSidebarStore } from "../hooks/useMapSidebarStore";
import { useParameter } from "../hooks/useParameter";
import CloudCoverageSwitcher from "./CloudCoverageSwitcher";
import DateFilter from "./DateFilter";
import IncidentAngleSwitcher from "./IncidentAngleSwitcher";
import ProductSwitcher from "./ProductSwitcher";

const FilterToolbar = () => {
  const activeIndex = useMapSidebarStore((state) => state.activeIndex);
  const isSidebarOpen = activeIndex !== null;
  const { tab } = useParameter();
  const isAnyTabOpen = tab !== "none";

  return (
    <div
      className={`absolute top-3.5 flex -translate-x-1/2 items-center gap-1.5 sm:gap-2 md:gap-3 transition-all duration-300 ${
        isAnyTabOpen ? "z-[100]" : "z-30"
      } ${
        isSidebarOpen
          ? "hidden lg:flex lg:left-[calc((100%-615px)/2+32px)]"
          : "left-1/2"
      }`}
    >
      <ProductSwitcher />
      <CloudCoverageSwitcher />
      <IncidentAngleSwitcher />
      <DateFilter />
    </div>
  );
};

export default FilterToolbar;
