/**
 * Module augmentation for Auth.js v5 (ADR-0030). Adds the normalized application
 * `roles` to the session user and the JWT, plus the Entra object id (`oid`) we
 * use to key the `app_user` mirror. See `src/lib/auth/roles.ts`.
 */
import type { AppRole } from "@/lib/auth/roles";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      roles: AppRole[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles?: AppRole[];
    oid?: string;
  }
}
