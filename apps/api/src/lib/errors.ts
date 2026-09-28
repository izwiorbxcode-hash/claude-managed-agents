import type { DomainError, ValidationError } from "@unsung/domain";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Env, Variables } from "../env.js";

type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

interface MappedDomainError {
  readonly code: DomainError["_tag"];
  readonly httpStatus: ContentfulStatusCode;
  readonly message: string;
}

export const mapDomainError = (e: DomainError): MappedDomainError => {
  const code: DomainError["_tag"] = e._tag;
  const httpStatus: ContentfulStatusCode = e.httpStatus as ContentfulStatusCode;
  const isInternal: boolean = httpStatus >= 500;
  const message: string = isInternal ? "Internal Server Error" : e.message;
  return { code, httpStatus, message };
};

const getIssues = (error: DomainError): unknown | undefined => {
  if ("issues" in error) {
    return (error as ValidationError).issues;
  }
};

export const jsonError = (
  c: AppContext,
  error: DomainError,
  requestId?: string
) => {
  const { code, httpStatus, message } = mapDomainError(error);
  const issues: unknown | undefined = getIssues(error);
  return c.json(
    {
      code,
      message,
      requestId,
      success: false as const,
      ...(issues === undefined ? {} : { issues }),
    },
    httpStatus
  );
};

export const jsonSuccess = <T>(
  c: AppContext,
  data: T,
  status: 200 | 201 = 200
) => c.json({ data, success: true as const }, status as ContentfulStatusCode);
