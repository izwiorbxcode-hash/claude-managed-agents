const JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone";

type StructuredValue = string | unknown[] | Record<string, unknown>;

export type JevQuestion =
  | {
      criteria?: { false?: StructuredValue; true?: StructuredValue };
      instructions: StructuredValue;
      type: "noul";
    }
  | {
      criteria: Record<string, StructuredValue | null>;
      instructions: StructuredValue;
      type: "choice";
    };

export interface JevRequest {
  model: string;
  questions: Record<string, JevQuestion>;
  state: StructuredValue;
}

export type JevAnswer =
  | { noul: number; type: "noul" }
  | {
      choice: string;
      confidence: number;
      probabilities: Record<string, number>;
      type: "choice";
    };

export interface JevResponse {
  answers: Record<string, JevAnswer>;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

export class JevRequestError extends Error {
  readonly retryable: boolean;
  readonly status: number | undefined;

  constructor(
    message: string,
    options: { cause?: unknown; retryable: boolean; status?: number }
  ) {
    super(message, { cause: options.cause });
    this.name = "JevRequestError";
    this.retryable = options.retryable;
    this.status = options.status;
  }
}

function isJevResponse(value: unknown): value is JevResponse {
  if (!(value && typeof value === "object")) {
    return false;
  }
  const candidate = value as Partial<JevResponse>;
  return (
    typeof candidate.model === "string" &&
    !!candidate.answers &&
    typeof candidate.answers === "object" &&
    !!candidate.usage &&
    typeof candidate.usage.input_tokens === "number" &&
    typeof candidate.usage.output_tokens === "number"
  );
}

export async function evaluateWithJev(options: {
  apiKey: string;
  request: JevRequest;
  timeoutMs?: number;
}): Promise<JevResponse> {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(JEV_ENDPOINT, {
      body: JSON.stringify(options.request),
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 1000);
      throw new JevRequestError(
        `Jev returned ${response.status}${detail ? `: ${detail}` : ""}`,
        {
          retryable: response.status === 429 || response.status >= 500,
          status: response.status,
        }
      );
    }
    const result: unknown = await response.json();
    if (!isJevResponse(result)) {
      throw new JevRequestError("Jev returned an invalid response shape", {
        retryable: false,
      });
    }
    return result;
  } catch (error) {
    if (error instanceof JevRequestError) {
      throw error;
    }
    const timedOut =
      error instanceof DOMException && error.name === "AbortError";
    throw new JevRequestError(
      timedOut ? "Jev request timed out" : "Jev request failed",
      {
        cause: error,
        retryable: true,
      }
    );
  } finally {
    clearTimeout(timeout);
  }
}
