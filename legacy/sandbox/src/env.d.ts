// Optional secrets / vars not included in the Wrangler-generated types.
// `wrangler types` emits everything declared under `vars` / `kv_namespaces`
// / `d1_databases` / etc., but secrets pushed via `wrangler secret put`
// and optional fall-throughs (e.g. R2 access keys, Browser Rendering REST
// credentials) only show up here.
//
// Keep this list in sync with .dev.vars.example and the README so the
// type system catches typos at compile time instead of at runtime.
declare namespace Cloudflare {
  interface Env {
    // Anthropic — required secret (also declared in package.json `bindings`).
    WEBHOOK_SECRET: string;

    // Anthropic Managed Agents — session environment + API auth.
    // Set via `wrangler secret put` (or .dev.vars locally).
    ANTHROPIC_ENVIRONMENT_KEY?: string;
    ANTHROPIC_API_KEY: string;
    ENVIRONMENT_ID: string;

    // Optional — agent inbox sender / catch-all destination. See
    // .dev.vars.example and the README.
    EMAIL_DOMAIN?: string;
    EMAIL_FROM?: string;

    // Override the Anthropic API host. Defaults to https://api.anthropic.com
    // when unset; see `resolveAnthropicBaseURL` in src/anthropic.ts.
    ANTHROPIC_BASE_URL?: string;

    // Browser Rendering REST credentials. Either both are present (REST
    // path, faster, supports /markdown natively) or both are absent and
    // we fall back to the BROWSER binding via @cloudflare/puppeteer.
    CLOUDFLARE_API_TOKEN?: string;
    CLOUDFLARE_ACCOUNT_ID?: string;

    // R2 access keys for the BACKUP_BUCKET snapshot path. In production
    // the Sandbox SDK uses these to presign URLs. In dev the same
    // BACKUP_BUCKET R2 binding works without them (localBucket: true).
    // We accept either the R2_ or AWS_ prefix — both are valid Sandbox
    // SDK conventions.
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    // Name of the bucket the SDK should target when minting presigned
    // URLs. Matches `r2_buckets[].bucket_name` in wrangler.jsonc.
    BACKUP_BUCKET_NAME?: string;

    // Fallback inbox for stray (non-session) email arriving on the
    // catch-all route. When unset, unroutable mail is dropped after
    // logging.
    EMAIL_FORWARD?: string;

    // IZWA refinery — optional vars. The specialist reasoning model for
    // Workers AI. Defaults to @cf/meta/llama-3.3-70b-instruct-fp8-fast
    // when unset (see src/refinery/router.ts).
    IZWA_TEXT_MODEL?: string;

    // IZWA open-chat LLM adapter (src/llm/provider.ts). Defaults to a local
    // Ollama endpoint so `wrangler dev` runs the whole chat loop for free.
    //   LLM_PROVIDER = openai-compatible (default) | workers-ai
    //   LLM_BASE_URL = OpenAI-compatible /v1 root (default http://127.0.0.1:11434/v1)
    //   LLM_API_KEY  = optional bearer token (never put in wrangler.jsonc vars)
    //   LLM_MODEL    = model id (default llama3.2)
    LLM_PROVIDER?: string;
    LLM_BASE_URL?: string;
    LLM_API_KEY?: string;
    LLM_MODEL?: string;

    // Demo mode. When truthy, the refinery uses deterministic mock
    // embeddings + specialist output instead of Workers AI — the whole
    // pipeline (profile → route → negotiate → crystallize/escalate →
    // resolve) runs locally in `wrangler dev` with no AI dependency.
    IZWA_MOCK?: string;
  }
}
