/**
 * Shared Hono RPC contract helpers.
 * The actual `AppType` lives in `apps/api/src/app.ts` and is re-exported after building.
 * Clients import `hc<AppType>` from `hono/client`.
 */
export const API_PREFIX = "/api" as const;

export type ApiErrorCode =
  | "ValidationError"
  | "AuthenticationError"
  | "AuthorizationError"
  | "NotFoundError"
  | "ConflictError"
  | "PaymentError"
  | "RateLimitError"
  | "ExternalServiceError"
  | "InternalError"
  | "DatabaseError";

export interface ApiErrorBody {
  code: ApiErrorCode;
  issues?: unknown;
  message: string;
  requestId?: string;
  success: false;
}

export interface ApiSuccessBody<T> {
  data: T;
  success: true;
}

export type HealthResponse = {
  status: "ok";
  timestamp: string;
  requestId: string;
};
