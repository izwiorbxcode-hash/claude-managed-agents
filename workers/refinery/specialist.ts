// SpecialistAgent — one DO per bounded specialist capability. Each agent
// has a stable identity (`<vertical>:<role>`), persists its own episodic
// memory of past decisions in its private SQLite storage, and runs one
// probabilistic analysis per task. Agents are workers, not the source of
// truth: they propose; the deterministic quality engine disposes.

import { DurableObject } from "cloudflare:workers";
import { runSpecialist } from "./models";
import type { Proposal, SpecialistAssignment } from "./types";

interface SpecialistHistoryRow {
  proposal_id: string;
  task_id: string;
  confidence: number;
  created_at_ms: number;
}

export class SpecialistAgent extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS specialist_history (
        proposal_id   TEXT PRIMARY KEY,
        task_id       TEXT NOT NULL,
        role          TEXT NOT NULL,
        confidence    REAL,
        payload_json  TEXT NOT NULL,
        created_at_ms INTEGER NOT NULL
      )`,
    );
  }

  // Run one bounded analysis. The input is pre-scoped by the coordinator
  // (task text + the contract fields this seat is responsible for), so the
  // agent cannot silently invent missing evidence — the prompt instructs
  // it to report gaps in the uncertainty list instead.
  async analyze(
    assignment: SpecialistAssignment,
    input: { taskId: string; text: string; contractFields: string[] },
  ): Promise<Proposal> {
    const proposal = await runSpecialist(this.env, assignment, input);
    this.ctx.storage.sql
      .exec(
        `INSERT INTO specialist_history (proposal_id, task_id, role, confidence, payload_json, created_at_ms)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
        proposal.proposalId,
        proposal.taskId,
        proposal.specialistRole,
        proposal.confidence,
        JSON.stringify(proposal.payload),
        Date.now(),
      )
      .raw();
    return proposal;
  }

  // Episodic memory of this specialist's decisions. Used by the dashboard
  // and, eventually, by the evaluator-performance signal.
  async history(limit = 20): Promise<SpecialistHistoryRow[]> {
    const rows = this.ctx.storage.sql
      .exec(
        `SELECT proposal_id, task_id, confidence, created_at_ms
         FROM specialist_history ORDER BY created_at_ms DESC LIMIT ?`,
        limit,
      )
      .toArray() as unknown as SpecialistHistoryRow[];
    return rows;
  }
}
