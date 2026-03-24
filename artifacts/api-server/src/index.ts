import app from "./app";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { runScheduledPatternScan } from "./lib/patternDetection";
import { seedDemoData } from "./lib/seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function ensureAuditLogImmutability() {
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION prevent_audit_log_modify()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'audit_log is append-only: UPDATE and DELETE operations are not permitted';
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
    CREATE TRIGGER audit_log_no_update
      BEFORE UPDATE OR DELETE ON audit_log
      FOR EACH ROW
      EXECUTE FUNCTION prevent_audit_log_modify();
  `);
  console.log("[db] Audit log immutability trigger applied");
}

async function startup() {
  await ensureAuditLogImmutability().catch((err) => {
    console.error("[db] Failed to apply audit log trigger:", err);
  });

  await seedDemoData().catch((err) => {
    console.error("[seed] Failed to seed demo data:", err);
  });
}

startup();

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

const PATTERN_SCAN_INTERVAL_MS = 60 * 60 * 1000;
setInterval(() => {
  runScheduledPatternScan().catch((err) => {
    console.error("[cron] Scheduled pattern scan failed:", err);
  });
}, PATTERN_SCAN_INTERVAL_MS);
console.log(`[cron] Pattern detection scan scheduled every ${PATTERN_SCAN_INTERVAL_MS / 60000} minutes`);
