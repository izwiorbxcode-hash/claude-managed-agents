# ADR-007: Paystack Billing (Optional Module)

## Status
Accepted (Phase 5, optional)

## Context
SAAS clients need subscriptions/one-time, often with org billing. Paystack is primary for ZA/NG. Community plugin `better-auth-paystack` (Alex Asomba) targets Better Auth + Hono + Workers and claims subs, webhooks, org billing. Better Auth official plugin catalog does NOT list Paystack as first-party — it is community.

## Decision
Treat Paystack as **optional Unsung module**:

- `packages/billing` owns the abstraction; implementation uses `better-auth-paystack`.
- Keep isolated: no Better Auth core coupling without explicit install.
- Server-only webhook verification (`PAYSTACK_SECRET_KEY` never to client).
- Payment state is external-system integration → typed failures, idempotent handling, not trusted from client.

## Consequences
- `better-auth-paystack` version pinned; if upstream drifts, adapter shields domain.
- Clients without Paystack ship zero Paystack code.
- Audit: community plugin has fewer eyes than first-party — review webhook HMAC logic before prod.

## Alternatives
Stripe plugin (first-party) — keep as fallback adapter under same `BillingService` interface if client uses Stripe.
