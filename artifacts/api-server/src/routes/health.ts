import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// DB liveness probe with a hard 1s ceiling so a wedged Postgres does not stall the
// load balancer's health check. /readyz deferred per T05 OUT OF SCOPE; this single
// endpoint covers liveness + dependency-state today.
async function pingDb(): Promise<"ok" | "down"> {
  const timeout = new Promise<"down">((resolve) =>
    setTimeout(() => resolve("down"), 1000),
  );
  const probe = pool
    .query("SELECT 1")
    .then((): "ok" => "ok")
    .catch((): "down" => "down");
  return Promise.race([probe, timeout]);
}

router.get("/healthz", async (_req, res) => {
  const db = await pingDb();
  const status = db === "ok" ? "ok" : "degraded";
  res.status(db === "ok" ? 200 : 503).json({ status, checks: { db } });
});

export default router;
