# Billing (Paystack) — Optional

Phase 5. Keep `packages/billing` empty until needed.

## Plugin

Community `better-auth-paystack` (`betterAuthPaystack`).

```ts
import { paystack } from "better-auth-paystack"
betterAuth({
  plugins: [paystack({ secretKey: env.PAYSTACK_SECRET_KEY, webhookSecret: env.PAYSTACK_WEBHOOK_SECRET })]
})
```

Supports: customers, one-time, subscriptions, trials, org billing, `transaction history`, webhook verification.

## Service

```ts
class BillingService extends Context.Tag("BillingService")<BillingService, {
  createCheckout(params): Effect<Checkout, BillingError>
  getSubscription(id): Effect<Subscription, BillingError>
  verifyWebhook(req): Effect<WebhookEvent, BillingError>
}> {}
```

`PAYSTACK_SECRET_KEY` never leaves server. Client receives only `authorization_url`/`reference`.

## Webhooks

Verify server-side (`x-paystack-signature` HMAC). Treat as external integration → idempotent, typed failures.

Do not trust client `success` callback as source of truth.

Refs:

- https://github.com/alexasomba/better-auth-paystack
- https://paystack.com/docs/
