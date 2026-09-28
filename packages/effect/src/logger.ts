import { Context, Effect } from "effect";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface AppLogger {
  readonly log: (
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown> | undefined
  ) => Effect.Effect<void>;
}

export class LoggerService extends Context.Tag("LoggerService")<
  LoggerService,
  AppLogger
>() {}

export const LoggerServiceLive: AppLogger = LoggerService.of({
  log: (
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown> | undefined
  ) =>
    Effect.gen(function* () {
      const entry: Record<string, unknown> = {
        level,
        message,
        ...meta,
        timestamp: new Date().toISOString(),
      };
      if (level === "error") {
        yield* Effect.logError(entry);
      } else if (level === "warn") {
        yield* Effect.logWarning(entry);
      } else {
        yield* Effect.log(entry);
      }
    }),
});

export const withRequestId =
  (requestId: string) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    effect.pipe(
      Effect.provideService(LoggerService, {
        log: (
          level: LogLevel,
          message: string,
          meta?: Record<string, unknown> | undefined
        ) =>
          Effect.gen(function* () {
            const entry: Record<string, unknown> = {
              level,
              message,
              requestId,
              ...meta,
              timestamp: new Date().toISOString(),
            };
            if (level === "error") {
              yield* Effect.logError(entry);
            } else if (level === "warn") {
              yield* Effect.logWarning(entry);
            } else {
              yield* Effect.log(entry);
            }
          }),
      })
    );
