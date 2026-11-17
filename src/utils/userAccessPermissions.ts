import { useMemo, useCallback } from "react";
import { useAuthStore } from "../store/useAuthStore";
import type { User } from "../store/useAuthStore";
import { usePlanStore } from "../features/data/hooks/usePlanStore";

/**
 * Array of usernames / identifiers that have restricted access:
 * - Only Archive (Search) and GEO 3D are visible.
 * - Tasking, Indent, Order tabs, and Analytics are removed.
 *
 * To add more users in the future, simply add their usernames to this array.
 */
export const ARCHIVE_AND_GEO3D_ONLY_USERS: string[] = [
  "satya_chakra",
];

/**
 * Validates whether a user is configured to only have Archive and GEO 3D access.
 * Matches username case-insensitively and handles strings or User objects.
 * Checks user, username, customerName, schema_name, and email.
 *
 * @param userOrUsername - User object, partial user object, or username string
 * @returns boolean - true if the user is in the restricted Archive + GEO 3D list
 */
export const isArchiveAndGeo3dOnlyUser = (
  userOrUsername?: User | { user?: string; username?: string; customerName?: string; schema_name?: string; email?: string } | string | null,
): boolean => {
  let candidate = userOrUsername;
  if (!candidate) {
    try {
      candidate = useAuthStore.getState().user;
    } catch {
      // ignore
    }
  }

  if (!candidate) return false;

  if (typeof candidate === "string") {
    const normalized = candidate.trim().toLowerCase();
    return ARCHIVE_AND_GEO3D_ONLY_USERS.some(
      (u) => {
        const target = u.trim().toLowerCase();
        return normalized === target || normalized.includes(target);
      },
    );
  }

  const valuesToCheck = [
    candidate.user,
    (candidate as any).username,
    (candidate as any).customerName,
    (candidate as any).schema_name,
    candidate.email,
  ].filter(Boolean) as string[];

  return valuesToCheck.some((val) => {
    const normalized = val.trim().toLowerCase();
    return ARCHIVE_AND_GEO3D_ONLY_USERS.some(
      (u) => {
        const target = u.trim().toLowerCase();
        return normalized === target || normalized.includes(target);
      },
    );
  });
};

/**
 * React hook to check if the current logged-in user only has Archive and GEO 3D access.
 */
export const useIsArchiveAndGeo3dOnlyUser = (): boolean => {
  const user = useAuthStore((state) => state.user);
  return isArchiveAndGeo3dOnlyUser(user);
};

/**
 * Resolves the effective allowed services for a user:
 * 1. User's explicit services array (from user.services, e.g. assigned on register-user/login)
 * 2. Token services (if present in JWT token payload)
 * 3. Tenant company's active plan services (plan.services)
 */
export const getEffectiveUserServices = (
  user?: User | null,
  planServices: string[] = [],
  accessToken?: string | null,
): string[] => {
  // 1. User's assigned services
  const userServices = (user as any)?.services;
  if (Array.isArray(userServices) && userServices.length > 0) {
    return userServices;
  }

  // 2. Token services (decoded from JWT payload if available)
  if (accessToken) {
    try {
      const raw = accessToken.replace("Bearer ", "").trim();
      const parts = raw.split(".");
      if (parts.length >= 2) {
        const payloadStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(payloadStr);
        if (Array.isArray(payload.services) && payload.services.length > 0) {
          return payload.services;
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  // 3. Fallback to assigned company plan services
  if (Array.isArray(planServices) && planServices.length > 0) {
    return planServices;
  }

  return [];
};

/**
 * Checks if a specific service is assigned / allowed for the user.
 * SuperAdmin always returns true.
 * For other roles, strictly checks if the service exists in the effective services list.
 */
export const isServiceAllowed = (
  serviceName: string,
  allowedServices: string[],
  isSuperAdmin = false,
): boolean => {
  if (isSuperAdmin) return true;
  if (!allowedServices || allowedServices.length === 0) return false;

  const target = serviceName.toLowerCase().trim();
  return allowedServices.some((s) => {
    if (!s) return false;
    const normalized = s.toLowerCase().trim();
    if (normalized === target) return true;

    // Service name aliases mapping
    if (target === "search" && ["archive", "archive_search"].includes(normalized)) return true;
    if (target === "archive" && ["search", "archive_search"].includes(normalized)) return true;
    if (target === "tasking" && ["task"].includes(normalized)) return true;
    if (target === "my_indent" && ["indent", "my indent"].includes(normalized)) return true;
    if (
      target === "my_orders" &&
      ["order", "my order", "my_order", "orders"].includes(normalized)
    ) {
      return true;
    }
    if (target === "orbitography" && ["orbit"].includes(normalized)) return true;
    if (target === "quotations" && ["quotation", "quote"].includes(normalized)) return true;
    if (target === "geo_3d" && ["geo3d", "geo 3d"].includes(normalized)) return true;
    if (target === "analytics" && ["analytic"].includes(normalized)) return true;

    return false;
  });
};

/**
 * Hook providing reactive permissions and service checks for the current user.
 */
export const useAllowedServices = () => {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const plan = usePlanStore((state) => state.plan);

  const role = user?.roleName?.toLowerCase() || "user";
  const isSuperAdmin = role === "superadmin";

  const effectiveServices = useMemo(() => {
    return getEffectiveUserServices(user, plan?.services ?? [], accessToken);
  }, [user, plan?.services, accessToken]);

  const hasService = useCallback(
    (serviceName: string) => isServiceAllowed(serviceName, effectiveServices, isSuperAdmin),
    [effectiveServices, isSuperAdmin],
  );

  return {
    allowedServices: effectiveServices,
    isSuperAdmin,
    hasService,
  };
};
