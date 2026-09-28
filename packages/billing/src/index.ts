/**
 * Billing — Phase 5 optional (better-auth-paystack). Stub.
 * Fully typed placeholder implementing Effect Service pattern.
 */
import { Context, Data, Effect } from "effect";

export interface CreateCheckoutParams {
  readonly cancelUrl: string;
  readonly priceId: string;
  readonly successUrl: string;
  readonly userId: string;
}

export interface CheckoutSession {
  readonly id: string;
  readonly url: string;
}

export class BillingError extends Data.TaggedError("BillingError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly httpStatus: 402 | 500 | 502;
}> {}

export interface BillingServiceShape {
  readonly createCheckout: (
    params: CreateCheckoutParams
  ) => Effect.Effect<CheckoutSession, BillingError>;
  readonly verifyWebhook: (
    req: Request
  ) => Effect.Effect<{ event: string; data: unknown }, BillingError>;
}

export class BillingService extends Context.Tag("BillingService")<
  BillingService,
  BillingServiceShape
>() {}

export const BillingServiceLiveStub: BillingServiceShape = {
  createCheckout: (_params: CreateCheckoutParams) =>
    Effect.fail(
      new BillingError({ httpStatus: 500, message: "Billing not configured" })
    ),
  verifyWebhook: (_req: Request) =>
    Effect.fail(
      new BillingError({ httpStatus: 500, message: "Billing not configured" })
    ),
};

export const BillingServiceTag = "BillingService" as const;
