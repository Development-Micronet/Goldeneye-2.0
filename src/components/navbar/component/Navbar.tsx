import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Search, User, Lock, LogOut, Menu, X, ChevronDown } from "lucide-react";
import { goldeneyeLogo } from "../../../assets";
import { useAuthStore } from "../../../store/useAuthStore";
import { getNavigationItems } from "../../../utils/navigation";
import { performLogout } from "../../../features/auth/api/logout";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => {
    setIsOpen(false);
    setIsProfileOpen(false);
  };
  const { user } = useAuthStore();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
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

  const username = user?.user || "user";
  const initial = username[0]?.toUpperCase() || "U";

  // Filter navigation items based on user's roleName
  const navItems = getNavigationItems(user?.roleName);

  return (
    <nav className="bg-primary px-6 md:px-8 py-2 relative z-50 shadow-md">
      <div className="flex items-center justify-between">
        {/* Left: Logo & Desktop links */}
        <div className="flex items-center gap-10">
          <div className="flex items-center">
            {/* logo */}
            <img
              src={goldeneyeLogo}
              alt="Golden Eye Logo"
              className="h-13 w-auto object-contain"
            />
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex gap-8 items-center mt-1">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Right: Search & User Profile */}
        <div className="hidden md:flex items-center gap-15 mt-1">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Go to place"
              className="bg-white text-gray-800 placeholder-gray-400 text-xs px-3 py-1.5 pr-8 rounded border border-transparent focus:outline-none w-70 font-sans"
            />
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 cursor-pointer" />
          </div>

          {/* User Profile Container with Click Trigger */}
          <div className="relative profile-menu-container">
            <div
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 select-none cursor-pointer group"
            >
              <span className="text-white text-sm font-semibold transition-opacity group-hover:opacity-90">
                {username}
              </span>
              <div className="flex items-center justify-center w-7 h-7 rounded-full border border-2 border-white text-white font-bold text-xs transition-transform group-hover:scale-105">
                {initial}
              </div>
            </div>

            {/* Profile Dropdown Popup/Modal */}
            {isProfileOpen && (
              <div className="absolute right-0 top-[calc(100%+12px)] bg-white rounded-xl shadow-2xl px-3 py-5 flex flex-col items-center w-64 border border-gray-100 text-gray-800 transition-all z-50">
                {/* Arrow */}
                <div className="absolute -top-1.5 right-2.5 w-3.5 h-3.5 bg-white rotate-45 border-t border-l border-gray-100"></div>

                {/* Big Avatar */}
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#1b7382] text-white font-bold text-2xl mb-2 select-none">
                  {initial}
                </div>

                {/* Username */}
                <h4 className="text-base font-semibold text-gray-800 mb-4 select-none">
                  {username}
                </h4>

                {/* Navigation Options */}
                <div className="w-full flex flex-col gap-1">
                  <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors text-left cursor-pointer border-none bg-transparent">
                    <User className="w-4 h-4 text-gray-500" />
                    Update Account
                  </button>

                  <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors text-left cursor-pointer border-none bg-transparent">
                    <Lock className="w-4 h-4 text-gray-500" />
                    Change Password
                  </button>

                  <button
                    onClick={() => {
                      performLogout();
                      closeMenu();
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors text-left cursor-pointer border-none bg-transparent"
                  >
                    <LogOut className="w-4 h-4 text-gray-500" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Hamburger Menu Button (Mobile Only) */}
        <div className="md:hidden flex items-center">
          <button
            onClick={toggleMenu}
            className="text-nav-inactive hover:text-white focus:outline-none transition-colors p-1"
            aria-label="Toggle Menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isOpen && (
        <div className="md:hidden absolute left-0 right-0 top-full bg-primary border-t border-[#1f4e57] shadow-xl z-40">
          <div className="flex flex-col px-6 py-4 gap-4">
            {/* Mobile Search bar */}
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Go to place"
                className="bg-white text-gray-800 placeholder-gray-400 text-xs px-3 py-1.5 pr-8 rounded border border-transparent focus:outline-none w-full font-sans"
              />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 cursor-pointer" />
            </div>

            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={linkClass}
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ))}

            {/* Mobile User Profile */}
            <div className="border-t border-[#1f4e57] pt-3 mt-1 profile-menu-container">
              <div
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center justify-between font-sans select-none cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-semibold">
                    {username}
                  </span>
                  <div className="flex items-center justify-center w-7 h-7 rounded-full border border-2 border-white text-white font-bold text-xs">
                    {initial}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-white transition-transform duration-200 ${
                    isProfileOpen ? "rotate-180" : ""
                  }`}
                />
              </div>

              {isProfileOpen && (
                <div className="flex flex-col gap-2 mt-3 pl-4">
                  <button className="flex items-center gap-3 w-full py-2 text-nav-inactive hover:text-white text-sm font-medium transition-colors text-left bg-transparent border-none cursor-pointer">
                    <User className="w-4 h-4" />
                    Update Account
                  </button>
                  <button className="flex items-center gap-3 w-full py-2 text-nav-inactive hover:text-white text-sm font-medium transition-colors text-left bg-transparent border-none cursor-pointer">
                    <Lock className="w-4 h-4" />
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      performLogout();
                      closeMenu();
                    }}
                    className="flex items-center gap-3 w-full py-2 text-nav-inactive hover:text-white text-sm font-medium transition-colors text-left bg-transparent border-none cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
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
