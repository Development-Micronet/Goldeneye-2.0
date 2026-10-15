import { describe, it, expect } from "vitest";
import {
  ARCHIVE_AND_GEO3D_ONLY_USERS,
  isArchiveAndGeo3dOnlyUser,
} from "./userAccessPermissions";
import type { User } from "../store/useAuthStore";

describe("userAccessPermissions", () => {
  const baseUser: User = {
    user: "satya_chakra",
    roleName: "user",
    first_name: "Satya",
    last_name: "Chakra",
    email: "satya@example.com",
    date_joined: "2026-01-01",
    parentUsername: "admin",
    mobile_number: null,
    address: "123 Street",
    customerName: "Satya Corp",
    schema_name: "satya",
    date: "2026-01-01",
  };

  it("should have satya_chakra in ARCHIVE_AND_GEO3D_ONLY_USERS", () => {
    expect(ARCHIVE_AND_GEO3D_ONLY_USERS).toContain("satya_chakra");
  });

  it("should return true for satya_chakra (User object, case insensitive)", () => {
    expect(isArchiveAndGeo3dOnlyUser(baseUser)).toBe(true);
    expect(isArchiveAndGeo3dOnlyUser({ ...baseUser, user: "Satya_Chakra" })).toBe(true);
    expect(isArchiveAndGeo3dOnlyUser({ ...baseUser, user: "  SATYA_CHAKRA  " })).toBe(true);
  });

  it("should return true for satya_chakra (string input)", () => {
    expect(isArchiveAndGeo3dOnlyUser("satya_chakra")).toBe(true);
    expect(isArchiveAndGeo3dOnlyUser("SATYA_CHAKRA")).toBe(true);
    expect(isArchiveAndGeo3dOnlyUser("  satya_chakra  ")).toBe(true);
  });

  it("should return false for other users", () => {
    expect(isArchiveAndGeo3dOnlyUser({ ...baseUser, user: "john_doe" })).toBe(false);
    expect(isArchiveAndGeo3dOnlyUser("admin")).toBe(false);
    expect(isArchiveAndGeo3dOnlyUser(null)).toBe(false);
    expect(isArchiveAndGeo3dOnlyUser(undefined)).toBe(false);
  });
});
