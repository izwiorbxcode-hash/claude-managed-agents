// Provider-agnostic LLM adapter for the IZWA open-chat path.
//
// The control plane's Anthropic path (`src/webhooks.ts`, `src/isolate/runner.ts`)
// is bound to Anthropic's Managed Agents webhook/poll loop. This module is the
// first step of the decoupling: a single OpenAI-compatible abstraction that can
// talk to a local model server (Ollama / LM Studio), any OpenAI-compatible host
// (OpenRouter, Groq, Together), or Cloudflare Workers AI — all through the
// `@ai-sdk/openai-compatible` provider.
//
// "Test for free": with no env config at all, the adapter defaults to a local
// Ollama at http://127.0.0.1:11434/v1. Run `ollama serve` + `ollama pull
// llama3.2` and the whole chat loop runs locally with zero API cost.

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV4 } from "@ai-sdk/provider";

export type LlmProvider = "openai-compatible" | "workers-ai";

export interface LlmConfig {
  provider: LlmProvider;
  // Base URL for the OpenAI-compatible `/chat/completions` endpoint. For
  // Ollama this is `http://127.0.0.1:11434/v1`; for OpenRouter/Groq the
  // provider's `/v1` root; for Workers AI it's the account-scoped
  // `/ai/v1` path (see below).
  baseURL: string;
  apiKey: string | null;
  model: string;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

// Resolve the active LLM config from the environment.
//
//   LLM_PROVIDER=openai-compatible (default) | workers-ai
//   LLM_BASE_URL=<OpenAI-compatible /v1 root>       (default: local Ollama)
//   LLM_API_KEY=<optional bearer token>
//   LLM_MODEL=<model id>                            (default: llama3.2)
//
// `LLM_API_KEY` is optional — Ollama and many self-hosted endpoints accept
// requests without one. When set it is sent as `Authorization: Bearer ...`.
export function resolveLlmConfig(env: Env): LlmConfig {
  const provider = (env.LLM_PROVIDER ?? "openai-compatible").toLowerCase();

  if (provider === "workers-ai") {
    // Workers AI exposes an OpenAI-compatible endpoint:
    //   https://api.cloudflare.com/client/v4/accounts/{account}/ai/v1/chat/completions
    // Auth is a bearer token (`CLOUDFLARE_API_TOKEN`).
    const account = env.CLOUDFLARE_ACCOUNT_ID ?? "";
    const token = env.CLOUDFLARE_API_TOKEN ?? "";
    if (!account || !token) {
      throw new Error(
        "LLM_PROVIDER=workers-ai requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Workers AI OpenAI-compatible endpoint).",
      );
    }
    return {
      provider,
      baseURL: `https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1`,
      apiKey: token,
      model: env.LLM_MODEL ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    };
  }

  return {
    provider: "openai-compatible",
    baseURL: stripTrailingSlash(
      env.LLM_BASE_URL ?? "http://127.0.0.1:11434/v1",
    ),
    apiKey: env.LLM_API_KEY ?? null,
    model: env.LLM_MODEL ?? "llama3.2",
  };
}

// Build an ai-sdk language model for the active config. `overrides` let a
// per-request caller pick a different model (e.g. the UI's model selector)
// without touching env.
export function createLlmModel(
  env: Env,
  overrides?: Partial<Pick<LlmConfig, "model" | "baseURL" | "apiKey">>,
): LanguageModelV4 {
  const cfg = { ...resolveLlmConfig(env), ...(overrides ?? {}) };
  const provider = createOpenAICompatible({
    name: cfg.provider,
    baseURL: cfg.baseURL,
    ...(cfg.apiKey ? { apiKey: cfg.apiKey } : {}),
  });
  return provider.chatModel(cfg.model);
}

// Non-secret view of the active config for the dashboard / API. Never
// includes the API key.
export function getLlmInfo(env: Env): {
  provider: LlmProvider;
  baseURL: string;
  model: string;
  configured: boolean;
} {
  try {
    const cfg = resolveLlmConfig(env);
    return {
      provider: cfg.provider,
      baseURL: cfg.baseURL,
      model: cfg.model,
      configured: true,
    };
  } catch (error) {
    return {
      provider: "openai-compatible",
      baseURL: "http://127.0.0.1:11434/v1",
      model: "llama3.2",
      configured: false,
    };
  }
}
