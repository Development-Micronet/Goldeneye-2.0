import { FiChevronDown, FiPackage } from "react-icons/fi";
import React, { useState } from "react";
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
  const [expanded, setExpanded] = useState<string[]>([]);
  const [expandAll, setExpandAll] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const { selectedItems, addProduct, removeProduct, clearProducts, setProducts, isSelected } =
    useProductStore();
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
        className={`flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 text-xs font-medium shadow-md transition ${
          open ? "bg-primary/10 text-primary" : "hover:text-primary text-gray-700 hover:bg-cyan-50"
        }`}
      >
        <FiPackage size={16} />
        <span>Products</span>
      </button>

      {/* Product Window */}
      {open && (
        <div className="absolute top-[150%] right-[10%] w-190 rounded-xl border border-gray-300 bg-white p-4 shadow-2xl">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between border-b pb-2">
            <div>
              <h3 className="text-base font-semibold text-gray-800">Products</h3>
              <p className="text-xs text-gray-500">
                Choose products like Pléiades Neo, SPOT, and Pléiades imagery.
              </p>
            </div>
            <div className="text-xs text-gray-600">Selected Products: {selectedItems.length}</div>
            <button
              onClick={() => setTab("none")}
              className="text-xl text-gray-500 hover:text-gray-800"
            >
              ×
            </button>
          </div>

          {/* Options */}
          <div className="mb-4 flex gap-8 text-sm text-gray-700">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="h-3.5 w-3.5"
              />
              Select All
            </label>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={expandAll}
                onChange={handleExpandAll}
                className="h-3.5 w-3.5"
              />
              Expand All
            </label>
          </div>

          {/* Categories */}
          <div className="product-scroll max-h-75 overflow-y-auto pr-1">
            {Object.entries(products).map(([category, categoryItems]) => (
              <div key={category} className="mb-3">
                {/* Category title */}
                <div className="mb-2 border border-gray-200 bg-cyan-50 px-2 py-1.5 text-sm font-semibold text-gray-800">
                  {category}
                </div>

                {/* Products grid */}
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(categoryItems).map(([product, items]) => (
                    <div key={product}>
                      {/* Product dropdown */}
                      <button
                        onClick={() => toggleExpand(product)}
                        className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-2 py-2 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={getProductSubcategories(product).every((sub) =>
                              selectedItems.some((x) => x.subcategory === sub),
                            )}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleProduct(product)}
                            className="h-3.5 w-3.5"
                          />

                          {product}
                        </span>

                        <FiChevronDown
                          size={15}
                          className={`text-cyan-700 transition-transform ${expanded.includes(product) ? "rotate-180" : ""} `}
                        />
                      </button>

                      {/* Subcategory list */}
                      {expanded.includes(product) && (
                        <div className="mt-1 rounded-md bg-gray-50 p-2">
                          {items.map((item) => (
                            <label
                              key={item.Subcategory}
                              className="flex items-center gap-2 py-1 text-[11px] text-gray-700"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected(item.Subcategory)}
                                onChange={() => {
                                  const exists = isSelected(item.Subcategory);

                                  if (exists) {
                                    removeProduct(item.Subcategory);
                                  } else {
                                    addProduct({
                                      product,
                                      resolution: getResolution(item.Subcategory),
                                      subcategory: item.Subcategory,
                                      sensor: getSensor(item.Subcategory),
                                    });
                                  }
                                }}
                                className="h-3 w-3"
                              />
                              <span className={!item.isAvailable ? "text-gray-400" : ""}>
                                {item.Subcategory}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default ProductSwitcher;
