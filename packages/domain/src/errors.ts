import { Data } from "effect";

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
  readonly issues?: unknown;
  readonly httpStatus: 400;
}> {}

export class AuthenticationError extends Data.TaggedError(
  "AuthenticationError"
)<{
  readonly message: string;
  readonly httpStatus: 401;
}> {}

export class AuthorizationError extends Data.TaggedError("AuthorizationError")<{
  readonly message: string;
  readonly httpStatus: 403;
}> {}

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly message: string;
  readonly httpStatus: 404;
}> {}

export class ConflictError extends Data.TaggedError("ConflictError")<{
  readonly message: string;
  readonly httpStatus: 409;
}> {}

export class PaymentError extends Data.TaggedError("PaymentError")<{
  readonly message: string;
  readonly httpStatus: 402;
}> {}

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly message: string;
  readonly httpStatus: 429;
}> {}

export class ExternalServiceError extends Data.TaggedError(
  "ExternalServiceError"
)<{
  readonly message: string;
  readonly cause?: unknown;
  readonly httpStatus: 502;
}> {}

export class InternalError extends Data.TaggedError("InternalError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly httpStatus: 500;
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly httpStatus: 500;
}> {}

export type DomainError =
  | ValidationError
  | AuthenticationError
  | AuthorizationError
  | NotFoundError
  | ConflictError
  | PaymentError
  | RateLimitError
  | ExternalServiceError
  | InternalError
  | DatabaseError;

export const toHttpStatus = (e: { httpStatus?: number }): number =>
  e.httpStatus ?? 500;

export const toSafeMessage = (e: DomainError): string => {
  if (
    e._tag === "InternalError" ||
    e._tag === "DatabaseError" ||
    e._tag === "ExternalServiceError"
  ) {
    return "Internal Server Error";
  }
  return e.message;
};
