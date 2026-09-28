// Reverse adapter: convert an Anthropic `BetaRunnableTool` into an ai-sdk
// `Tool` so the open-chat loop (`src/llm/agent-session.ts`) can reuse the
// exact same tool catalog the Anthropic paths register (workspace tools,
// execute / run_file / browser, cf_* + custom tools).
//
// The ai-sdk `Tool` needs a JSON-Schema `inputSchema` and an async
// `execute(input, options)`. `BetaRunnableTool` already ships the JSON schema
// (`input_schema`) and a `run(args, ctx)` — so the conversion is structural.
// Errors are surfaced as plain text, mirroring what the Anthropic dispatcher
// returns to the model.

import { asSchema, tool, type Tool } from "ai";
import {
  toolName,
  type BetaRunnableTool,
  type BetaToolRunContext,
  type BetaToolUse,
} from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";

// `BetaRunnableTool` is a union of concrete tool shapes (`BetaTool`, the
// memory tool, bash/text-editor variants, ...). Only `BetaTool` carries
// `description` / `input_schema`; the others model different request bodies.
// `toolName()` is the SDK's canonical key resolver. Everything else degrades
// to an empty object schema so the ai-sdk `Tool` stays well-formed.
function inputSchemaOf(t: BetaRunnableTool): Record<string, unknown> {
  if ("input_schema" in t && t.input_schema && typeof t.input_schema === "object") {
    return t.input_schema as unknown as Record<string, unknown>;
  }
  return { type: "object", properties: {}, required: [] };
}

function descriptionOf(t: BetaRunnableTool): string {
  return "description" in t && typeof t.description === "string" ? t.description : "";
}

export function betaToolToAiTool(t: BetaRunnableTool): Tool {
  const schema = asSchema(inputSchemaOf(t));
  return tool({
    name: toolName(t),
    description: descriptionOf(t),
    inputSchema: schema,
    execute: async (args, options) => {
      const ctx: BetaToolRunContext | undefined = options
        ? {
            toolUse: {
              id: options.toolCallId ?? `call_${Date.now()}`,
            } as BetaToolUse,
          }
        : undefined;
      try {
        const result = await t.run(args as Record<string, unknown>, ctx);
        if (typeof result === "string") return result;
        // Content blocks (e.g. image results) don't round-trip through an
        // OpenAI-compatible tool result — stringify for the model.
        return JSON.stringify(result);
      } catch (error) {
        return `error: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  }) as Tool;
}
