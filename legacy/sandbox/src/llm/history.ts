// Conversation persistence for the open-chat path.
//
// History lives in the AgentSession DO's SQLite storage as JSON blobs — one
// row per message, ordered by autoincrement id. We store our own `ChatMessage`
// shape (provider-agnostic) and convert to the ai-sdk `ModelMessage` shape on
// the way into the loop. Keeping our own shape means we never depend on the
// ai-sdk's internal message tracking for persistence.

import type { ModelMessage } from "@ai-sdk/provider-utils";

export interface ToolCallRecord {
  toolCallId: string;
  toolName: string;
  input: unknown;
}

export type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCallRecord[] }
  | { role: "tool"; toolCallId: string; toolName: string; content: string };

const TABLE = "izwa_chat_messages";

export function ensureHistorySchema(sql: SqlStorage): void {
  sql.exec(`CREATE TABLE IF NOT EXISTS ${TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL
  )`);
}

export function clearMessages(sql: SqlStorage): void {
  sql.exec(`DELETE FROM ${TABLE}`);
}

export function appendMessages(sql: SqlStorage, messages: ChatMessage[]): void {
  if (messages.length === 0) return;
  const stmt = sql.prepare(`INSERT INTO ${TABLE} (message) VALUES (?)`);
  sql.batch(
    messages.map((m) => stmt.bind(JSON.stringify(m))),
  );
}

export function loadMessages(sql: SqlStorage): ChatMessage[] {
  const cursor = sql.exec<{ message: string }>(
    `SELECT message FROM ${TABLE} ORDER BY id ASC`,
  );
  const out: ChatMessage[] = [];
  for (const row of cursor) {
    try {
      out.push(JSON.parse(row.message) as ChatMessage);
    } catch {
      // Skip corrupt rows — never let a bad blob brick the conversation.
    }
  }
  return out;
}

// Convert stored messages into the ai-sdk `ModelMessage` input shape.
// Tool calls/results are inline content parts in ai v6.
export function toModelMessages(history: ChatMessage[]): ModelMessage[] {
  return history.map((m): ModelMessage => {
    switch (m.role) {
      case "user":
        return { role: "user", content: m.content };
      case "tool":
        return {
          role: "tool",
          content: [{ type: "tool-result", toolCallId: m.toolCallId, result: m.content }],
        };
      case "assistant": {
        const parts: Array<
          | { type: "text"; text: string }
          | { type: "tool-call"; toolCallId: string; toolName: string; input: unknown }
        > = [];
        if (m.content.length > 0) parts.push({ type: "text", text: m.content });
        for (const tc of m.toolCalls ?? []) {
          parts.push({
            type: "tool-call",
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            input: tc.input,
          });
        }
        return { role: "assistant", content: parts };
      }
    }
  });
}
