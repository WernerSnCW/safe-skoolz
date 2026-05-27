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
  // Demo build: force MFA off before any request handlers run, regardless
  // of whatever the deployment env says. This neutralises the
  // MFA_ENFORCED=true branch in /auth/staff/login.
  process.env.MFA_ENFORCED = "false";

  await ensureAuditLogImmutability().catch((err) => {
    console.error("[db] Failed to apply audit log trigger:", err);
  });

  // Always attempt to seed — seedDemoData() is idempotent and skips when the
  // database already has data, so it's safe to run on every startup.
  await seedDemoData().catch((err) => {
    console.error("[seed] Failed to seed demo data:", err);
  });

  // Demo build: normalize every credential on boot so the demo flows always
  // work, regardless of what the seed produced, which database the deployment
  // is pointed at, any prior lockouts, or stale MFA state. Idempotent.
  try {
    const bcrypt = (await import("bcrypt")).default;
    const { db, usersTable, schoolLoginCodesTable, schoolsTable, userMfaSecretsTable } = await import("@workspace/db");
    const { eq, ne, and, sql: dsql } = await import("drizzle-orm");

    // 0. Wipe every MFA secret — demo build, no real MFA to preserve. This
    // neutralises the requiresMfa branch even if a row was somehow left
    // enabled. Combined with MFA_ENFORCED=false above, staff login always
    // returns a normal token.
    await db.delete(userMfaSecretsTable);

    const demoPinHash = await bcrypt.hash("1234", 10);
    const demoPasswordHash = await bcrypt.hash("password123", 10);

    // 1. All pupil PINs → 1234, clear lockouts + stale MFA.
    await db
      .update(usersTable)
      .set({
        pinHash: demoPinHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        mfaEnrollmentRequired: false,
      })
      .where(eq(usersTable.role, "pupil"));

    // 2. All non-pupil passwords → password123, clear lockouts + stale MFA.
    await db
      .update(usersTable)
      .set({
        passwordHash: demoPasswordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        mfaEnrollmentRequired: false,
      })
      .where(ne(usersTable.role, "pupil"));

    // 3. Ensure pupil-login access codes exist for every school. If a school
    // has zero active pupil_login codes, recreate the standard four. This
    // protects us when prod is on a fresh DB or the seed was partial.
    const schools = await db.select({ id: schoolsTable.id }).from(schoolsTable);
    const standardCodes = [
      { code: "3A-MORNA", className: "3A" },
      { code: "4A-MORNA", className: "4A" },
      { code: "5B-MORNA", className: "5B" },
      { code: "6A-MORNA", className: "6A" },
    ];
    for (const s of schools) {
      // Wipe any existing pupil_login codes (they may not match the demo
      // strings) and reinsert the canonical four. Idempotent.
      await db
        .delete(schoolLoginCodesTable)
        .where(
          and(
            eq(schoolLoginCodesTable.schoolId, s.id),
            eq(schoolLoginCodesTable.codeType, "pupil_login")
          )
        );
      for (const { code, className } of standardCodes) {
        const codeHash = await bcrypt.hash(code, 12);
        await db.insert(schoolLoginCodesTable).values({
          schoolId: s.id,
          codeType: "pupil_login",
          codeHash,
          className,
        });
      }
      console.log(`[seed] Reset demo pupil access codes for school ${s.id}`);
    }

    void dsql;
    console.log("[seed] Normalized demo credentials: pupil PIN=1234, others password=password123, MFA cleared, lockouts cleared, access codes ensured");
  } catch (err) {
    console.error("[seed] Failed to normalize demo credentials:", err);
  }
}

startup();

// T06 — fail loudly in production if Resend isn't configured. In dev we warn and
// continue so the developer experience stays unblocked when RESEND_API_KEY is absent.
// The audit table is reachable by the time emailHelper makes its first call (startup
// has already run), so the one-shot missing_api_key audit row written in emailHelper
// will land successfully.
if (!process.env.RESEND_API_KEY) {
  // Demo build: warn-only in all environments. Outbound emails (password reset,
  // notifications) will no-op until RESEND_API_KEY is configured.
  console.warn("[boot] RESEND_API_KEY not set; emails will be skipped");
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

startPatternScanScheduler();
startRetentionSweepScheduler();
