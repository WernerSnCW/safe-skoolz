import { db, auditLogTable } from "@workspace/db";
import type { JwtPayload } from "./auth";

export async function writeAudit(opts: {
  schoolId: string;
  eventType: string;
  actor?: JwtPayload;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  req?: { ip?: string; headers?: Record<string, any> };
}) {
  await db.insert(auditLogTable).values({
    schoolId: opts.schoolId,
    eventType: opts.eventType,
    actorRole: opts.actor?.role,
    actorId: opts.actor?.userId,
    targetType: opts.targetType,
    targetId: opts.targetId,
    details: opts.details || {},
    ipAddress: opts.req?.ip || null,
    userAgent: opts.req?.headers?.["user-agent"] || null,
  });
}
