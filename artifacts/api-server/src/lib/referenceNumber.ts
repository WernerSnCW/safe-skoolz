import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function generateIncidentRef(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db.execute(sql`SELECT COUNT(*) as count FROM incidents WHERE EXTRACT(YEAR FROM created_at) = ${year}`);
  const count = Number((result.rows[0] as any)?.count || 0) + 1;
  return `SS-${year}-${String(count).padStart(4, "0")}`;
}

export async function generateProtocolRef(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db.execute(sql`SELECT COUNT(*) as count FROM protocols WHERE EXTRACT(YEAR FROM opened_at) = ${year}`);
  const count = Number((result.rows[0] as any)?.count || 0) + 1;
  return `PROT-${year}-${String(count).padStart(3, "0")}`;
}
