// Dataset export — the monetization layer. Crystallized records are
// materialized from D1 into a machine-readable JSONL dataset on R2 (the
// parquet writer is a follow-up), each row carrying the full data-contract
// surface: payload, quality signal, verification lineage, and model
// versions. A manifest records what was exported, when, and by which
// contract so customers can audit provenance.

import { newId } from "./ids";
import { LANGUAGE_CONTRACT } from "./contracts";
import {
  getAsset,
  getLineage,
  getTask,
  listRecords,
  markRecordsExported,
  type RecordRow,
} from "./store";

export interface ExportResult {
  exportId: string;
  format: string;
  jsonlKey: string;
  manifestKey: string;
  recordCount: number;
}

const JSONL_PREFIX = "exports";

function exportRow(record: RecordRow, payload: Record<string, unknown>, quality: { overall?: number }, assetR2Key: string | null, lineageCount: number): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const field of LANGUAGE_CONTRACT.export.fields) {
    switch (field) {
      case "record_id":
        row[field] = record.recordId;
        break;
      case "source_id":
        row[field] = record.taskId;
        break;
      case "audio_reference":
        row[field] = assetR2Key;
        break;
      case "transcription":
        row[field] = payload.transcription ?? null;
        break;
      case "language":
        row[field] = payload.language ?? null;
        break;
      case "dialect":
        row[field] = payload.dialect ?? null;
        break;
      case "phonetic_annotation":
        row[field] = payload.phonemes ?? null;
        break;
      case "semantic_alignment":
        row[field] = payload.english_alignment ?? null;
        break;
      case "quality_score":
        row[field] = quality.overall ?? null;
        break;
      case "verification_status":
        row[field] = record.verificationStatus;
        break;
      case "verified_by":
        row[field] = record.verifiedBy;
        break;
      case "model_versions":
        row[field] = safeJson(record.modelVersionsJson);
        break;
      case "schema_version":
        row[field] = record.schemaVersion;
        break;
      case "provenance":
        row[field] = { lineageEvents: lineageCount, taskId: record.taskId, contractId: record.contractId };
        break;
    }
  }
  return row;
}

export async function exportDataset(
  env: Env,
  opts: { tenant?: string; limit?: number } = {},
): Promise<ExportResult> {
  const tenant = opts.tenant ?? "default";
  const limit = Math.min(500, opts.limit ?? 200);
  const records = await listRecords(env.DB, { tenant, limit });

  const rows = await Promise.all(
    records.map(async (record) => {
      const payload = safeJson(record.payloadJson) as Record<string, unknown>;
      const quality = (safeJson(record.qualityJson) as { overall?: number }) ?? {};
      const task = record.taskId ? await getTask(env.DB, record.taskId).catch(() => null) : null;
      const asset = task ? await getAsset(env.DB, task.assetId).catch(() => null) : null;
      const lineage = await getLineage(env.DB, record.taskId);
      return exportRow(record, payload, quality, asset?.r2Key ?? null, lineage.length);
    }),
  );

  const exportId = newId("record_").replace("record_", "export_");
  const jsonl = rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");
  const jsonlKey = `${JSONL_PREFIX}/${exportId}.jsonl`;
  const manifestKey = `${JSONL_PREFIX}/${exportId}.manifest.json`;

  const manifest = {
    exportId,
    format: "jsonl",
    contract: { id: LANGUAGE_CONTRACT.contractId, version: LANGUAGE_CONTRACT.version },
    tenant,
    recordCount: rows.length,
    fields: LANGUAGE_CONTRACT.export.fields,
    createdAtMs: Date.now(),
  };

  await env.IZWA_ASSETS.put(jsonlKey, jsonl, { httpMetadata: { contentType: "application/x-ndjson" } });
  await env.IZWA_ASSETS.put(manifestKey, JSON.stringify(manifest, null, 2), { httpMetadata: { contentType: "application/json" } });

  if (rows.length > 0) {
    await markRecordsExported(env.DB, records.map((r) => r.recordId));
  }

  return {
    exportId,
    format: "jsonl",
    jsonlKey,
    manifestKey,
    recordCount: rows.length,
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
