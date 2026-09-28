// @izwa/annotation — human-in-the-loop annotation domain.
// Humans are part of the learning architecture (vision doc §11).

export type AnnotationStatus = "open" | "claimed" | "resolved" | "rejected";

export interface AnnotationTask {
  id: string;
  dataUnitId: string;
  kind: string; // transcription | translation | ner | morphology | ...
  status: AnnotationStatus;
  payloadJson: string;
  expertId?: string;
  createdAtMs: number;
}

export interface AnnotationReview {
  id: string;
  taskId: string;
  reviewerId: string;
  verdict: "correct" | "incorrect" | "alternative";
  correctionJson?: string;
  createdAtMs: number;
}
