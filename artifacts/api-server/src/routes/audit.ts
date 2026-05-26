import { Router, type IRouter } from "express";
import { db, auditLogTable } from "@workspace/db";
import { eq, and, or, lt, lte, gte, desc } from "drizzle-orm";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { RETENTION_DAYS, type RetentionCategory } from "../lib/retentionPolicies";

// T13 follow-up: a deployment that has silently stopped running the
// retention sweep (bad deploy, JOBS_ENABLED=false, crashed scheduler)
// is a data-protection problem we cannot afford to discover from a
// regulator. 36h gives a 24h job a full cycle of slack before we shout.
const RETENTION_STALE_MS = 36 * 60 * 60 * 1000;

const router: IRouter = Router();

const AUDIT_EVENT_TYPES = [
  "pupil_login", "staff_login", "parent_login", "profile_updated",
  "demo_login", "incident_created", "incident_status_updated",
  "incident_assessed", "disclosure_requested", "disclosure_responded",
  "disclosure_acknowledged", "protocol_created", "protocol_updated",
  "alert_reviewed", "behaviour_points_issued", "message_sent",
  "notification_acknowledged", "notification_broadcast",
  "pin_reset", "bulk_pin_reset", "senco_caseload_added",
  "senco_caseload_removed", "senco_tracking_recorded",
  "case_task_created", "case_task_updated",
  "delegated_role_created", "delegated_role_revoked",
  "referral_body_created", "referral_body_updated",
  "annex_template_created", "diary_scan_skipped",
  "diary_entry_created", "diary_entry_deleted",
  "training_module_completed", "incident_exported",
  "protocol_exported", "pta_message_sent", "pta_concern_submitted",
  "pta_policy_acknowledged", "pta_policy_flagged", "pta_report_generated",
  "pta_report_approved", "pta_codesign_response", "parent_pta_message_sent",
  "email_send_failed",
  "pupil_login_session_started",
  "password_reset_requested",
  "password_reset_completed",
  "mfa_setup_started",
  "mfa_enabled",
  "mfa_disabled",
  "mfa_challenge_succeeded",
  "mfa_challenge_failed",
  "mfa_reset_requested",
  "mfa_reset_cancelled",
  "mfa_reset_by_admin",
  "data_export_requested",
  "retention_sweep_completed",
];

router.get(
  "/audit/event-types",
  authMiddleware,
  requireRole("coordinator", "head_teacher"),
  (_req, res): void => {
    res.json({ eventTypes: AUDIT_EVENT_TYPES });
  }
);

router.get(
  "/audit",
  authMiddleware,
  requireRole("coordinator", "head_teacher"),
  async (req, res): Promise<void> => {
    const user = (req as any).user as JwtPayload;

    const eventType = req.query.eventType as string | undefined;
    const actorRole = req.query.actorRole as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const cursor = req.query.cursor as string | undefined;
    const rawLimit = Math.trunc(Number(req.query.limit ?? 50));
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 200);

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const conditions = [eq(auditLogTable.schoolId, user.schoolId)];
    if (eventType) conditions.push(eq(auditLogTable.eventType, eventType));
    if (actorRole) conditions.push(eq(auditLogTable.actorRole, actorRole));
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) conditions.push(gte(auditLogTable.createdAt, fromDate));
    }
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) conditions.push(lte(auditLogTable.createdAt, toDate));
    }

    if (cursor) {
      let decoded: { createdAt?: unknown; id?: unknown };
      try {
        decoded = JSON.parse(Buffer.from(cursor, "base64").toString());
      } catch {
        res.status(400).json({ error: "Invalid cursor" });
        return;
      }
      const cursorDate = new Date(decoded.createdAt as string);
      if (
        isNaN(cursorDate.getTime()) ||
        typeof decoded.id !== "string" ||
        !UUID_RE.test(decoded.id)
      ) {
        res.status(400).json({ error: "Invalid cursor" });
        return;
      }
      const cond = or(
        lt(auditLogTable.createdAt, cursorDate),
        and(eq(auditLogTable.createdAt, cursorDate), lt(auditLogTable.id, decoded.id))
      );
      if (cond) conditions.push(cond);
    }

    const rows = await db
      .select()
      .from(auditLogTable)
      .where(and(...conditions))
      .orderBy(desc(auditLogTable.createdAt), desc(auditLogTable.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    const last = data[data.length - 1];
    const nextCursor =
      hasMore && last
        ? Buffer.from(
            JSON.stringify({ createdAt: last.createdAt, id: last.id })
          ).toString("base64")
        : null;

    res.json({ data, nextCursor, hasMore });
  }
);

// T13 follow-up: dedicated shortcut for the admin "is the retention sweep
// still running?" widget. We return one entry per known category (even if
// it has never run) so the UI can render a complete checklist instead of
// silently omitting a missing category.
//
// The audit row is anchored to the oldest school in the DB (see
// jobs/retentionSweep.ts), so we deliberately do NOT filter by
// req.user.schoolId — retention is a system-wide event and every
// coordinator should see the same status.
router.get(
  "/audit/retention-status",
  authMiddleware,
  requireRole("coordinator", "head_teacher"),
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        id: auditLogTable.id,
        createdAt: auditLogTable.createdAt,
        details: auditLogTable.details,
      })
      .from(auditLogTable)
      .where(eq(auditLogTable.eventType, "retention_sweep_completed"))
      .orderBy(desc(auditLogTable.createdAt))
      .limit(500);

    const latestByCategory = new Map<
      string,
      { id: string; createdAt: Date; deletedCount: number; thresholdAt: string | null }
    >();
    for (const row of rows) {
      const details = (row.details ?? {}) as {
        category?: string;
        deleted_count?: number;
        threshold_at?: string;
      };
      const cat = details.category;
      if (!cat || latestByCategory.has(cat)) continue;
      latestByCategory.set(cat, {
        id: row.id,
        createdAt: row.createdAt,
        deletedCount: Number(details.deleted_count ?? 0),
        thresholdAt: details.threshold_at ?? null,
      });
    }

    const now = Date.now();
    const categories = (Object.keys(RETENTION_DAYS) as RetentionCategory[]).map((cat) => {
      const latest = latestByCategory.get(cat);
      if (!latest) {
        return {
          category: cat,
          retentionDays: RETENTION_DAYS[cat],
          lastRunAt: null,
          lastRunId: null,
          deletedCount: null,
          thresholdAt: null,
          ageMs: null,
          stale: true,
        };
      }
      const ageMs = now - latest.createdAt.getTime();
      return {
        category: cat,
        retentionDays: RETENTION_DAYS[cat],
        lastRunAt: latest.createdAt.toISOString(),
        lastRunId: latest.id,
        deletedCount: latest.deletedCount,
        thresholdAt: latest.thresholdAt,
        ageMs,
        stale: ageMs > RETENTION_STALE_MS,
      };
    });

    const anyStale = categories.some((c) => c.stale);
    res.json({
      staleThresholdMs: RETENTION_STALE_MS,
      anyStale,
      categories,
      generatedAt: new Date().toISOString(),
    });
  }
);

export default router;
