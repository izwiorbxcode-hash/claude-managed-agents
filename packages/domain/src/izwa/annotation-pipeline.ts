export const TRANSCRIPT_ASSESSMENT_TASK = "transcript_assessment" as const;
export const TRANSCRIPT_ASSESSMENT_RUBRIC_VERSION = "transcript-routing-v1";

export type PassageProcessingState =
  | "uploaded"
  | "transcribing"
  | "ready"
  | "retry_required";

export type PassageAnnotationState =
  | "draft"
  | "submitted"
  | "correction_requested"
  | "complete";

export type PassageReviewState =
  | "unassigned"
  | "reviewing"
  | "disputed"
  | "accepted";

export type PassagePermissionState = "pending" | "sufficient" | "restricted";
export type PassagePaymentState =
  | "unaccrued"
  | "accrued"
  | "approved"
  | "paid"
  | "disputed";
export type PassageReleaseState =
  | "unassigned"
  | "candidate"
  | "released"
  | "superseded";

export interface TranscriptAssessmentMessage {
  jobKey: string;
  passageId: string;
  passageRevisionId: string;
  rubricVersion: typeof TRANSCRIPT_ASSESSMENT_RUBRIC_VERSION;
  task: typeof TRANSCRIPT_ASSESSMENT_TASK;
}

export function transcriptAssessmentJobKey(
  passageRevisionId: string,
  model: string,
  rubricVersion = TRANSCRIPT_ASSESSMENT_RUBRIC_VERSION
): string {
  return [
    TRANSCRIPT_ASSESSMENT_TASK,
    passageRevisionId,
    model,
    rubricVersion,
  ].join(":");
}
