import { Router, type IRouter, type Request } from "express";
import rateLimit from "express-rate-limit";
import { sql } from "drizzle-orm";
import { db, pool } from "@workspace/db";
import { authMiddleware, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";
import { PgRateLimitStore } from "../lib/rateLimitStore";

// T12: DSAR ("Data Subject Access Request") endpoint. A logged-in user can
// export every row that references them, across all relevant tables, as a
// single JSON document. Rate-limited to 3 calls per hour per userId via the
// T07 Postgres-backed store (so the limit survives restarts and is shared
// across replicas). The user row excludes `password_hash` and `pin_hash`.
const router: IRouter = Router();

const dsarLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many data export requests. Please try again later." },
  store: new PgRateLimitStore("dsar"),
  // Per-userId key (NOT per-IP) — auth middleware has already populated req.user.
  keyGenerator: (req: Request) => {
    const u = (req as any).user as JwtPayload | undefined;
    return u?.userId ?? "anon";
  },
});

// Helpers that run a raw parameterised SELECT and return plain rows.
async function rows(q: string, params: unknown[]): Promise<any[]> {
  try {
    const r = await pool.query(q, params as any);
    return r.rows;
  } catch {
    // A table may not exist in some environments; degrade gracefully.
    return [];
  }
}

router.get("/me/data-export", authMiddleware, dsarLimiter, async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const uid = user.userId;

  // Single user row — strip the two credential columns. Drizzle would return
  // an object missing nothing, so we explicitly enumerate via SQL.
  const userRow = await rows(
    `SELECT id, school_id, role, first_name, last_name, email, year_group, class_name,
            avatar_type, avatar_value, active, last_login, created_at,
            failed_login_attempts, locked_until
       FROM users WHERE id = $1`,
    [uid],
  );

  const sections: Record<string, any[]> = {
    users: userRow,
    incidents: await rows(
      `SELECT * FROM incidents
         WHERE reporter_id = $1
            OR assessed_by = $1
            OR $1 = ANY(victim_ids)
            OR $1 = ANY(perpetrator_ids)
            OR $1 = ANY(witness_ids)`,
      [uid],
    ),
    messages: await rows(
      `SELECT * FROM messages WHERE sender_id = $1 OR recipient_id = $1`,
      [uid],
    ),
    notifications: await rows(
      `SELECT * FROM notifications WHERE recipient_id = $1`,
      [uid],
    ),
    behaviour_points: await rows(
      `SELECT * FROM behaviour_points WHERE pupil_id = $1 OR issued_by = $1`,
      [uid],
    ),
    pupil_diary: await rows(
      `SELECT * FROM pupil_diary WHERE pupil_id = $1`,
      [uid],
    ),
    teacher_posts: await rows(
      `SELECT * FROM teacher_posts WHERE author_id = $1`,
      [uid],
    ),
    case_tasks: await rows(
      `SELECT * FROM case_tasks WHERE assignee_id = $1 OR completed_by = $1`,
      [uid],
    ),
    interviews: await rows(
      `SELECT * FROM interviews WHERE interviewee_id = $1 OR conducted_by = $1`,
      [uid],
    ),
    pattern_alerts: await rows(
      `SELECT * FROM pattern_alerts WHERE victim_id = $1 OR reviewed_by = $1`,
      [uid],
    ),
    protocols: await rows(
      `SELECT * FROM protocols WHERE opened_by = $1 OR victim_id = $1`,
      [uid],
    ),
    senco_caseload: await rows(
      `SELECT * FROM senco_caseload WHERE senco_id = $1 OR pupil_id = $1`,
      [uid],
    ),
    training_completions: await rows(
      `SELECT * FROM training_completions WHERE user_id = $1`,
      [uid],
    ),
    disclosure_permissions: await rows(
      `SELECT * FROM disclosure_permissions
         WHERE subject_pupil_id = $1
            OR requested_by_id = $1
            OR requested_from_parent_id = $1
            OR responded_by_id = $1`,
      [uid],
    ),
    delegated_roles: await rows(
      `SELECT * FROM delegated_roles WHERE user_id = $1`,
      [uid],
    ),
    pta_messages: await rows(
      `SELECT * FROM pta_messages WHERE sender_id = $1`,
      [uid],
    ),
    pta_policy_acks: await rows(
      `SELECT * FROM pta_policy_acks WHERE user_id = $1`,
      [uid],
    ),
  };

  const payload = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    user_id: uid,
    sections,
  };
  const json = JSON.stringify(payload);

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "data_export_requested",
    actor: user,
    targetType: "user",
    targetId: uid,
    details: { byte_size: Buffer.byteLength(json, "utf8") },
    req,
  }).catch(() => {});

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="data-export-${uid}.json"`);
  res.send(json);
});

// Silence unused-import warnings for the typed `sql` and `db` (kept available
// for future Drizzle-typed migrations of this route).
void sql;
void db;

export default router;
