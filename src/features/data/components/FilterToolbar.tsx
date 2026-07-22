import CloudCoverageSwitcher from "./CloudCoverageSwitcher";
import DateFilter from "./DateFilter";
import IncidentAngleSwitcher from "./IncidentAngleSwitcher";
import ProductSwitcher from "./ProductSwitcher";

const FilterToolbar = () => {
  return (
    <div className="fixed top-[8%] left-1/2 z-50 flex -translate-x-[60%] items-center gap-3">
      <ProductSwitcher />
      <CloudCoverageSwitcher />
      <IncidentAngleSwitcher />
      <DateFilter />
    </div>
  );
};

export default FilterToolbar;