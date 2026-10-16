// Thin API client. Returns parsed JSON or throws on non-2xx.

export class ApiError extends Error {
  readonly body: unknown;
  readonly status: number;

  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    if (
      body &&
      typeof body === "object" &&
      "error" in (body as Record<string, unknown>)
    ) {
      message = String((body as Record<string, unknown>).error);
    }
    throw new ApiError(res.status, body, message);
  }
  return body as T;
}

export interface HealthResponse {
  requestId: string;
  status: "ok";
  success: true;
  timestamp: string;
}

export interface UploadResult {
  assetId: string;
  duplicate?: boolean;
  r2Key: string;
  sizeBytes: number;
  sourceGroupId: string;
  status: "uploaded";
}

export interface AnnotationDraft {
  alternativeReadings: string;
  context: string;
  culturalMeaning: string;
  intendedMeaning: string;
  literalMeaning: string;
  socialFunction: string;
  uncertainty: string;
}

const safeMediaKey = (name: string): string => {
  const normalized = name.replaceAll(/[^A-Za-z0-9._-]/g, "-");
  return normalized.slice(0, 180) || `recording-${Date.now()}.audio`;
};

export const richAudioApi = {
  correctTranscript: (assetId: string, transcript: string) =>
    request<{ assetId: string; status: string; transcript: string }>(
      `/api/izwa/media/${encodeURIComponent(assetId)}/transcript`,
      {
        body: JSON.stringify({ transcript }),
        headers: {
          "content-type": "application/json",
          "x-user-id": "web-contributor",
        },
        method: "PATCH",
      }
    ),
  createMeaningTask: ({
    assetId,
    draft,
    transcript,
  }: {
    assetId: string;
    draft: AnnotationDraft;
    transcript: string;
  }) =>
    request<{ escalationId: string; status: string; taskId: string }>(
      "/api/izwa/idioms/tasks",
      {
        body: JSON.stringify({
          alternative_readings: draft.alternativeReadings
            ? [draft.alternativeReadings]
            : [],
          assetId,
          context: [draft.context, draft.culturalMeaning]
            .filter(Boolean)
            .join("\n\n"),
          expression_span: { end_ms: 0, start_ms: 0, text: transcript },
          intended_meaning: draft.intendedMeaning,
          literal_meaning: draft.literalMeaning,
          social_function: draft.socialFunction
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          transcript,
          uncertainty: draft.uncertainty,
        }),
        headers: {
          "content-type": "application/json",
          "x-user-id": "web-contributor",
        },
        method: "POST",
      }
    ),
  health: () => request<HealthResponse>("/api/health"),
  transcribe: (assetId: string) =>
    request<{
      assetId: string;
      segmentId: string;
      status: string;
      transcript: string;
      vtt: string;
    }>(`/api/izwa/media/${encodeURIComponent(assetId)}/transcribe`, {
      method: "POST",
    }),
  upload: (file: File, metadata: { language: string; sourceType: string }) =>
    request<UploadResult>(
      `/api/izwa/media/${encodeURIComponent(safeMediaKey(file.name))}`,
      {
        body: file,
        headers: {
          "content-type": file.type || "audio/mpeg",
          "x-izwa-consent": JSON.stringify({
            language: metadata.language,
            permittedUses: ["transcription", "annotation", "community_review"],
            sourceType: metadata.sourceType,
            version: "contribution-v1",
          }),
          "x-user-id": "web-contributor",
        },
        method: "PUT",
      }
    ),
};

export interface ConfigCapabilities {
  browserRendering: boolean;
  emailInbox: boolean;
  emailSend: boolean;
  // True when at least one persisted agent uses the MicroVM backend (or
  // no agents exist yet — `microvm` is the default). Lets the dashboard
  // hide the snapshots warning on Isolate-only deployments. Optional so
  // older worker deploys still parse.
  hasMicrovmAgents?: boolean;
  // Whether MicroVM `/workspace` snapshots are being persisted. False
  // when the BACKUP_BUCKET R2 binding is absent, which means container
  // hibernation will silently lose state.
  snapshots: boolean;
  // How snapshots are routed when they ARE enabled. "presigned" is the
  // production path (R2 access keys + account id present); "localBucket"
  // is the dev fallback that talks to the R2 binding directly; "disabled"
  // means no binding at all.
  snapshotsMode: "presigned" | "localBucket" | "disabled";
  workersAi: boolean;
}

export interface ConfigResponse {
  anthropicBaseURL: string;
  // Optional so older worker deploys still parse — frontend code that
  // reads these flags should fall back to `undefined`-tolerant logic.
  capabilities?: ConfigCapabilities;
  environmentId: string | null;
  missing: string[];
}

// Backend identifier persisted on each agent.
//   "microvm" — Cloudflare Sandbox SDK (containers / microVMs)
//   "isolate" — Cloudflare Workers isolate + SQLite Workspace (no shell)
export type AgentBackend = "microvm" | "isolate";

// Tool catalog entry returned by `/api/tool-catalog`. The fields the
// dashboard renders are the same across every group; `available` and
// `requires` are only set for binding-gated tools so the form can
// disable / hint accordingly.
export interface ToolCatalogEntry {
  available?: boolean;
  description: string;
  displayName: string;
  // Set on `isolatePower` entries that the MicroVM backend can also
  // host (browser CDP tools today). Used by the agent form to surface
  // these in the MicroVM tool catalog alongside cf_* tools.
  microvmEligible?: boolean;
  name: string;
  requires?: string | null;
}

export interface ToolCatalogResponse {
  cfTools: ToolCatalogEntry[];
  custom: ToolCatalogEntry[];
  isolatePower: ToolCatalogEntry[];
  isolateWorkspace: ToolCatalogEntry[];
  microvmStock: ToolCatalogEntry[];
  serverSide: ToolCatalogEntry[];
}

// Workspace file/directory entry returned by the Isolate Sandbox browse
// endpoints. Mirrors the `FileInfo` shape the control plane DO marshals across the
// RPC boundary — kept as a plain object so the wire format stays trivial.
export interface WorkspaceEntry {
  createdAt: number;
  mimeType: string;
  name: string;
  path: string;
  size: number;
  type: "file" | "directory" | "symlink";
  updatedAt: number;
}

export interface SessionRecord {
  backend?: AgentBackend;
  containerStatus?: string;
  createdAt: string;
  lastWebhookAt: string;
  lastWebhookType: string;
  sessionId: string;
}

export interface SessionPage {
  items: SessionRecord[];
  limit: number;
  page: number;
  pages: number;
  total: number;
}

export interface WebhookEvent {
  // Anthropic uses `created_at`; older payloads used `timestamp`. We surface
  // whichever one is set in the event.
  created_at?: string;
  data: {
    type: string;
    id: string;
    organization_id?: string;
    workspace_id?: string;
  };
  id: string;
  timestamp?: string;
  type: "event";
}

export interface WebhookEventPage {
  cursor: string | null;
  hasMore: boolean;
  items: WebhookEvent[];
}

export interface SecretItem {
  key: string;
  updatedAt: string | null;
}

export interface EgressPolicy {
  // Catch-all flag — when true, this policy applies to every sandbox.
  // Mutually exclusive with `applyTo`; the form prevents combining them.
  appliesToAll?: boolean;
  applyTo: ApplyToMatcher[];
  createdAt: string;
  egressRules: EgressRule[];
  id: string;
  name: string;
  // Legacy field kept optional for back-compat with stored policies. The UI
  // no longer reads or writes this.
  sessionIds?: string[];
  updatedAt: string;
}

export type EgressRule =
  | { type: "allow"; host: string }
  | { type: "deny"; host: string }
  | {
      type: "header-injection";
      target: string;
      header: string;
      secretName: string;
    }
  | { type: "proxy"; code: string }
  | { type: "vpc-service"; binding: string; hostname: string };

export interface ApplyToMatcher {
  field: string;
  operator: "equals" | "contains" | "matches" | "is-one-of";
  value?: string;
  values?: string[];
}

export interface VpcBinding {
  binding: string;
  description?: string;
  id: string;
  type: "network" | "service";
}

export interface VpcResponse {
  docsUrl: string;
  items: VpcBinding[];
}

export const api = {
  agent: (id: string) => request<AnthropicAgent>(`/api/agents/${id}`),
  agentBackend: (id: string) =>
    request<{ agentId: string; backend: AgentBackend }>(
      `/api/agents/${encodeURIComponent(id)}/backend`
    ),

  // Anthropic-proxied APIs
  agents: () => request<{ data: AnthropicAgent[] }>("/api/agents"),
  archiveSession: (id: string) =>
    request<unknown>(`/api/sessions/${id}/archive`, { method: "POST" }),
  clearWebhookEvents: () =>
    request<{ deleted: number }>("/api/webhook-events", { method: "DELETE" }),
  config: () => request<ConfigResponse>("/api/config"),
  createSession: (body: unknown) =>
    request<AnthropicSession>("/api/sessions", {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  // User-defined custom tools — pulled at runtime from src/tools/custom-tools.ts.
  // `available` reflects whether the tool's `requires` predicate
  // currently passes against the deployed env so we can grey out
  // toggles for tools whose binding isn't configured.
  customTools: () =>
    request<{
      tools: Array<{ name: string; description: string; available: boolean }>;
    }>("/api/custom-tools"),
  deletePolicy: (id: string) =>
    request<{ id: string; status: string }>(
      `/api/egress-policies/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    ),
  deleteSecret: (key: string) =>
    request<{ key: string; status: string }>(
      `/api/secrets/${encodeURIComponent(key)}`,
      { method: "DELETE" }
    ),
  drainEnvironments: () =>
    request<{ status: string; spawned: unknown[] }>("/api/environments/drain", {
      method: "POST",
    }),
  environmentStatus: (sessionId: string) =>
    request<{
      sessionId: string;
      containerStatus: string;
      backend?: AgentBackend;
    }>(`/api/environments/${encodeURIComponent(sessionId)}/status`),

  // Sandboxes / sessions tracked by webhook ingestion.
  environments: (page: number, limit: number) =>
    request<SessionPage>(`/api/environments?page=${page}&limit=${limit}`),
  getPolicy: (id: string) =>
    request<EgressPolicy>(`/api/egress-policies/${encodeURIComponent(id)}`),

  // Isolate Sandbox defaults (recommended system prompt, etc).
  isolateDefaults: () =>
    request<{ systemPrompt: string }>("/api/isolate/defaults"),

  // Egress policies
  listPolicies: () =>
    request<{ items: EgressPolicy[] }>("/api/egress-policies"),

  // Secrets
  listSecrets: (cursor?: string | null) => {
    const qs = new URLSearchParams({ limit: "100" });
    if (cursor) {
      qs.set("cursor", cursor);
    }
    return request<{
      items: SecretItem[];
      cursor: string | null;
      hasMore: boolean;
    }>(`/api/secrets?${qs}`);
  },
  // MicroVM Sandbox defaults — analogous to isolateDefaults but covers
  // the container backend's quirks (shell, $ANTHROPIC_SESSION_ID env
  // var, /workspace persistence).
  microvmDefaults: () =>
    request<{ systemPrompt: string }>("/api/microvm/defaults"),
  policyDataFields: () =>
    request<{ items: string[] }>("/api/egress-policies/data-fields"),
  putSecret: (key: string, value: string) =>
    request<{ key: string; status: string }>(
      `/api/secrets/${encodeURIComponent(key)}`,
      {
        body: JSON.stringify({ value }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      }
    ),
  saveAgent: (id: string | null, body: unknown) =>
    request<AnthropicAgent>(id ? `/api/agents/${id}` : "/api/agents", {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  savePolicy: (policy: EgressPolicy) =>
    request<EgressPolicy>(
      `/api/egress-policies/${encodeURIComponent(policy.id)}`,
      {
        body: JSON.stringify(policy),
        headers: { "content-type": "application/json" },
        method: "PUT",
      }
    ),
  sendSessionMessage: (id: string, text: string) =>
    request<unknown>(`/api/sessions/${id}/events`, {
      body: JSON.stringify({
        events: [{ content: [{ text, type: "text" }], type: "user.message" }],
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  session: (id: string) => request<AnthropicSession>(`/api/sessions/${id}`),
  sessionEvents: (id: string) =>
    request<{ data: AnthropicEvent[] }>(`/api/sessions/${id}/events`),

  sessions: (backend?: AgentBackend) => {
    const qs = backend ? `?backend=${encodeURIComponent(backend)}` : "";
    return request<{ data: AnthropicSession[] }>(`/api/sessions${qs}`);
  },
  stopEnvironment: (sessionId: string) =>
    request<{ sessionId: string; status: string }>(
      `/api/environments/${encodeURIComponent(sessionId)}/stop`,
      { method: "POST" }
    ),

  // Full agent tool catalog. Single source of truth for the checkbox
  // grid in the agent form — backend changes (new cf_* tool, new
  // user-defined custom, etc.) surface in the UI automatically on the
  // next deploy without a frontend edit. `available: false` entries
  // still render but are greyed out so operators can see why the
  // checkbox is disabled.
  toolCatalog: () => request<ToolCatalogResponse>("/api/tool-catalog"),

  // VPC + Mesh
  vpc: () => request<VpcResponse>("/api/vpc"),
  webhookEvent: (eventId: string) =>
    request<WebhookEvent>(`/api/webhook-events/${encodeURIComponent(eventId)}`),

  // Webhook events
  webhookEvents: (cursor?: string | null, limit = 50) => {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (cursor) {
      qs.set("cursor", cursor);
    }
    return request<WebhookEventPage>(`/api/webhook-events?${qs}`);
  },
  workspaceFile: (sessionId: string, path: string) =>
    request<{ entry: WorkspaceEntry; content: string }>(
      `/api/environments/${encodeURIComponent(sessionId)}/workspace/file?path=${encodeURIComponent(path)}`
    ),
  workspaceInfo: (sessionId: string) =>
    request<{
      fileCount: number;
      directoryCount: number;
      totalBytes: number;
      r2FileCount: number;
    }>(`/api/environments/${encodeURIComponent(sessionId)}/workspace/info`),

  // Workspace browser (Isolate Sandbox only). MicroVM sessions return 409.
  workspaceList: (sessionId: string, path = "/") =>
    request<{ path: string; entries: WorkspaceEntry[] }>(
      `/api/environments/${encodeURIComponent(sessionId)}/workspace?path=${encodeURIComponent(path)}`
    ),
};

export interface IdiomReviewItem {
  assetId: string;
  blind: boolean;
  escalationId: string;
  machineSuggestions: unknown;
  phase: "speaker_review" | "fluent_review" | "adjudication";
  seed: {
    expression_span?: { text?: string; start_ms?: number; end_ms?: number };
    context?: string;
    transcript?: string;
  } | null;
  sourceGroupId: string;
  taskId: string;
  transcript: string;
}

export const idiomApi = {
  queue: (reviewerToken: string) =>
    request<{ items: IdiomReviewItem[] }>("/api/izwa/idioms/review-queue", {
      headers: { authorization: `Bearer ${reviewerToken}` },
    }),
  submit: (reviewerToken: string, taskId: string, body: unknown) =>
    request<{
      status: string;
      recordId?: string;
      missing?: string[];
      conflicts?: string[];
    }>(`/api/izwa/idioms/tasks/${encodeURIComponent(taskId)}/reviews`, {
      body: JSON.stringify(body),
      headers: {
        authorization: `Bearer ${reviewerToken}`,
        "content-type": "application/json",
      },
      method: "POST",
    }),
};

export interface AnthropicAgent {
  // Local addition — populated by /api/agents and /api/agents/:id from the
  // agent_backends D1 table. Defaults to "microvm" when no row is present.
  backend?: AgentBackend;
  id: string;
  // The managed-agents beta started returning `model` as an object
  // (`{id, speed}`) where it used to be a plain string. We keep the
  // union so older fixtures and any future fallback still type-check,
  // but `modelId()` in utils.ts should be used at every render site.
  model: string | { id: string; speed?: string };
  name: string;
  system?: string;
  tools?: Array<{
    type?: string;
    name?: string;
    // The agent_toolset_20260401 wrapper carries a `default_config` plus a
    // per-tool `configs` array. We read both so we can faithfully
    // round-trip server-side tool toggles (web_fetch / web_search) which
    // default-on inside the toolset but are opt-in at the form level.
    default_config?: {
      enabled?: boolean;
      permission_policy?: { type?: string };
    };
    configs?: Array<{ name: string; enabled?: boolean }>;
    // mcp_toolset blocks reference an MCP server by name; the form uses
    // this to detect the cf_* MCP toolset and reflect the user's per-tool
    // selection.
    mcp_server_name?: string;
  }>;
  version: string;
}

export interface AnthropicSession {
  // Anthropic returns the resolved agent under a nested `agent` object
  // (snapshot at session-creation time). The frontend reads `agent.id`
  // when linking from a session back to its agent.
  agent?: {
    id: string;
    name?: string;
    version?: number;
  };
  // Surfaced by the worker — joined from the local sessions table on the
  // way out. Falls back to "microvm" when no cached backend is known yet.
  backend?: AgentBackend;
  created_at?: string;
  id: string;
  status: string;
  title?: string;
  updated_at?: string;
}

// Tool-use / tool-result blocks can appear either as the event's own
// `type` (older shape: ev.type = "tool_use", ev.name = "write") or
// nested inside `ev.content[]` (newer agent-event shape:
// ev.type = "agent.message_added", ev.content = [{ type: "tool_use",
// name: "write", input: {...} }]). We type both so the renderer can
// surface the tool name regardless of where it lives.
export interface AnthropicEvent {
  content?: Array<{
    type: string;
    text?: string;
    name?: string;
    input?: unknown;
    tool_use_id?: string;
    is_error?: boolean;
    content?: unknown;
  }>;
  created_at?: string;
  error?: { message?: string };
  input?: unknown;
  name?: string;
  type: string;
}
