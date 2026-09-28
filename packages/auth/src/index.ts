/**
 * Auth — Phase 2.
 * Stub so Phase 1 compiles. Full impl uses Better Auth + drizzleAdapter.
 * Fully typed with branded Session types.
 */
import { Context, Data, Effect } from "effect";

export type UserId = string & { readonly __brand: "UserId" };

export interface SessionUser {
  readonly email: string;
  readonly emailVerified: boolean;
  readonly id: UserId;
  readonly image?: string | null | undefined;
  readonly name?: string | null | undefined;
  readonly role?: string | null | undefined;
}

export interface Session {
  readonly expiresAt: Date;
  readonly sessionId: string;
  readonly user: SessionUser;
}

export class AuthenticationError extends Data.TaggedError(
  "AuthenticationError"
)<{
  readonly message: string;
  readonly httpStatus: 401;
}> {}

export interface AuthServiceShape {
  readonly getSession: (req: Request) => Effect.Effect<Session | null, never>;
  readonly requireUser: (
    req: Request
  ) => Effect.Effect<SessionUser, AuthenticationError>;
  readonly signOut: (req: Request) => Effect.Effect<void, never>;
}

export class AuthService extends Context.Tag("AuthService")<
  AuthService,
  AuthServiceShape
>() {}

// Phase-1 stub: always unauthenticated
export const AuthLiveStub: AuthServiceShape = AuthService.of({
  getSession: (_req: Request): Effect.Effect<Session | null, never> =>
    Effect.succeed(null),
  requireUser: (
    _req: Request
  ): Effect.Effect<SessionUser, AuthenticationError> =>
    Effect.fail(
      new AuthenticationError({ httpStatus: 401, message: "Not authenticated" })
    ),
  signOut: (_req: Request): Effect.Effect<void, never> =>
    Effect.succeed(undefined),
});
