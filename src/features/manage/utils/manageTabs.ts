import type { TabType } from "../components/ManageNavbar";

export const MANAGE_TAB_QUERY_PARAM = "tab";

export function getDefaultTab(roleName?: string): TabType {
  return roleName === "superadmin" ? "company-requests" : "end-users";
}

export function getTabFromSearch(search: string, roleName?: string): TabType {
  const params = new URLSearchParams(search);
  const tabParam = params.get(MANAGE_TAB_QUERY_PARAM);

  if (
    tabParam === "company-requests" ||
    tabParam === "end-users" ||
    tabParam === "allocated-products" ||
    tabParam === "provider & Contracts" ||
    tabParam === "subscription" ||
    tabParam === "plan"
  ) {
    return tabParam as TabType;
  }

  return getDefaultTab(roleName);
}

export function buildManageTabSearch(tab: TabType) {
  const params = new URLSearchParams();
  params.set(MANAGE_TAB_QUERY_PARAM, tab);
  return `?${params.toString()}`;
}
