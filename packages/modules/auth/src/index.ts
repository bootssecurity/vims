import { defineModule } from "@vims/framework";
import jwt from "jsonwebtoken";

export const authStrategies = ["password", "magic-link", "sso"];

export const authModule = defineModule({
  key: "auth",
  label: "Auth",
  owner: "packages/modules/auth",
  dependsOn: ["tenancy"],
  register: ({ registerService, resolveProvider }) => {
    const events = resolveProvider<{ bus: { emit: (name: string, payload: unknown) => void } }>(
      "event-bus-local",
    );

    registerService("auth.strategies", authStrategies);
    events.bus.emit("auth.booted", { strategies: authStrategies });

    const getJwtSecret = () => process.env.JWT_SECRET || "super_secret_vims_key";

    return {
      strategies: authStrategies,
      
      issueSessionToken(userId: string) {
        return jwt.sign({ userId }, getJwtSecret(), {
          expiresIn: "7d",
        });
      },

      verifySessionToken(token: string) {
        try {
          return jwt.verify(token, getJwtSecret()) as { userId: string } & jwt.JwtPayload;
        } catch {
          return null;
        }
      }
    };
  },
});
