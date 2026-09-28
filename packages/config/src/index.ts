import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import { z } from "zod";

const envSchema = z.object({
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().optional(),
  DATABASE: z
    .custom<D1Database>(
      (v): v is D1Database => typeof v === "object" && v !== null
    )
    .optional(),
  NODE_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  R2_BUCKET: z
    .custom<R2Bucket>((v): v is R2Bucket => typeof v === "object" && v !== null)
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

export const parseEnv = (raw: unknown): Env => envSchema.parse(raw);

export const parseEnvSafe = (
  raw: unknown
):
  | { success: true; data: Env }
  | { success: false; error: z.ZodError<Env> } => {
  const result = envSchema.safeParse(raw);
  return result.success
    ? { data: result.data, success: true }
    : { error: result.error, success: false };
};

export const isProduction = (env: Env): boolean =>
  env.NODE_ENV === "production";
export const isDevelopment = (env: Env): boolean =>
  env.NODE_ENV === "development";
export const isTest = (env: Env): boolean => env.NODE_ENV === "test";
