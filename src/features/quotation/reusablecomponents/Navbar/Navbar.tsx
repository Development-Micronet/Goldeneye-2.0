import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../../Auth/AuthProvider/AuthContext";
import searchIcon from "../../assets/Icons/Open_Search/Search.png";
import goldenEyeLogo from "../../assets/images/Golden eye Logo-05.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useGetData } from "../../hooks";
import CentralizedModal from "../CentralizedModal/CentralizedModal";
import UpdateProfile from "../UpdateProfile/UpdateProfile";
import UserProfile from "../UserProfile/UserProfile";
import { useSearchMap } from "../../Contexts/SearchMapContext";
import axios from "axios";
import { useSearchCriteriaStore } from "../../mystore/features/useSearchCriteriaStore";
import { debounce } from "lodash";
import { apiClient } from "../../../../api/apiClient";
import { useQuotationItemStore } from "../../mystore/features/useQuotationItemStore";
import { toast } from "react-toastify";
import { useScreenshotStore } from "../../mystore/features/useScreenshotStore";
import { useImageStore } from "../../mystore/features/useImageStore";
import { useArchiveProductStore } from "../../../data/components/sidebar/store/useArchiveProductStore";
import { useProductStore } from "../../../data/hooks/useproductStore";

const Navbar: React.FC = () => {
  const { vectorLayerRef } = useSearchMap();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const quotationItem = useQuotationItemStore((state) => state.quotationItem);
  const setQuotationItems = useQuotationItemStore((state) => state.setQuotationItems);
  const resetSearchCriteria = useSearchCriteriaStore((state) => state.resetSearchCriteria);
  const captureScreenshot = useScreenshotStore((state) => state.captureScreenshot);
  const setImages = useImageStore((state) => state.setImages);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { access, userName, user, logout } = useUser();
  const [showUpdateProfileModal, setShowUpdateProfileModal] = useState(false);
  const profileModalRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showManageTabs, setShowManageTabs] = useState(false);
  const [locations, setLocation] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [SearchCrossIcon, setSearchCrossIcon] = useState(false);
  const { handleClearAll, closeModifylayer } = useSearchMap();
  const openUpdateProfileModal = () => setShowUpdateProfileModal(true);
  const closeUpdateProfileModal = () => setShowUpdateProfileModal(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isQuotationDropdownOpen, setIsQuotationDropdownOpen] = useState(false);
  const quotationDropdownRef = useRef<HTMLDivElement>(null);

  const { data: subscriptiondata } = useGetData(
    `assign_subscription/${userName}/`,
    ["subscription", userName]
  );
  const hasquotationaccess = subscriptiondata?.data?.some(
    (sub: any) => sub.type === "quotation"
  );

  const debouncedFetch = useRef(
    debounce(async (query: string) => {
      const apiKey = import.meta.env.VITE_OPENCAGE_KEY || "INVALID_KEY";
      if (!apiKey) return;

      try {
        const response = await axios.get(
          "https://api.opencagedata.com/geocode/v1/json",
          { params: { q: query, key: apiKey } }
        );
        const results = response.data?.results;
        setSuggestions(results?.length ? results : []);
      } catch (error: any) {
        console.error("Geocode error", error);
      }
    }, 1000)
  ).current;

  const parseRange = (val: any) => {
    if (!val) return "";
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  };

  const PRODUCT_NAME_MAP: Record<string, string> = {
    PNEO: "Pleiades-Neo-0.3m",
    PHR: "Pleiades-0.5m",
    SPOT: "SPOT 1.5-m",
    DMC: "UK-DMC2",
    Elevation: "E30 -DSM",
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocation(value);
    setSearchCrossIcon(value.length > 0);

    if (value.length <= 2) {
      setSuggestions([]);
      debouncedFetch.cancel();
      return;
    }
    debouncedFetch(value);
  };

  const clearInput = () => {
    setLocation("");
    setSearchCrossIcon(false);
    setSuggestions([]);
    localStorage.removeItem("importedFiles");
    closeModifylayer();
  };

  const handleSuggestionClick = (suggestion: any) => {
    setLocation(suggestion.formatted);
    const { lng, lat } = suggestion.geometry;

    if (
      vectorLayerRef.current &&
      vectorLayerRef.current.context &&
      vectorLayerRef.current.context.map
    ) {
      const map = vectorLayerRef.current.context.map;
      if (map.getView) {
        map.getView().setCenter([lng, lat]);
        map.getView().setZoom(17);
      }
    }
    setSuggestions([]);
  };

  const handleSearch = () => {
    if (suggestions.length > 0) {
      const firstSuggestion = suggestions[0];
      setLocation(firstSuggestion.formatted);
      setSuggestions([]);

      const { lat, lng } = firstSuggestion.geometry;

      if (
        vectorLayerRef.current &&
        vectorLayerRef.current.context &&
        vectorLayerRef.current.context.map
      ) {
        const map = vectorLayerRef.current.context.map;
        if (map.getView) {
          map.getView().setCenter([lng, lat]);
          map.getView().setZoom(13);
        }
      }
    }
  };

  const {
    data: userProfile,
    isLoading: isprofileLoading,
    isError: isprofileError,
    error: profileError,
  } = useGetData(userName ? `customers/profile/${userName}/` : "", [
    "user-profile",
    userName,
  ]);

  const profileImageRef = useRef<HTMLDivElement>(null);

  const handleImageClick = () => {
    setIsVisible((prev) => !prev);
  };

  const handleUpdateProfile = () => {
    navigate("/UpdateAccount", { state: { userProfile: userProfile } });
  };

  const handleChangePassword = () => {
    const username = encodeURIComponent(user?.user || "");
    const roleName = encodeURIComponent(user?.roleName || "");
    const accessToken = encodeURIComponent(user?.access || "");
    navigate(
      `/ChangePassword?username=${username}&roleName=${roleName}&accessToken=${accessToken}`
    );
  };

  const handleLogout = async () => {
    try {
      closeModifylayer();
      handleClearAll();
      const refresh = user?.refresh;
      const response = await apiClient.post("logout/", { refresh });
      if (response) {
        resetSearchCriteria();
        logout();
        navigate("/");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      profileModalRef.current &&
      !profileModalRef.current.contains(event.target as Node) &&
      profileImageRef.current &&
      !profileImageRef.current.contains(event.target as Node)
    ) {
      setIsVisible(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible]);

  useEffect(() => {
    function handleSidebarClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleSidebarClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleSidebarClickOutside);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    function handleQuotationDropdownClickOutside(event: MouseEvent) {
      if (
        quotationDropdownRef.current &&
        !quotationDropdownRef.current.contains(event.target as Node)
      ) {
        setIsQuotationDropdownOpen(false);
      }
    }

    if (isQuotationDropdownOpen) {
      document.addEventListener("mousedown", handleQuotationDropdownClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleQuotationDropdownClickOutside);
    };
  }, [isQuotationDropdownOpen]);

  const isAuthorized = () =>
    user?.roleName === "admin" ||
    user?.roleName === "user" ||
    user?.roleName === "superadmin";

  const isAuthorizedEndUser = () =>
    user?.roleName === "superadmin" || user?.roleName === "admin";

  useEffect(() => {
    if (path.startsWith("/manage")) {
      setShowManageTabs(true);
    } else {
      setShowManageTabs(false);
    }
  }, [path]);

  const handleToHome = async () => {
    navigate("/data");
  };

  return (
    <div className="relative h-full z-50 ">
      <nav className="bg-[#2c6671] h-full text-white px-6 flex items-center justify-between font-inter">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-4 lg:space-x-16">
            <img
              src={goldenEyeLogo}
              alt="Golden Eye Logo"
              className="h-[4.5rem] w-auto relative top-[-.2rem] cursor-pointer"
              onClick={handleToHome}
            />

            {access && (
              <div className="hidden lg:flex space-x-8 items-center">
                <Link
                  to="/dashboard"
                  className={`no-underline ${
                    path === "/dashboard" ? "text-white" : "text-[#b8b8b8]"
                  } hover:text-gray-300`}
                >
                  Dashboard
                </Link>
                <Link
                  to={isAuthorized() ? "/data" : "#"}
                  className={`no-underline ${
                    path === "/data" ? "text-white" : "text-[#b8b8b8]"
                  } ${!isAuthorized() && "opacity-50"} hover:text-gray-300`}
                >
                  Data
                </Link>
                {isAuthorizedEndUser() && (
                  <Link
                    to="/manage"
                    className={`no-underline hover:text-gray-300 ${
                      path.includes("/manage") ? "text-white" : "text-[#b8b8b8]"
                    }`}
                  >
                    Manage
                  </Link>
                )}
                {hasquotationaccess && (
                  <div
                    ref={quotationDropdownRef}
                    className="relative inline-block group"
                  >
                    <button
                      type="button"
                      onClick={() => setIsQuotationDropdownOpen((prev) => !prev)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                        path.includes("/quotation")
                          ? "text-white font-bold bg-[#204e57]"
                          : "text-[#b8b8b8] hover:text-white hover:bg-[#204e57]/50"
                      }`}
                    >
                      <span>Quotation</span>
                      <svg
                        className={`w-3.5 h-3.5 fill-current opacity-80 transition-transform duration-200 ${
                          isQuotationDropdownOpen ? "rotate-180" : ""
                        }`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </button>

                    <div
                      className={`absolute top-full left-0 mt-1 w-48 rounded-xl bg-white shadow-xl border border-gray-100 py-1.5 z-50 transition-all ${
                        isQuotationDropdownOpen ? "block" : "hidden group-hover:block"
                      }`}
                    >
                      <div className="py-1">
                        <Link
                          to="/quotation"
                          onClick={() => setIsQuotationDropdownOpen(false)}
                          className="block px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-[#2c6671]/10 hover:text-[#2c6671] transition-colors"
                        >
                          See All Quotations
                        </Link>

                        <div
                          onClick={() => {
                            setIsQuotationDropdownOpen(false);
                            handleAddQuotation();
                          }}
                          className="block px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-[#2c6671]/10 hover:text-[#2c6671] cursor-pointer transition-colors"
                        >
                          Add Quotation Item
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative w-full max-w-[200px] sm:max-w-[280px] lg:max-w-sm lg:absolute lg:right-[14rem] mx-auto z-20">
            <div className="relative bg-white rounded-sm shadow px-3 py-2 flex items-center w-full text-black">
              <input
                type="text"
                name="locations"
                placeholder="Go to place"
                className="flex-grow pr-10 pl-2 py-1 text-sm rounded-sm outline-none"
                value={locations}
                onChange={handleInputChange}
              />

              {SearchCrossIcon && (
                <FontAwesomeIcon
                  icon={faXmark}
                  className="absolute right-10 text-gray-500 cursor-pointer hover:text-gray-700"
                  onClick={clearInput}
                />
              )}

              <img
                src={searchIcon}
                alt="search"
                className="w-4 h-4 cursor-pointer"
                onClick={handleSearch}
              />
            </div>

            {suggestions.length > 0 && (
              <ul className="absolute w-full bg-white text-black mt-1 max-h-60 overflow-auto text-sm p-2">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    className="py-2 w-full text-center hover:bg-gray-200 cursor-pointer"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion.formatted}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {access && (
            <div className="flex items-center space-x-4">
              <div className="hidden lg:flex justify-center items-center space-x-2">
                <p className="p-0 m-0">{user?.user}</p>

                <div
                  ref={profileImageRef}
                  className="h-8 w-8 flex items-center justify-center rounded-full border-2 border-white bg-[#2c6671] text-white font-semibold cursor-pointer"
                  onClick={handleImageClick}
                >
                  {user?.user?.charAt(0).toUpperCase()}
                </div>
              </div>

              <button
                className="lg:hidden text-white focus:outline-none"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <FontAwesomeIcon
                  icon={isMobileMenuOpen ? faXmark : faBars}
                  size="lg"
                />
              </button>
            </div>
          )}
        </div>
      </nav>

      {isMobileMenuOpen && access && (
        <div
          ref={sidebarRef}
          className={`fixed top-0 right-0 h-full w-2/3 sm:w-1/2 bg-white text-[#113646] py-6 px-6 space-y-6 text-center shadow-lg
        transform transition-transform duration-500 ease-in-out z-20 ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        >
          <button
            className="absolute top-4 right-4 text-[#113646] hover:text-gray-700 transition-colors duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <FontAwesomeIcon icon={faXmark} size="lg" />
          </button>

          <header className="p-4 text-center border-b border-gray-300">
            <div className="mx-auto flex items-center justify-center w-14 h-14 bg-[#2c6771] text-white text-2xl font-bold rounded-full transition-all duration-300">
              {user?.user?.charAt(0).toUpperCase()}
            </div>
            <h5 className="mt-3 text-xl font-semibold text-[#113646]">
              {user?.user}
            </h5>
          </header>

          <nav className="space-y-4">
            <Link
              to="/"
              className="block py-3 no-underline font-semibold text-[1.2rem] text-[#2c6771] hover:text-[#1e4d56] transition-colors duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              to={isAuthorized() ? "/data" : "#"}
              className={`block py-3 no-underline font-semibold text-[1.2rem] text-[#2c6771] ${
                !isAuthorized()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:text-[#1e4d56] transition-colors duration-200"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Data
            </Link>
            {isAuthorizedEndUser() && (
              <Link
                to="/manage"
                className="block py-3 no-underline font-semibold text-[1.2rem] text-[#2c6771] hover:text-[#1e4d56] transition-colors duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Manage
              </Link>
            )}
            <button
              className="block w-full py-3 font-semibold text-[1.2rem] text-[#2c6771] text-center hover:text-[#1e4d56] transition-colors duration-200"
              onClick={() => {
                handleUpdateProfile();
                setIsMobileMenuOpen(false);
              }}
            >
              Update Account
            </button>
            <button
              className="block w-full py-3 font-semibold text-[1.2rem] text-[#2c6771] text-center hover:text-[#1e4d56] transition-colors duration-200"
              onClick={() => {
                handleChangePassword();
                setIsMobileMenuOpen(false);
              }}
            >
              Change Password
            </button>
            <button
              className="block w-full py-3 font-semibold text-[1.2rem] text-[#2c6771] text-center hover:text-[#1e4d56] transition-colors duration-200"
              onClick={() => {
                handleLogout();
                setIsMobileMenuOpen(false);
              }}
            >
              Logout
            </button>
          </nav>
        </div>
      )}

      {isVisible && (
        <div
          ref={profileModalRef}
          className="absolute right-0 z-50 top-[-2.5rem]"
          onClick={() => setIsVisible(false)}
        >
          <UserProfile
            ref={profileModalRef}
            userProfile={userProfile?.userDetails}
            openUpdateProfileModal={openUpdateProfileModal}
          />
        </div>
      )}

      <CentralizedModal
        show={showUpdateProfileModal}
        handleClose={closeUpdateProfileModal}
        title="Update Profile"
      >
        {isprofileLoading && <p>Loading...</p>}
        {isprofileError && (
          <p>Error fetching profile data: {profileError.message}</p>
        )}
        {!isprofileLoading && !profileError && (
          <UpdateProfile
            closeModal={closeUpdateProfileModal}
            userProfile={userProfile?.userDetails}
          />
        )}
      </CentralizedModal>
    </div>
  );
};

export default Navbar;
