import { useAuthStore } from "../store/useAuthStore";
import type { User } from "../store/useAuthStore";

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
