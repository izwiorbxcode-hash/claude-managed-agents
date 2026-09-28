import type { MiddlewareHandler } from "hono";

export const requestIdMiddleware: MiddlewareHandler<{
  Variables: { requestId: string };
}> = async (c, next) => {
  const incoming = c.req.header("x-request-id");
  const requestId = incoming ?? crypto.randomUUID();
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);
  await next();
};
