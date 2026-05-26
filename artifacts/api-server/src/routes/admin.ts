import { Router, type IRouter } from "express";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import {
  db,
  protocolsTable,
  annexTemplatesTable,
  delegatedRolesTable,
} from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";

export const ADMIN_ALLOWED_ROLES = ["coordinator"] as const;

export interface ProtocolStatusRow {
  status: string;
  count: number;
}

export interface ProtocolCountsSummary {
  total: number;
  by_status: Record<string, number>;
}

export function aggregateProtocolCounts(rows: ProtocolStatusRow[]): ProtocolCountsSummary {
  const by_status: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    const count = Number(row.count) || 0;
    by_status[row.status] = count;
    total += count;
  }
  return { total, by_status };
}

export interface FrameworkCountRow {
  framework: string;
  count: number;
}

export interface AnnexTemplatesSummary {
  by_framework: Record<string, number>;
}

export function aggregateFrameworkCounts(rows: FrameworkCountRow[]): AnnexTemplatesSummary {
  const by_framework: Record<string, number> = {};
  for (const row of rows) {
    by_framework[row.framework] = Number(row.count) || 0;
  }
  return { by_framework };
}

export interface DelegatedRoleCountRow {
  role_type: string;
  count: number;
}

export interface DelegatedRolesSummary {
  by_role_type: Record<string, number>;
}

export function aggregateDelegatedRoleCounts(rows: DelegatedRoleCountRow[]): DelegatedRolesSummary {
  const by_role_type: Record<string, number> = {};
  for (const row of rows) {
    by_role_type[row.role_type] = Number(row.count) || 0;
  }
  return { by_role_type };
}

const router: IRouter = Router();

router.get(
  "/admin/overview",
  authMiddleware,
  requireRole(...ADMIN_ALLOWED_ROLES),
  async (req, res): Promise<void> => {
    const user = (req as any).user as JwtPayload;

    const [protocolRows, frameworkRows, delegatedRoleRows] = await Promise.all([
      db
        .select({
          status: protocolsTable.status,
          count: sql<number>`count(*)::int`,
        })
        .from(protocolsTable)
        .where(eq(protocolsTable.schoolId, user.schoolId))
        .groupBy(protocolsTable.status),
      db
        .select({
          framework: annexTemplatesTable.framework,
          count: sql<number>`count(*)::int`,
        })
        .from(annexTemplatesTable)
        .groupBy(annexTemplatesTable.framework),
      db
        .select({
          role_type: delegatedRolesTable.roleType,
          count: sql<number>`count(*)::int`,
        })
        .from(delegatedRolesTable)
        .where(
          and(
            eq(delegatedRolesTable.schoolId, user.schoolId),
            isNull(delegatedRolesTable.revokedAt),
            or(
              isNull(delegatedRolesTable.expiresAt),
              gt(delegatedRolesTable.expiresAt, sql`now()`)
            )
          )
        )
        .groupBy(delegatedRolesTable.roleType),
    ]);

    res.json({
      protocols: aggregateProtocolCounts(protocolRows as ProtocolStatusRow[]),
      annex_templates: aggregateFrameworkCounts(frameworkRows as FrameworkCountRow[]),
      delegated_roles: aggregateDelegatedRoleCounts(delegatedRoleRows as DelegatedRoleCountRow[]),
    });
  }
);

export default router;
