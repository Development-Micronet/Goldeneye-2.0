import { FiPackage } from "react-icons/fi";
import React, { useState, useEffect } from "react";
import { useParameter } from "../hooks/useParameter";
import { useProductStore } from "../hooks/useproductStore";

type ProductItem = {
  Subcategory: string;
  Description: string;
  isAvailable: boolean;
  isAssigned: boolean;
};

type Products = Record<string, Record<string, ProductItem[]>>;

const ProductSwitcher: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { accessToken } = useAuthStore();
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  const {
    providers,
    selectedProvider,
    selectedSensors,
    setProviders,
    setSelectedProvider,
    setSelectedSensors,
    toggleSensor,
  } = useProductStore();

  const { tab, setTab } = useParameter();
  const open = tab === "products";
  const products: Products = {
    "Optical (Archive)": {
      "Pleiades Neo (0.3m)": [
        {
          Subcategory: "Pleiades-Neo-0.3m-MONO",
          Description: "",
          isAvailable: false,
          isAssigned: true,
        },
        {
          Subcategory: "Pleiades-Neo-0.3m-STEREO",
          Description: "",
          isAvailable: false,
          isAssigned: true,
        },
        {
          Subcategory: "Pleiades-Neo-0.3m-TRISTEREO",
          Description: "",
          isAvailable: false,
          isAssigned: true,
        },
      ],

      DMC: [
        {
          Subcategory: "UK-DMC2-32m",
          Description: "",
          isAvailable: false,
          isAssigned: true,
        },
        {
          Subcategory: "UK-DMC2-22m",
          Description: "",
          isAvailable: false,
          isAssigned: true,
        },
      ],

      Spot: [
        {
          Subcategory: "SPOT 1.5-m-MONO",
          Description: "",
          isAvailable: false,
          isAssigned: true,
        },
        {
          Subcategory: "SPOT 1.5-m-STEREO",
          Description: "",
          isAvailable: false,
          isAssigned: true,
        },
        {
          Subcategory: "SPOT 1.5-m-TRISTEREO",
          Description: "",
          isAvailable: false,
          isAssigned: true,
        },
      ],

      "Pleiades (0.5m)": [
        {
          Subcategory: "Pleiades-0.5m-MONO",
          Description: "",
          isAvailable: false,
          isAssigned: true,
        },
        {
          Subcategory: "Pleiades-0.5m-STEREO",
          Description: "",
          isAvailable: false,
          isAssigned: true,
        },
        {
          Subcategory: "Pleiades-0.5m-TRISTEREO",
          Description: "",
          isAvailable: false,
          isAssigned: true,
        },
      ],
    },

    Elevation: {
      Elevation: [
        {
          Subcategory: "E30 -DSM",
          Description: "",
          isAvailable: false,
          isAssigned: true,
        },
        {
          Subcategory: "E30 -DSM -Quality Layers",
          Description: "",
          isAvailable: false,
          isAssigned: true,
        },
        {
          Subcategory: "E30 -DSM -Quality Layers + Ortho",
          Description: "",
          isAvailable: false,
          isAssigned: true,
        },
      ],
    },
  };
  const allProducts = Object.values(products).flatMap((category) => Object.keys(category));

  const getSensor = (subcategory: string) => {
    if (subcategory.startsWith("Pleiades-Neo")) {
      return "PNEO";
    }

    if (subcategory.startsWith("Pleiades-0.5")) {
      return "PLEIADES";
    }

    if (subcategory.startsWith("SPOT")) {
      return "SPOT";
    }

    if (subcategory.startsWith("UK-DMC")) {
      return "DMC";
    }

    if (subcategory.startsWith("E30")) {
      return "ELEVATION";
    }

    return "";
  };

  const getProductSubcategories = (productName: string) => {
    for (const category of Object.values(products)) {
      if (category[productName]) {
        return category[productName].map((item) => item.Subcategory);
      }
    }

    return [];
  };
  const toggleProduct = (product: string) => {
    const subs = getProductSubcategories(product);
    const alreadySelected = subs.every((sub) => selectedItems.some((x) => x.subcategory === sub));

    if (alreadySelected) {
      subs.forEach((sub) => {
        removeProduct(sub);
      });
    } else {
      const items = subs.map((sub) => ({
        product,
        resolution: getResolution(sub),
        subcategory: sub,
        sensor: getSensor(sub),
      }));

      setProducts([...selectedItems, ...items]);
    }
  };
  const toggleExpand = (name: string) => {
    setExpanded((prev) => {
      const updated = prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name];

      setExpandAll(updated.length === allProducts.length);

      return updated;
    });
  };
  const handleExpandAll = () => {
    if (expandAll) {
      setExpanded([]);
    } else {
      setExpanded(allProducts);
    }

    setExpandAll(!expandAll);
  };
  const handleSelectAll = () => {
    if (selectAll) {
      clearProducts();
      setSelectAll(false);
      return;
    }

    const all = Object.entries(products).flatMap(([category, categoryItems]) =>
      Object.entries(categoryItems).flatMap(([product, items]) =>
        items.map((item) => ({
          category,
          product,
          resolution: getResolution(item.Subcategory),
          subcategory: item.Subcategory,
          sensor: getSensor(item.Subcategory),
        })),
      ),
    );

    setProducts(all);
    setSelectAll(true);
  };
  const getResolution = (subcategory: string) => {
    const match = subcategory.match(/(\d+\.?\d*m)/);

    return match ? match[1] : "";
  };

  // console.log(selectedItems || []);
  return (
    <>
      <style>
        {`
  .product-scroll::-webkit-scrollbar {
    width: 6px;
  }

  .product-scroll::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 999px;
  }

  .product-scroll::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 999px;
  }

  .product-scroll::-webkit-scrollbar-thumb:hover {
    background: #64748b;
  }

  /* Firefox */
  .product-scroll {
    scrollbar-width: thin;
    scrollbar-color: #94a3b8 #f1f5f9;
  }
`}
      </style>

      {/* Product Icon */}
      <button
        onClick={() => setTab(open ? "none" : "products")}
        className={`flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 text-xs font-semibold shadow-sm transition-all duration-200 ${
          open
            ? "bg-primary-100 text-primary border-primary/30"
            : "hover:text-primary text-gray-700 hover:bg-primary-100"
        }`}
      >
        <FiPackage size={14} className="stroke-[2.5]" />
        <span>Products</span>
      </button>

      {/* Product Window */}
      {open && (
        <div className="absolute top-[150%] right-[10%] w-96 rounded-xl border border-gray-200 bg-white p-5 shadow-xl z-[9999] text-left animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Satellite Products</h3>
              <p className="text-[11px] text-gray-400">
                Select a provider and choose satellite sensors.
              </p>
            </div>
            <button
              onClick={() => setTab("none")}
              className="text-gray-400 hover:text-gray-600 transition-colors text-xl font-medium leading-none"
            >
              ×
            </button>
          </div>

          {/* Provider Selection */}
          <div className="mb-4">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Provider
            </span>
            <div className="flex gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200/60">
              {(providers || []).map((p) => {
                const isActive = selectedProvider === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setSelectedProvider(p.name)}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-800 hover:bg-white hover:shadow-xs"
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sensor Selection Header / Options */}
          <div className="mb-3 flex items-center justify-between border-t border-gray-50 pt-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Sensors ({(selectedSensors || []).length} selected)
            </span>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors select-none font-medium">
              <input
                type="checkbox"
                checked={
                  currentProviderObj?.sensors?.length
                    ? currentProviderObj.sensors.every((s) => (selectedSensors || []).includes(s))
                    : false
                }
                onChange={() => {
                  if (!currentProviderObj?.sensors) return;
                  const allSelected = currentProviderObj.sensors.every((s) => (selectedSensors || []).includes(s));
                  if (allSelected) {
                    // Remove current provider's sensors
                    setSelectedSensors((selectedSensors || []).filter((s) => !currentProviderObj.sensors.includes(s)));
                  } else {
                    // Add missing ones
                    const otherSensors = (selectedSensors || []).filter((s) => !currentProviderObj.sensors.includes(s));
                    setSelectedSensors([...otherSensors, ...currentProviderObj.sensors]);
                  }
                }}
                className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-2 accent-primary cursor-pointer"
              />
              Select All
            </label>
          </div>

          {/* Sensor Grid */}
          <div className="product-scroll max-h-60 overflow-y-auto pr-1">
            {currentProviderObj?.sensors ? (
              <div className="grid grid-cols-2 gap-2">
                {currentProviderObj.sensors.map((sensor) => {
                  const checked = (selectedSensors || []).includes(sensor);
                  return (
                    <label
                      key={sensor}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none transition-all duration-200 ${
                        checked
                          ? "border-primary/50 bg-primary-100 text-primary font-semibold shadow-xs"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSensor(sensor)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-1 accent-primary cursor-pointer"
                      />
                      <span className="text-xs">{sensor}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                {isLoading ? "Loading sensors..." : "No provider selected"}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ProductSwitcher;
