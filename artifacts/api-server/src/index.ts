import app from "./app";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { startPatternScanScheduler } from "./jobs/patternScan";
import { startRetentionSweepScheduler } from "./jobs/retentionSweep";
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

  // Always attempt to seed — seedDemoData() is idempotent and skips when the
  // database already has data, so it's safe to run on every startup.
  await seedDemoData().catch((err) => {
    console.error("[seed] Failed to seed demo data:", err);
  });
}

startup();

// T06 — fail loudly in production if Resend isn't configured. In dev we warn and
// continue so the developer experience stays unblocked when RESEND_API_KEY is absent.
// The audit table is reachable by the time emailHelper makes its first call (startup
// has already run), so the one-shot missing_api_key audit row written in emailHelper
// will land successfully.
if (!process.env.RESEND_API_KEY) {
  if (process.env.NODE_ENV === "production") {
    console.error("[boot] FATAL: RESEND_API_KEY is required in production");
    process.exit(1);
  } else {
    console.warn("[boot] RESEND_API_KEY not set; emails will be skipped (dev mode)");
  }
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

startPatternScanScheduler();
startRetentionSweepScheduler();
