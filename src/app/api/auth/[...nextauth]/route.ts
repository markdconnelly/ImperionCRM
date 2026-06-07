/**
 * Auth.js v5 catch-all route — exposes the sign-in, callback, sign-out, and
 * session endpoints. All auth flow runs server-side (CLAUDE.md §2). Config and
 * the certificate client-assertion live in src/auth.ts.
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
