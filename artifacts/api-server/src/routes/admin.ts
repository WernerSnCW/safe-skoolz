import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, protocolsTable } from "@workspace/db";
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

const router: IRouter = Router();

router.get(
  "/admin/overview",
  authMiddleware,
  requireRole(...ADMIN_ALLOWED_ROLES),
  async (req, res): Promise<void> => {
    const user = (req as any).user as JwtPayload;

    const rawRows = await db
      .select({
        status: protocolsTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(protocolsTable)
      .where(eq(protocolsTable.schoolId, user.schoolId))
      .groupBy(protocolsTable.status);

    const summary = aggregateProtocolCounts(rawRows as ProtocolStatusRow[]);

    res.json({ protocols: summary });
  }
);

export default router;
