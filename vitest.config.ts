import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest config for the RBAC stress-test suite (ADR-0045). Node environment —
 * the units under test (lib/auth/{roles,policy,claims}.ts) are pure and read
 * only `process.env`. The `@/` alias mirrors tsconfig `paths`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
