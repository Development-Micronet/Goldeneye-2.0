import { describe, it, expect } from "vitest";
import { isBsfUser, hasGeo3dAccess } from "./geo3dPermissions";
import type { User } from "../store/useAuthStore";

describe("geo3dPermissions", () => {
  const baseUser: User = {
    user: "john_doe",
    roleName: "user",
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    date_joined: "2026-01-01",
    parentUsername: "admin",
    mobile_number: null,
    address: "123 Street",
    customerName: "Acme Corp",
    schema_name: "acme",
    date: "2026-01-01",
  };

  describe("isBsfUser", () => {
    it("should return false for null/undefined", () => {
      expect(isBsfUser(null)).toBe(false);
      expect(isBsfUser(undefined)).toBe(false);
    });

    it("should return true when schema_name is bsf", () => {
      expect(isBsfUser({ ...baseUser, schema_name: "bsf" })).toBe(true);
      expect(isBsfUser({ ...baseUser, schema_name: "BSF_TENANT" })).toBe(true);
    });

    it("should return true when customerName contains bsf", () => {
      expect(isBsfUser({ ...baseUser, customerName: "BSF HQ" })).toBe(true);
    });

    it("should return true when roleName contains bsf", () => {
      expect(isBsfUser({ ...baseUser, roleName: "bsf_admin" })).toBe(true);
    });

    it("should return true when username contains bsf", () => {
      expect(isBsfUser({ ...baseUser, user: "bsf_officer" })).toBe(true);
    });

    it("should return true for string 'bsf'", () => {
      expect(isBsfUser("bsf")).toBe(true);
      expect(isBsfUser("BSF")).toBe(true);
    });

    it("should return false for non-bsf users", () => {
      expect(isBsfUser(baseUser)).toBe(false);
      expect(isBsfUser("micronet")).toBe(false);
    });
  });

  describe("hasGeo3dAccess", () => {
    it("should deny access if user is null/undefined", () => {
      expect(hasGeo3dAccess(null, ["geo_3d"])).toBe(false);
      expect(hasGeo3dAccess(undefined, ["geo_3d"])).toBe(false);
    });

    it("should deny access if user is BSF even if plan includes geo_3d", () => {
      const bsfUser: User = { ...baseUser, schema_name: "bsf" };
      expect(hasGeo3dAccess(bsfUser, ["geo_3d"])).toBe(false);
    });

    it("should deny access if user is BSF even if role is superadmin", () => {
      const bsfSuperadmin: User = { ...baseUser, schema_name: "bsf", roleName: "superadmin" };
      expect(hasGeo3dAccess(bsfSuperadmin, ["geo_3d"])).toBe(false);
    });

    it("should allow access for superadmin who is not BSF", () => {
      const superadmin: User = { ...baseUser, roleName: "superadmin" };
      expect(hasGeo3dAccess(superadmin, [])).toBe(true);
    });

    it("should allow access for regular user if plan includes geo_3d", () => {
      expect(hasGeo3dAccess(baseUser, ["geo_3d"])).toBe(true);
      expect(hasGeo3dAccess(baseUser, ["GEO_3D", "search"])).toBe(true);
    });

    it("should deny access for regular user if plan does not include geo_3d", () => {
      expect(hasGeo3dAccess(baseUser, ["search", "analytics"])).toBe(false);
      expect(hasGeo3dAccess(baseUser, [])).toBe(false);
    });
  });
});
