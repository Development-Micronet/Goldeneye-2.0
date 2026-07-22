export interface NavItem {
  label: string;
  path: string;
  roles?: string[]; // If undefined, visible to all roles
}

export const navigationItems: NavItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
  },
  {
    label: "Data",
    path: "/data",
    roles: ["superadmin", "admin", "user"], // visible to logged-in roles
  },
  {
    label: "Manage",
    path: "/manage",
    roles: ["superadmin", "admin"], // visible only to Admin
  },
  {
    label: "Quotation",
    path: "/quotation",
  },
];

/**
 * Filter navigation items based on the user's roleName
 */
export function getNavigationItems(roleName?: string): NavItem[] {
  if (!roleName) {
    // If not logged in or no role is present, show only public items
    return navigationItems.filter((item) => !item.roles);
  }

  return navigationItems.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.some((role) => role.toLowerCase() === roleName.toLowerCase());
  });
}
