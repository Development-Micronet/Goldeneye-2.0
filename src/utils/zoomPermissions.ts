import { useAuthStore } from "../store/useAuthStore";
import type { User } from "../store/useAuthStore";

/**
 * Array of tenant schema names in the special category that bypass zoom limitations
 * on map and layers for temporary / special use cases.
 */
export const SPECIAL_ZOOM_SCHEMAS: string[] = ["micronet"];

/**
 * Validates whether a user or schema name belongs to the special category.
 *
 * @param userOrSchema - User object or schema name string
 * @returns boolean - true if the user/schema is in the special category
 */
export const isSpecialZoomCategory = (
  userOrSchema?: User | { schema_name?: string } | string | null,
): boolean => {
  if (!userOrSchema) return false;
  const schema =
    typeof userOrSchema === "string" ? userOrSchema : userOrSchema.schema_name;
  if (!schema) return false;

  const normalized = schema.trim().toLowerCase();
  return SPECIAL_ZOOM_SCHEMAS.some((s) => s.trim().toLowerCase() === normalized);
};

/**
 * React hook to check if the current logged-in user belongs to the special zoom category.
 */
export const useIsSpecialZoomCategory = (): boolean => {
  const user = useAuthStore((state) => state.user);
  return isSpecialZoomCategory(user);
};
