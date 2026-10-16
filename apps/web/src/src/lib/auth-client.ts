// Better Auth client. Points at the same origin that serves this bundle — the
// worker mounts the auth handler at /api/auth/* and sets the session cookie,
// so requests are same-origin and `credentials: "include"` is what carries it.
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? "" : window.location.origin,
});

export const { signIn, signOut, signUp, useSession } = authClient;
