import { defineModule } from "@vims/framework";

export const defaultRoles = ["platform_admin", "dealer_admin", "sales_manager", "sales_rep"];

export const rbacModule = defineModule({
  key: "rbac",
  label: "RBAC",
  owner: "packages/modules/rbac",
  dependsOn: ["auth"],
  register: ({ registerService }) => {
    registerService("rbac.roles", defaultRoles);

    return {
      roles: defaultRoles,
      can(role: string, permission: string) {
        if (role === "platform_admin") {
          return true;
        }

        return permission !== "platform.manage";
      },
    };
  },
});
