import { Effect, type Layer, ManagedRuntime } from "effect";

export const makeRequestRuntime = <R>(
  layer: Layer.Layer<R, never, never>
): ManagedRuntime.ManagedRuntime<R, never> => ManagedRuntime.make(layer);

export const runWithLayer = <A, E, R>(
  program: Effect.Effect<A, E, R>,
  layer: Layer.Layer<R, E, never>
): Promise<A> => Effect.runPromise(program.pipe(Effect.provide(layer)));

/**
 * Helper: run Effect with a per-request Layer (e.g., DatabaseService).
 * Usage inside Hono handler:
 *   await Effect.runPromise(program.pipe(Effect.provide(makeDatabaseLayer(c.env.DATABASE))))
 */
