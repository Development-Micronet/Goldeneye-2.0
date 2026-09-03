import { useAuthStore } from "../store/useAuthStore";
import type { User } from "../store/useAuthStore";

/**
 * Array of tenant schema names where the "Add to Cart" button/icon in Archival is hidden.
 * Add additional schema names to this array for future updates.
 */
export const HIDE_CART_SCHEMAS: string[] = ["micronet"];

/**
 * Validates whether a user or schema name should have the cart button hidden.
 *
 * @param userOrSchema - User object or schema name string
 * @returns boolean - true if the cart button should be hidden
 */
export const isCartHidden = (
  userOrSchema?: User | { schema_name?: string } | string | null,
): boolean => {
  if (!userOrSchema) return false;
  const schema =
    typeof userOrSchema === "string" ? userOrSchema : userOrSchema.schema_name;
  if (!schema) return false;

  const normalized = schema.trim().toLowerCase();
  return HIDE_CART_SCHEMAS.some((s) => s.trim().toLowerCase() === normalized);
};

/**
 * React hook to check if the current logged-in user should have the Add to Cart button hidden.
 */
export const useIsCartHidden = (): boolean => {
  const user = useAuthStore((state) => state.user);
  return isCartHidden(user);
};
