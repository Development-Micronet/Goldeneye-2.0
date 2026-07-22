import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { ChevronDown, Lock, LogOut, Menu, Search, User, X } from "lucide-react";
import { goldeneyeLogo } from "../../../assets";
import { performLogout } from "../../../features/auth/api/logout";
import { useAuthStore } from "../../../store/useAuthStore";
import { getNavigationItems } from "../../../utils/navigation";

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
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Right: Search & User Profile */}
        <div className="mt-1 hidden items-center gap-3 md:flex md:gap-6 lg:gap-10 xl:gap-15">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Go to place"
              className="w-32 rounded border border-transparent bg-white px-3 py-1.5 pr-8 font-sans text-xs text-gray-800 placeholder-gray-400 transition-all duration-300 focus:w-40 focus:outline-none md:w-44 md:focus:w-52 lg:w-56 lg:focus:w-64 xl:w-70 xl:focus:w-80"
            />
            <Search className="absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 cursor-pointer text-gray-400" />
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
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-2 border-white text-xs font-bold text-white transition-transform group-hover:scale-105">
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

            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={linkClass} onClick={closeMenu}>
                {item.label}
              </NavLink>
            ))}

            {/* Mobile User Profile */}
            <div className="profile-menu-container mt-1 border-t border-[#1f4e57] pt-3">
              <div
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex cursor-pointer items-center justify-between font-sans select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{username}</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-2 border-white text-xs font-bold text-white">
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
