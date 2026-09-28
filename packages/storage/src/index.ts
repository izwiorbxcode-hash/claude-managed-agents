/**
 * Storage — Phase 4 (R2). Typed stub using Effect services.
 */
import { Context, Data, Effect } from "effect";

export class StorageError extends Data.TaggedError("StorageError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly httpStatus: 500 | 502;
}> {}

export interface HeadResult {
  readonly contentType?: string | undefined;
  readonly etag?: string | undefined;
  readonly size: number;
}

export type StorageBody = ReadableStream<Uint8Array> | ArrayBuffer | string;

export interface StorageServiceShape {
  readonly delete: (key: string) => Effect.Effect<void, StorageError>;
  readonly get: (
    key: string
  ) => Effect.Effect<ReadableStream<Uint8Array> | null, StorageError>;
  readonly head: (
    key: string
  ) => Effect.Effect<HeadResult | null, StorageError>;
  readonly put: (
    key: string,
    body: StorageBody
  ) => Effect.Effect<void, StorageError>;
}

export class Storage extends Context.Tag("Storage")<
  Storage,
  StorageServiceShape
>() {}

export const StorageLiveStub: StorageServiceShape = {
  delete: (_key: string) =>
    Effect.fail(
      new StorageError({ httpStatus: 500, message: "Storage not configured" })
    ),
  get: (_key: string) =>
    Effect.fail(
      new StorageError({ httpStatus: 500, message: "Storage not configured" })
    ),
  head: (_key: string) =>
    Effect.fail(
      new StorageError({ httpStatus: 500, message: "Storage not configured" })
    ),
  put: (_key: string, _body: StorageBody) =>
    Effect.fail(
      new StorageError({ httpStatus: 500, message: "Storage not configured" })
    ),
};
