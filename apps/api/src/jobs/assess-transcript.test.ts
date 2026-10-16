import { describe, expect, it } from "vitest";
import { buildTranscriptAssessmentRequest } from "./assess-transcript.js";

describe("transcript assessment rubric", () => {
  it("sends only the bounded transcript context and includes uncertainty", () => {
    const request = buildTranscriptAssessmentRequest(
      {
        context_after: "following line",
        context_before: "preceding line",
        current_revision_id: "revision_1",
        machine_transcript: "bounded passage",
        passage_id: "passage_1",
        passage_revision_id: "revision_1",
      },
      "jev-1.13.0"
    );

    expect(request.model).toBe("jev-1.13.0");
    expect(request.state).toEqual({
      context_after: "following line",
      context_before: "preceding line",
      transcript: "bounded passage",
    });
    expect(request.questions.annotation_category).toMatchObject({
      criteria: { insufficient_context: expect.any(String) },
      type: "choice",
    });
  });
});
