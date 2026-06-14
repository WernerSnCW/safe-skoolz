import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, schoolsTable } from "@workspace/db";
import { tenantPublicView } from "../lib/tenant";

const router: IRouter = Router();

// Public tenant config for the unified shell (spec §4.1). No auth; no internal ids.
router.get("/tenant/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug).toLowerCase();
  const [school] = await db.select().from(schoolsTable)
    .where(and(eq(schoolsTable.slug, slug), eq(schoolsTable.active, true)));
  if (!school) { res.status(404).json({ error: "Tenant not found" }); return; }
  res.json(tenantPublicView(school));
});

export default router;
