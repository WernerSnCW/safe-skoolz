import { db, schoolsTable, usersTable, diagnosticSurveysTable, voiceGroupsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { MORNA_INSTRUMENT } from "../../artifacts/api-server/src/lib/communityInstrument";

// Idempotent Morna production seed: school + community diagnostic + chair account.
// Usage: MORNA_CHAIR_EMAIL=tom@... pnpm --filter @workspace/scripts seed-morna
async function main() {
  const chairEmail = process.env.MORNA_CHAIR_EMAIL?.toLowerCase().trim();
  if (!chairEmail) throw new Error("Set MORNA_CHAIR_EMAIL");

  let [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.slug, "morna"));
  if (!school) {
    [school] = await db.insert(schoolsTable).values({
      name: "Morna International College",
      slug: "morna",
      country: "ES",
      region: "Balearic Islands",
    }).returning();
    console.log("[seed-morna] created school", school.id);
  } else {
    console.log("[seed-morna] school exists", school.id);
  }

  let [chair] = await db.select().from(usersTable).where(eq(usersTable.email, chairEmail));
  if (!chair) {
    [chair] = await db.insert(usersTable).values({
      schoolId: school.id,
      role: "pta",
      firstName: "Tom",
      lastName: "King",
      email: chairEmail,
      membershipStatus: "approved",
    // as any: drizzle insert type lags the new columns (membershipStatus / instrument jsonb)
    } as any).returning();
    console.log("[seed-morna] created chair account (no password — use the reset-password flow to set one)");
  } else {
    console.log("[seed-morna] chair account exists");
  }

  if (chair.schoolId !== school.id) {
    throw new Error(
      `Chair account ${chairEmail} exists but belongs to school ${chair.schoolId}, not Morna (${school.id}). ` +
      `Pass a different email or manually reassign the account.`,
    );
  }

  const [existingSurvey] = await db.select().from(diagnosticSurveysTable)
    .where(eq(diagnosticSurveysTable.publicSlug, "morna"));
  if (!existingSurvey) {
    await db.insert(diagnosticSurveysTable).values({
      schoolId: school.id,
      title: "How is Morna really doing?",
      status: "active",
      createdBy: chair.id,
      publicSlug: "morna",
      instrument: MORNA_INSTRUMENT,
    // as any: drizzle insert type lags the new columns (membershipStatus / instrument jsonb)
    } as any);
    console.log("[seed-morna] created community survey /d/morna");
  } else {
    console.log("[seed-morna] survey exists");
  }
  const [existingVoice] = await db.select().from(voiceGroupsTable)
    .where(and(eq(voiceGroupsTable.schoolId, school.id), eq(voiceGroupsTable.name, "Morna Vibes")));
  if (!existingVoice) {
    const [voice] = await db.insert(voiceGroupsTable).values({
      schoolId: school.id,
      name: "Morna Vibes",
      mission:
        "Parents asking Morna to adopt Values-based Education, and asking the PTA to adopt a three-tier structure so every parent has an equal voice and the same information.",
      status: "advocating",
      createdById: chair.id,
    }).returning();
    console.log("[seed-morna] created Morna Vibes voice group", voice.id);
  } else {
    console.log("[seed-morna] Morna Vibes voice group exists", existingVoice.id);
  }
  process.exit(0);
}

main().catch((e) => { console.error("seed-morna failed:", e); process.exit(1); });
