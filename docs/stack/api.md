# API

## Transport

Hono + Hono RPC. `apps/api/src/app.ts` exports `AppType` for `hc<AppType>` ( `hono/client` ).

## Structure

```
request → Hono → zValidator → Effect program → domain/service → Drizzle → D1 → typed JSON
```

Handlers are thin. Business logic in `packages/domain` or `apps/api/src/services/*`.

## Typed Errors

Every domain error has `httpStatus`. Handler mapper:

```ts
if (e._tag === "NotFoundError") return c.json({ code: e._tag, message }, 404)
if (e._tag === "ValidationError") return c.json({ code: e._tag, issues }, 400)
...
return c.json({ code: "InternalError", message: "Internal Server Error" }, 500)
```

Never leak stack / binding details.

## Validation

`packages/validation` = zod schemas. Used in `zValidator("json", schema)` server and `react-hook-form` client.

## Hono RPC Client

```ts
import { hc } from "hono/client"
import type { AppType } from "@unsung/api"
const client = hc<AppType>("http://localhost:8787")
const res = await client.api.projects.$get()
```

For Expo/TanStack, wrap with `tanstack-query`.

## Example

`GET /api/projects` → Hono validates query, runs `Effect ProjectsService.list`, returns `{ projects }`.
`POST /api/projects { name }` → validates, `ProjectsService.create`, returns 201.

See `apps/api/src/routes/projects.ts`.
