import { useAuthStore } from "../store/useAuthStore";
import type { User } from "../store/useAuthStore";

/**
 * Array of customer / schema / role identifiers representing BSF users
 * who should not be given access to GEO 3D.
 */
export const BSF_IDENTIFIERS: string[] = ["bsf"];

/**
 * Validates whether a user or schema belongs to BSF.
 * Checks schema_name, customerName, roleName, and username.
 *
 * @param userOrSchema - User object or schema name string or partial user object
 * @returns boolean - true if the user/schema belongs to BSF
 */
export const isBsfUser = (
  userOrSchema?: User | { schema_name?: string; customerName?: string; roleName?: string; user?: string } | string | null,
): boolean => {
  if (!userOrSchema) return false;

  if (typeof userOrSchema === "string") {
    const normalized = userOrSchema.trim().toLowerCase();
    return BSF_IDENTIFIERS.some(
      (id) => normalized === id || normalized.includes(id),
    );
  }

  const schema = (userOrSchema.schema_name || "").trim().toLowerCase();
  const customer = (userOrSchema.customerName || "").trim().toLowerCase();
  const role = (userOrSchema.roleName || "").trim().toLowerCase();
  const username = (userOrSchema.user || "").trim().toLowerCase();

  return BSF_IDENTIFIERS.some(
    (id) =>
      schema === id ||
      schema.includes(id) ||
      customer === id ||
      customer.includes(id) ||
      role === id ||
      role.includes(id) ||
      username === id ||
      username.includes(id),
  );
};

/**
 * Validates whether a user has access to GEO 3D.
 * If the user is BSF, access is denied (returns false).
 * Otherwise, superadmins or users with 'geo_3d' in their plan's services are granted access.
 *
 * @param user - User object
 * @param allowedServices - Array of service strings allowed in user's active plan
 * @returns boolean - true if the user has access to GEO 3D
 */
export const hasGeo3dAccess = (
  user?: User | null,
  allowedServices: string[] = [],
): boolean => {
  if (!user) return false;
  if (isBsfUser(user)) return false;

  const roleName = user.roleName?.toLowerCase() || "";
  return (
    roleName === "superadmin" ||
    allowedServices.some((service) => service?.toLowerCase() === "geo_3d")
  );
};

/**
 * React hook to check if current logged-in user has access to GEO 3D.
 */
export const useHasGeo3dAccess = (allowedServices: string[] = []): boolean => {
  const user = useAuthStore((state) => state.user);
  return hasGeo3dAccess(user, allowedServices);
};
