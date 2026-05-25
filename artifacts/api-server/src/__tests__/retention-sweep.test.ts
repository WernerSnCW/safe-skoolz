import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { pool } from "@workspace/db";
import { runRetentionSweepOnce } from "../jobs/retentionSweep";

// T13 acceptance — single test: insert a pupil_diary row backdated 400 days
// (>365 = pupil_diary retention window), invoke the sweep once, assert the
// row is gone and that at least one `retention_sweep_completed` audit row
// was written with deleted_count >= 1.

let schoolId: string;
let pupilId: string;
let oldRowId: string;
let freshRowId: string;

beforeAll(async () => {
  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name) VALUES ('T13 Test School') RETURNING id`,
  );
  schoolId = sch.rows[0].id;

  const pupil = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active)
     VALUES ($1, 'pupil', 'T13', 'Pupil', $2, true) RETURNING id`,
    [schoolId, `t13-${Date.now()}@example.com`],
  );
  pupilId = pupil.rows[0].id;

  // Backdated diary entry — 400 days old, must be deleted by the sweep.
  const old = await pool.query<{ id: string }>(
    `INSERT INTO pupil_diary (pupil_id, school_id, mood, note, created_at)
     VALUES ($1, $2, 3, 'old diary', NOW() - INTERVAL '400 days') RETURNING id`,
    [pupilId, schoolId],
  );
  oldRowId = old.rows[0].id;

  // Fresh diary entry — 10 days old, must SURVIVE the sweep.
  const fresh = await pool.query<{ id: string }>(
    `INSERT INTO pupil_diary (pupil_id, school_id, mood, note, created_at)
     VALUES ($1, $2, 4, 'fresh diary', NOW() - INTERVAL '10 days') RETURNING id`,
    [pupilId, schoolId],
  );
  freshRowId = fresh.rows[0].id;
});

afterAll(async () => {
  await pool.query(`DELETE FROM pupil_diary WHERE pupil_id = $1`, [pupilId]);
});

describe("T13 — retention sweep", () => {
  it("deletes pupil_diary rows older than 365d, leaves fresh rows alone, and writes a retention_sweep_completed audit row", async () => {
    const result = await runRetentionSweepOnce();
    expect(result.acquired).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.results).toBeDefined();

    // Old row gone.
    const oldRow = await pool.query(
      `SELECT id FROM pupil_diary WHERE id = $1`,
      [oldRowId],
    );
    expect(oldRow.rowCount).toBe(0);

    // Fresh row preserved.
    const freshRow = await pool.query(
      `SELECT id FROM pupil_diary WHERE id = $1`,
      [freshRowId],
    );
    expect(freshRow.rowCount).toBe(1);

    // Audit row exists for pupil_diary with deleted_count >= 1. Filter by
    // category in JSON to avoid coupling to other test data.
    const audit = await pool.query<{ deleted_count: number }>(
      `SELECT (details->>'deleted_count')::int AS deleted_count
         FROM audit_log
        WHERE event_type = 'retention_sweep_completed'
          AND details->>'category' = 'pupil_diary'
        ORDER BY created_at DESC
        LIMIT 1`,
    );
    expect(audit.rowCount).toBe(1);
    expect(audit.rows[0].deleted_count).toBeGreaterThanOrEqual(1);
  });
});
