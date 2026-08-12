import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { ChevronDown, Lock, LogOut, MapPin, Menu, Search, User, X } from "lucide-react";
import { goldeneyeLogo } from "../../../assets";
import { performLogout } from "../../../features/auth/api/logout";
import { useAuthStore } from "../../../store/useAuthStore";
import { getNavigationItems } from "../../../utils/navigation";
import { useScreenshotStore } from "../../../features/quotation/mystore/features/useScreenshotStore";
import { useImageStore } from "../../../features/quotation/mystore/features/useImageStore";
import { useQuotationItemStore } from "../../../features/quotation/mystore/features/useQuotationItemStore";
import { toast } from "react-toastify";
import { useProductStore } from "../../../features/data/hooks/useproductStore";
import { useArchiveProductStore } from "../../../features/data/components/sidebar/store/useArchiveProductStore";
import { useMapStore } from "../../../features/data/store/useMapStore";

const PRODUCT_NAME_MAP: Record<string, string> = {
  PNEO: "Pleiades-Neo-0.3m",
  PHR: "Pleiades-0.5m",
  SPOT: "SPOT 1.5-m",
  DMC: "UK-DMC2",
  Elevation: "E30 -DSM",
};

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuotationDropdownOpen, setIsQuotationDropdownOpen] = useState(false);
  const quotationDropdownRef = useRef<HTMLDivElement>(null);

  const setSearchLocation = useMapStore((state) => state.setSearchLocation);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const captureScreenshot = useScreenshotStore((state) => state.captureScreenshot);
  const setImages = useImageStore((state) => state.setImages);
  const quotationItem = useQuotationItemStore((state) => state.quotationItem);
  const setQuotationItems = useQuotationItemStore((state) => state.setQuotationItems);

  // Search location handler using Nominatim API
  const searchPlaces = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    setIsSearchingLocation(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data || []);
        setShowSearchDropdown(true);
      }
    } catch (err) {
      console.error("Geocoding search failed:", err);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchPlaces(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearchDropdown(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = (place: any) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    const boundingbox = place.boundingbox;

    setSearchLocation({
      id: Date.now(),
      lat,
      lon,
      displayName: place.display_name,
      boundingbox,
    });

    setShowSearchDropdown(false);
    setSearchQuery(place.display_name.split(",")[0]);

    if (location.pathname !== "/data") {
      navigate("/data");
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setShowSearchDropdown(false);
    setIsSearchingLocation(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          handleSelectLocation(data[0]);
        } else {
          toast.info("Location not found");
        }
      }
    } catch (err) {
      console.error("Geocoding search error:", err);
      toast.error("Failed to search location");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // Close search dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => {
    setIsOpen(false);
    setIsProfileOpen(false);
    setIsQuotationDropdownOpen(false);
  };
  const { user } = useAuthStore();
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-xs lg:text-sm font-medium transition-colors ${
      isActive ? "text-white " : "text-nav-inactive hover:text-white"
    }`;

  // Close profile dropdown when clicking outside
  useEffect(() => {
    if (!isProfileOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".profile-menu-container")) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isProfileOpen]);

  // Close quotation dropdown when clicking outside
  useEffect(() => {
    if (!isQuotationDropdownOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        quotationDropdownRef.current &&
        !quotationDropdownRef.current.contains(event.target as Node)
      ) {
        setIsQuotationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isQuotationDropdownOpen]);

  const parseRange = (val: any) => {
    if (!val) return "";
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  };

  const checkHasSelectedProducts = (): { hasProducts: boolean; data: any } => {
    // 1. Check useArchiveProductStore
    try {
      const archiveProducts = useArchiveProductStore?.getState?.()?.selectedProducts;
      if (Array.isArray(archiveProducts) && archiveProducts.length > 0) {
        return { hasProducts: true, data: archiveProducts };
      }
    } catch {}

    // 2. Check useProductStore
    try {
      const zustandItems = useProductStore?.getState?.()?.selectedItems;
      if (Array.isArray(zustandItems) && zustandItems.length > 0) {
        return { hasProducts: true, data: zustandItems };
      }
    } catch {}

    // 3. Check sessionStorage storedCheckedProductList
    const rawData = sessionStorage.getItem("storedCheckedProductList");
    let data: any = {};
    if (rawData) {
      try {
        data = JSON.parse(rawData);
      } catch {
        data = {};
      }
    }

    if (Array.isArray(data) && data.length > 0) {
      return { hasProducts: true, data };
    }

    if (data && typeof data === "object" && !Array.isArray(data)) {
      const hasKeys = Object.keys(data).length > 0;
      const hasValues = Object.values(data).some((val: any) => {
        if (Array.isArray(val)) return val.length > 0;
        return Boolean(val);
      });
      if (hasKeys && hasValues) {
        return { hasProducts: true, data };
      }
    }

    // 4. Check sessionStorage selectedProducts
    const rawSelected = sessionStorage.getItem("selectedProducts");
    if (rawSelected) {
      try {
        const parsed = JSON.parse(rawSelected);
        if (
          (Array.isArray(parsed) && parsed.length > 0) ||
          (typeof parsed === "object" && Object.keys(parsed).length > 0)
        ) {
          return { hasProducts: true, data: parsed };
        }
      } catch {}
    }

    return { hasProducts: false, data: {} };
  };

  const formatQuotationItems = (
    data: any,
    cloudCover: string,
    incidenceAngle: string,
    acquisitionDate: string,
    base64Image: any,
    screenshotImage: any,
    area: any
  ) => {
    if (!data) return [];
    const result: any[] = [];

    if (Array.isArray(data)) {
      data.forEach((itemObj: any) => {
        let itemName = "";
        if (typeof itemObj === "string") {
          itemName = itemObj;
        } else if (
          itemObj.name ||
          itemObj.item ||
          itemObj.product ||
          itemObj.subcategory ||
          itemObj.sensor
        ) {
          const pName =
            itemObj.name ||
            itemObj.product ||
            itemObj.subcategory ||
            itemObj.sensor ||
            "Selected Product";
          const res = itemObj.resolution ? `-${itemObj.resolution}m` : "";
          itemName = `${pName}${res}`;
        } else {
          itemName = "Selected Product";
        }

        result.push({
          item: itemName,
          unit: "Sqkm",
          qty: 1,
          price: 0,
          amount: 0,
          cloud_cover: itemObj.cloud_cover ?? parseRange(cloudCover),
          area: area || 25,
          angle: itemObj.incidenceAngle ?? parseRange(incidenceAngle),
          date:
            itemObj.date ||
            itemObj.acquisitionDate ||
            (acquisitionDate ? acquisitionDate.replace("]", "") : ""),
          base64Image: base64Image,
          screenshotImage: screenshotImage,
        });
      });
      return result;
    }

    if (typeof data === "object") {
      Object.entries(data).forEach(([key, values]: [string, any]) => {
        const baseName = PRODUCT_NAME_MAP[key] || key;

        if (Array.isArray(values)) {
          values.forEach((val: string) => {
            let itemName = "";
            if (key === "Elevation") {
              if (val.toLowerCase() === "dsm") {
                itemName = baseName;
              } else if (val.toLowerCase() === "quality layers") {
                itemName = `${baseName} -Quality Layers`;
              } else if (val.toLowerCase() === "quality layers + ortho") {
                itemName = `${baseName} -Quality Layers + Ortho`;
              }
            } else if (key === "DMC") {
              itemName = `${baseName}-${val}`;
            } else {
              itemName = `${baseName}-${val.toUpperCase()}`;
            }

            result.push({
              item: itemName,
              unit: "Sqkm",
              qty: 1,
              price: 0,
              amount: 0,
              cloud_cover: parseRange(cloudCover),
              area: area || 25,
              angle: parseRange(incidenceAngle),
              date: acquisitionDate ? acquisitionDate.replace("]", "") : "",
              base64Image: base64Image,
              screenshotImage: screenshotImage,
            });
          });
        }
      });
    }

    return result;
  };

  const handleAddQuotation = async () => {
    if (location.pathname !== "/data") {
      toast.info(
        "Please go to the Data page to select products and add to quotation."
      );
      navigate("/data");
      return;
    }

    const { hasProducts, data } = checkHasSelectedProducts();

    if (!hasProducts) {
      toast.warn(
        "Please draw an AOI on the map and select products from search results first."
      );
      return;
    }

    const screenshotResult = await captureScreenshot();
    const captured = screenshotResult?.payload?.base64 ?? null;
    const otherData = JSON.parse(sessionStorage.getItem("filter") || "{}");

    if (captured) {
      toast.success("✅ Map screenshot captured!");
      setImages([
        {
          dataUrl: captured,
          caption: `Map Screenshot`,
        },
      ]);
    }

    const formattedItems = formatQuotationItems(
      data,
      otherData?.cloudcover || "",
      otherData?.incidenceAngle || "",
      otherData?.acquisitionDate || "",
      null,
      null,
      sessionStorage.getItem("area") || otherData?.area || ""
    );

    setQuotationItems([...quotationItem, ...formattedItems]);

    navigate("/quotation?view=create");
    toast.success("✅ Products added to quotation successfully!");
  };

  const username = user?.user || "user";
  const initial = username[0]?.toUpperCase() || "U";
  // Filter navigation items based on user's roleName
  const navItems = getNavigationItems(user?.roleName);

  return (
    <nav className="bg-primary relative z-50 px-4 py-2 shadow-md sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        {/* Left: Logo & Desktop links */}
        <div className="flex items-center gap-4 sm:gap-6 lg:gap-10">
          <div className="flex items-center">
            {/* logo */}
            <img
              src={goldeneyeLogo}
              alt="Golden Eye Logo"
              className="h-8 w-auto object-contain sm:h-10 md:h-11 lg:h-13"
            />
          </div>

          {/* Desktop Navigation Links */}
          <div className="mt-1 hidden items-center gap-3 md:flex lg:gap-6 xl:gap-8">
            {navItems.map((item) => {
              if (item.label === "Quotation") {
                return (
                  <div
                    key={item.path}
                    ref={quotationDropdownRef}
                    className="relative inline-block group"
                  >
                    <button
                      type="button"
                      onClick={() => setIsQuotationDropdownOpen((prev) => !prev)}
                      className={`flex items-center gap-1 text-xs lg:text-sm font-medium transition-colors cursor-pointer ${
                        location.pathname.includes("/quotation")
                          ? "text-white font-bold"
                          : "text-nav-inactive hover:text-white"
                      }`}
                    >
                      <span>Quotation</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${
                          isQuotationDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <div
                      className={`absolute top-full left-0 mt-1.5 w-48 rounded-xl bg-white shadow-xl border border-gray-100 py-1.5 z-50 transition-all ${
                        isQuotationDropdownOpen ? "block" : "hidden group-hover:block"
                      }`}
                    >
                      <div className="py-1">
                        <NavLink
                          to="/quotation"
                          onClick={() => setIsQuotationDropdownOpen(false)}
                          className="block px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-[#2c6671]/10 hover:text-[#2c6671] transition-colors"
                        >
                          See All Quotations
                        </NavLink>

                        <button
                          type="button"
                          onClick={() => {
                            setIsQuotationDropdownOpen(false);
                            handleAddQuotation();
                          }}
                          className="w-full text-left block px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-[#2c6671]/10 hover:text-[#2c6671] cursor-pointer transition-colors"
                        >
                          Add Quotation Item
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <NavLink key={item.path} to={item.path} className={linkClass}>
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Right: Search & User Profile */}
        <div className="mt-1 hidden items-center gap-3 md:flex md:gap-6 lg:gap-10 xl:gap-15">
          {/* Search bar */}
          <div className="relative" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit}>
              <input
                type="text"
                placeholder="Go to place"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSearchDropdown(true);
                }}
                className="w-32 rounded border border-transparent bg-white px-3 py-1.5 pr-8 font-sans text-xs text-gray-800 placeholder-gray-400 transition-all duration-300 focus:w-40 focus:outline-none md:w-44 md:focus:w-52 lg:w-56 lg:focus:w-64 xl:w-70 xl:focus:w-80"
              />
              <button
                type="submit"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </form>

            {/* Search Results Dropdown */}
            {showSearchDropdown && (
              <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-full min-w-[240px] max-w-[320px] rounded-lg border border-gray-200 bg-white py-1 shadow-2xl max-h-60 overflow-y-auto text-xs">
                {isSearchingLocation ? (
                  <div className="px-3 py-2 text-gray-400 text-center text-xs">
                    Searching places...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((item, idx) => (
                    <div
                      key={item.place_id || idx}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectLocation(item);
                      }}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-start gap-2 border-b border-gray-100 last:border-0"
                    >
                      <MapPin className="h-3.5 w-3.5 text-[#2c6671] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">
                          {item.display_name.split(",")[0]}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">
                          {item.display_name}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-gray-400 text-center text-xs">
                    No places found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile Container with Click Trigger */}
          <div className="profile-menu-container relative">
            <div
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="group flex cursor-pointer items-center gap-2 select-none"
            >
              <span className="hidden text-xs font-semibold text-white transition-opacity group-hover:opacity-90 lg:inline lg:text-sm">
                {username}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white transition-transform group-hover:scale-105">
                {initial}
              </div>
            </div>

            {/* Profile Dropdown Popup/Modal */}
            {isProfileOpen && (
              <div className="absolute top-[calc(100%+12px)] right-0 z-50 flex w-64 flex-col items-center rounded-xl border border-gray-100 bg-white px-3 py-5 text-gray-800 shadow-2xl transition-all">
                {/* Arrow */}
                <div className="absolute -top-1.5 right-2.5 h-3.5 w-3.5 rotate-45 border-t border-l border-gray-100 bg-white"></div>

                {/* Big Avatar */}
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#1b7382] text-2xl font-bold text-white select-none">
                  {initial}
                </div>

                {/* Username */}
                <h4 className="mb-4 text-base font-semibold text-gray-800 select-none">
                  {username}
                </h4>

                {/* Navigation Options */}
                <div className="flex w-full flex-col gap-1">
                  <button className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                    <User className="h-4 w-4 text-gray-500" />
                    Update Account
                  </button>

                  <button className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                    <Lock className="h-4 w-4 text-gray-500" />
                    Change Password
                  </button>

                  <button
                    onClick={() => {
                      performLogout();
                      closeMenu();
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4 text-gray-500" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Hamburger Menu Button (Mobile Only) */}
        <div className="flex items-center md:hidden">
          <button
            onClick={toggleMenu}
            className="text-nav-inactive p-1 transition-colors hover:text-white focus:outline-none"
            aria-label="Toggle Menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isOpen && (
        <div className="bg-primary absolute top-full right-0 left-0 z-40 border-t border-[#1f4e57] shadow-xl md:hidden">
          <div className="flex flex-col gap-4 px-6 py-4">
            {/* Mobile Search bar */}
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Go to place"
                className="w-full rounded border border-transparent bg-white px-3 py-1.5 pr-8 font-sans text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
              />
              <Search className="absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 cursor-pointer text-gray-400" />
            </div>

            {navItems.map((item) => {
              if (item.label === "Quotation") {
                return (
                  <div key={item.path} className="flex flex-col gap-2">
                    <div
                      onClick={() => setIsQuotationDropdownOpen((prev) => !prev)}
                      className={`flex items-center justify-between text-xs lg:text-sm font-medium cursor-pointer ${
                        location.pathname.includes("/quotation")
                          ? "text-white font-bold"
                          : "text-nav-inactive hover:text-white"
                      }`}
                    >
                      <span>Quotation</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          isQuotationDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                    {isQuotationDropdownOpen && (
                      <div className="flex flex-col gap-2 pl-4 text-xs">
                        <NavLink
                          to="/quotation"
                          onClick={closeMenu}
                          className="text-white hover:underline font-semibold"
                        >
                          See All Quotations
                        </NavLink>
                        <button
                          type="button"
                          onClick={() => {
                            closeMenu();
                            handleAddQuotation();
                          }}
                          className="text-left text-white hover:underline font-semibold"
                        >
                          Add Quotation Item
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink key={item.path} to={item.path} className={linkClass} onClick={closeMenu}>
                  {item.label}
                </NavLink>
              );
            })}

            {/* Mobile User Profile */}
            <div className="profile-menu-container mt-1 border-t border-[#1f4e57] pt-3">
              <div
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex cursor-pointer items-center justify-between font-sans select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{username}</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white">
                    {initial}
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-white transition-transform duration-200 ${
                    isProfileOpen ? "rotate-180" : ""
                  }`}
                />
              </div>

              {isProfileOpen && (
                <div className="mt-3 flex flex-col gap-2 pl-4">
                  <button className="text-nav-inactive flex w-full cursor-pointer items-center gap-3 border-none bg-transparent py-2 text-left text-sm font-medium transition-colors hover:text-white">
                    <User className="h-4 w-4" />
                    Update Account
                  </button>
                  <button className="text-nav-inactive flex w-full cursor-pointer items-center gap-3 border-none bg-transparent py-2 text-left text-sm font-medium transition-colors hover:text-white">
                    <Lock className="h-4 w-4" />
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      performLogout();
                      closeMenu();
                    }}
                    className="text-nav-inactive flex w-full cursor-pointer items-center gap-3 border-none bg-transparent py-2 text-left text-sm font-medium transition-colors hover:text-white"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
