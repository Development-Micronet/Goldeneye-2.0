export interface NavItem {
  label: string;
  path: string;
  roles?: string[]; // If undefined, visible to all roles
}

export const navigationItems: NavItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    roles: ["superadmin", "admin"], // Only superadmin and admin can see Dashboard
  },
  {
    label: "Data",
    path: "/data",
    roles: ["superadmin", "admin", "user"], // All logged-in roles can see Data
  },
  {
    label: "Manage",
    path: "/manage",
    roles: ["superadmin", "admin"], // visible only to Admin
  },
  {
    label: "Quotation",
    path: "/quotation",
    roles: ["superadmin"], // Only superadmin can see Quotation
  },
  {
    label:"Analytics",
    path:"/analytics",
    roles: ["superadmin", "admin", "user"], // All logged-in roles can see Analytics
  }
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
