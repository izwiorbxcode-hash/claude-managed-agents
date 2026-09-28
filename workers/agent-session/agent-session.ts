// AgentSession — the stateful heart of the IZWA open-chat path.
//
// One DO per chat session (`idFromName(sessionId)`). It owns a Workspace
// (SQLite-backed file store, same as IsolateRunner) plus the full tool
// catalog, and runs a provider-agnostic agent loop via the ai-sdk:
//
//   POST /api/chat/:sessionId  { message, model? } -> SSE stream
//   GET  /api/chat/:sessionId                     -> message history
//   DELETE /api/chat/:sessionId                   -> reset history
//
// The loop is request-driven (unlike the Anthropic webhook/poll path) and
// talks to any OpenAI-compatible endpoint — local Ollama in dev (free),
// OpenRouter / Groq / Workers AI in prod. Conversation history persists in
// DO SQLite via `src/llm/history.ts`, so sessions survive DO eviction.

import { Agent } from "agents";
import { Workspace } from "@cloudflare/shell";
import { streamText } from "ai";
import type { Tool } from "ai";
import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";
import { ISOLATE_SYSTEM_PROMPT } from "../isolate/system-prompt";
import {
  isolateBrowserTools,
  isolateExecuteTool,
  isolateRunFileTool,
  isolateTools,
} from "../isolate/tools";
import { buildCfTools } from "../tools/cf";
import { resolveSessionPolicy } from "../egress/resolve";
import { createLlmModel, getLlmInfo } from "./provider";
import { betaToolToAiTool } from "./adapter";
import {
  appendMessages,
  clearMessages,
  ensureHistorySchema,
  loadMessages,
  toModelMessages,
  type ChatMessage,
  type ToolCallRecord,
} from "./history";

// Cap on model round-trips for one user turn. A runaway tool loop aborts
// here instead of burning unbounded tokens against a remote model.
const MAX_STEPS = 10;

export interface AgentSessionState {
  model: string | null;
}

const EMPTY_STATE: AgentSessionState = { model: null };

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function sse(event: string, data: unknown): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export class AgentSession extends Agent<Env, AgentSessionState> {
  initialState: AgentSessionState = EMPTY_STATE;

  workspace: Workspace = new Workspace({
    sql: this.ctx.storage.sql,
    name: () => "agent-session",
  });

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = url.pathname.split("/").pop() ?? "(unknown)";
    const sql = this.ctx.storage.sql;
    ensureHistorySchema(sql);

    if (request.method === "GET") {
      const messages = loadMessages(sql);
      return Response.json(
        { sessionId, messages, llm: getLlmInfo(this.env) },
        { headers: JSON_HEADERS },
      );
    }

    if (request.method === "DELETE") {
      clearMessages(sql);
      return Response.json(
        { sessionId, status: "reset" },
        { headers: JSON_HEADERS },
      );
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "method not allowed" }), {
        status: 405,
        headers: JSON_HEADERS,
      });
    }

    let body: { message?: unknown; model?: unknown } = {};
    try {
      body = (await request.json()) as { message?: unknown; model?: unknown };
    } catch {
      // fall through to the validation error below
    }
    const userText = typeof body.message === "string" ? body.message : "";
    if (!userText.trim()) {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: JSON_HEADERS },
      );
    }
    const modelOverride = typeof body.model === "string" ? body.model : undefined;

    return this.chatStream(sessionId, userText, modelOverride, sql);
  }

  // Run one agent turn. Streams SSE events to the client as the model
  // produces text and executes tools, then persists the full turn.
  private async chatStream(
    sessionId: string,
    userText: string,
    modelOverride: string | undefined,
    sql: SqlStorage,
  ): Promise<Response> {
    const history = loadMessages(sql);
    const tools = await this.buildTools(sessionId);
    const model = createLlmModel(
      this.env,
      modelOverride ? { model: modelOverride } : undefined,
    );
    const messages = toModelMessages(history);
    messages.push({ role: "user", content: userText });

    const result = streamText({
      model,
      system: ISOLATE_SYSTEM_PROMPT,
      messages,
      tools,
      maxSteps: MAX_STEPS,
      maxRetries: 0,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const stored: ChatMessage[] = [];
        // One assistant message accumulates per model step: text deltas plus
        // the step's tool calls. Tool results flush it to `stored` and then
        // land as their own `role: "tool"` messages — which is exactly the
        // ordering the model expects on the next turn.
        let assistant: { text: string; toolCalls: ToolCallRecord[] } | null =
          null;
        let assistantFlushed = false;
        const flushAssistant = () => {
          if (assistant && !assistantFlushed) {
            stored.push({
              role: "assistant",
              content: assistant.text,
              toolCalls: assistant.toolCalls.length
                ? assistant.toolCalls
                : undefined,
            });
            assistantFlushed = true;
          }
        };

        try {
          for await (const part of result.fullStream) {
            switch (part.type) {
              case "text-delta": {
                if (!assistant) {
                  assistant = { text: "", toolCalls: [] };
                  assistantFlushed = false;
                }
                assistant.text += part.textDelta;
                controller.enqueue(
                  encoder.encode(
                    sse("text", { text: part.textDelta }),
                  ),
                );
                break;
              }
              case "tool-call": {
                if (!assistant) {
                  assistant = { text: "", toolCalls: [] };
                  assistantFlushed = false;
                }
                assistant.toolCalls.push({
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  input: part.args,
                });
                controller.enqueue(
                  encoder.encode(
                    sse("tool_call", {
                      id: part.toolCallId,
                      name: part.toolName,
                      args: part.args,
                    }),
                  ),
                );
                break;
              }
              case "tool-result": {
                // The current step's assistant message is complete once its
                // tool results start arriving — flush it before storing the
                // tool messages so ordering stays correct.
                flushAssistant();
                const content =
                  typeof part.result === "string"
                    ? part.result
                    : JSON.stringify(part.result);
                stored.push({
                  role: "tool",
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  content,
                });
                controller.enqueue(
                  encoder.encode(
                    sse("tool_result", {
                      id: part.toolCallId,
                      name: part.toolName,
                      result: content,
                    }),
                  ),
                );
                break;
              }
              case "finish": {
                flushAssistant();
                break;
              }
              case "error": {
                console.error(
                  `[izwa][chat] stream error session=${sessionId}: ${part.error.message}`,
                );
                controller.enqueue(
                  encoder.encode(sse("error", { error: part.error.message })),
                );
                break;
              }
              default: {
                // reasoning / file / source / step-start / step-finish — no
                // client-facing surface yet.
                break;
              }
            }
          }
          flushAssistant();

          const nextHistory: ChatMessage[] = [
            ...history,
            { role: "user", content: userText },
            ...stored,
          ];
          clearMessages(sql);
          appendMessages(sql, nextHistory);

          controller.enqueue(
            encoder.encode(
              sse("done", {
                sessionId,
                model: model.modelId,
                messages: nextHistory.length,
              }),
            ),
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[izwa][chat] loop failed session=${sessionId}: ${message}`);
          try {
            controller.enqueue(encoder.encode(sse("error", { error: message })));
          } catch {
            // controller already closed
          }
        } finally {
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  }

  // Build the full tool catalog for a session, reusing the exact same
  // factories the Anthropic Isolate path registers. Every tool is adapted to
  // an ai-sdk `Tool` so `streamText` can drive the loop natively.
  private async buildTools(sessionId: string): Promise<Record<string, Tool>> {
    const tools: Record<string, Tool> = {};
    const add = (t: BetaRunnableTool) => {
      tools[t.name] = betaToolToAiTool(t);
    };

    for (const t of isolateTools({ workspace: this.workspace, sessionId })) {
      add(t);
    }

    // Egress: resolve the session's policy and route outbound traffic from
    // execute / run_file through the same gateway the IsolateRunner uses.
    let policy: Awaited<ReturnType<typeof resolveSessionPolicy>> = null;
    try {
      policy = await resolveSessionPolicy(this.env, sessionId);
    } catch (error) {
      console.warn(
        `[izwa][chat] egress policy resolution failed session=${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const outbound = this.ctx.exports.IsolateOutboundGateway({
      props: { sessionId, policy },
    }) as Fetcher;

    if (this.env.LOADER) {
      try {
        add(
          await isolateExecuteTool({
            workspace: this.workspace,
            loader: this.env.LOADER,
            globalOutbound: outbound,
          }),
        );
      } catch (error) {
        console.warn(
          `[izwa][chat] execute tool registration failed session=${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      try {
        add(
          isolateRunFileTool({
            workspace: this.workspace,
            loader: this.env.LOADER,
            sessionId,
            globalOutbound: outbound,
          }),
        );
      } catch (error) {
        console.warn(
          `[izwa][chat] run_file tool registration failed session=${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      if (this.env.BROWSER) {
        try {
          const browserTools = await isolateBrowserTools({
            loader: this.env.LOADER,
            browser: this.env.BROWSER,
          });
          for (const t of browserTools) add(t);
        } catch (error) {
          console.warn(
            `[izwa][chat] browser tool registration failed session=${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    try {
      const cfTools = buildCfTools({
        workspace: this.workspace,
        env: this.env,
        sessionId,
      });
      for (const t of cfTools) add(t);
    } catch (error) {
      console.warn(
        `[izwa][chat] cf tool registration failed session=${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return tools;
  }
}

export function getAgentSession(env: Env, sessionId: string) {
  const id = env.AgentSession.idFromName(`chat-${sessionId}`);
  return env.AgentSession.get(id) as DurableObjectStub<AgentSession>;
}
