import type {
  D1Database,
  ExecutionContext,
  KVNamespace,
  R2Bucket,
} from "@cloudflare/workers-types";
import { Context, Effect, FiberRef } from "effect";

export interface CloudflareEnv {
  readonly BETTER_AUTH_SECRET?: string | undefined;
  readonly BETTER_AUTH_URL?: string | undefined;
  readonly CORS_ORIGIN?: string | undefined;
  readonly DATABASE?: D1Database | undefined;
  readonly KV?: KVNamespace | undefined;
  readonly PAYSTACK_PUBLIC_KEY?: string | undefined;
  readonly PAYSTACK_SECRET_KEY?: string | undefined;
  readonly R2_BUCKET?: R2Bucket | undefined;
}

export class CloudflareEnvTag extends Context.Tag("CloudflareEnvTag")<
  CloudflareEnvTag,
  CloudflareEnv
>() {}

export const currentEnv: FiberRef.FiberRef<CloudflareEnv | null> =
  FiberRef.unsafeMake<CloudflareEnv | null>(null);

export const currentCtx: FiberRef.FiberRef<ExecutionContext | null> =
  FiberRef.unsafeMake<ExecutionContext | null>(null);

export const withCloudflareBindings =
  (env: CloudflareEnv, _ctx: ExecutionContext) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    effect.pipe(Effect.provideService(CloudflareEnvTag, env));

export const getEnv: Effect.Effect<CloudflareEnv, Error> = Effect.flatMap(
  FiberRef.get(currentEnv),
  (env: CloudflareEnv | null) =>
    env === null
      ? Effect.fail(new Error("Cloudflare env not available"))
      : Effect.succeed(env)
);

export const getExecutionContext: Effect.Effect<ExecutionContext, Error> =
  Effect.flatMap(FiberRef.get(currentCtx), (ctx: ExecutionContext | null) =>
    ctx === null
      ? Effect.fail(new Error("ExecutionContext not available"))
      : Effect.succeed(ctx)
  );
