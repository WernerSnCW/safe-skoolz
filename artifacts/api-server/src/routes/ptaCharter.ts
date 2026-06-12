import { Router, type IRouter } from "express";
import { and, eq, desc, isNull } from "drizzle-orm";
import {
  db, schoolsTable, ptaOfficersTable, ptaMembersTable, usersTable, ptaPolicyAcknowledgementsTable,
} from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";
import { OPERATING_STRUCTURE, OPERATING_STRUCTURE_VERSION } from "../lib/operatingStructure";

const router: IRouter = Router();
const MANAGE = requireRole("pta");

// GET /pta/charter — the operating-structure content + claim status + officer
// seats + acknowledgement roster. Authed; readable by members and exec.
router.get("/pta/charter", authMiddleware, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;

  const [school] = await db.select({ ptaClaimedAt: schoolsTable.ptaClaimedAt })
    .from(schoolsTable).where(eq(schoolsTable.id, u.schoolId));

  const officers = await db.select({
    role: ptaOfficersTable.role, domain: ptaOfficersTable.domain,
    firstName: usersTable.firstName, lastName: usersTable.lastName,
  }).from(ptaOfficersTable)
    .innerJoin(ptaMembersTable, eq(ptaMembersTable.id, ptaOfficersTable.memberId))
    .innerJoin(usersTable, eq(usersTable.id, ptaMembersTable.userId))
    .where(and(eq(ptaOfficersTable.schoolId, u.schoolId), eq(ptaOfficersTable.active, true)));

  const acks = await db.select({
    firstName: usersTable.firstName, lastName: usersTable.lastName,
    actionType: ptaPolicyAcknowledgementsTable.actionType, createdAt: ptaPolicyAcknowledgementsTable.createdAt,
  }).from(ptaPolicyAcknowledgementsTable)
    .innerJoin(usersTable, eq(usersTable.id, ptaPolicyAcknowledgementsTable.userId))
    .where(and(
      eq(ptaPolicyAcknowledgementsTable.schoolId, u.schoolId),
      eq(ptaPolicyAcknowledgementsTable.policyVersion, OPERATING_STRUCTURE_VERSION),
    )).orderBy(desc(ptaPolicyAcknowledgementsTable.createdAt));

  const [mine] = await db.select({ id: ptaPolicyAcknowledgementsTable.id })
    .from(ptaPolicyAcknowledgementsTable)
    .where(and(
      eq(ptaPolicyAcknowledgementsTable.schoolId, u.schoolId),
      eq(ptaPolicyAcknowledgementsTable.userId, u.userId),
      eq(ptaPolicyAcknowledgementsTable.policyVersion, OPERATING_STRUCTURE_VERSION),
    ));

  res.json({
    version: OPERATING_STRUCTURE.version,
    title: OPERATING_STRUCTURE.title,
    sections: OPERATING_STRUCTURE.sections,
    claimed: school?.ptaClaimedAt != null,
    claimedAt: school?.ptaClaimedAt ?? null,
    youAcknowledged: mine != null,
    officers: officers.map((o) => ({ role: o.role, domain: o.domain, name: `${o.firstName} ${o.lastName}`.trim() })),
    acknowledgements: acks.map((a) => ({ name: `${a.firstName} ${a.lastName}`.trim(), actionType: a.actionType, createdAt: a.createdAt })),
  });
});

// POST /pta/charter/adopt — admin (caretaker-Chair) adopts the operating structure
// on behalf of the forming committee: sets ptaClaimedAt + records an 'adopted' ack.
// Idempotent — re-adopting returns the existing claim without a duplicate.
router.post("/pta/charter/adopt", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const [school] = await db.select({ ptaClaimedAt: schoolsTable.ptaClaimedAt })
    .from(schoolsTable).where(eq(schoolsTable.id, u.schoolId));
  if (school?.ptaClaimedAt != null) {
    res.json({ claimedAt: school.ptaClaimedAt });
    return;
  }
  const claimedAt = new Date();
  let won = false;
  await db.transaction(async (tx) => {
    const claimed = await tx.update(schoolsTable)
      .set({ ptaClaimedAt: claimedAt })
      .where(and(eq(schoolsTable.id, u.schoolId), isNull(schoolsTable.ptaClaimedAt)))
      .returning({ id: schoolsTable.id });
    if (claimed.length === 0) return;
    won = true;
    await tx.insert(ptaPolicyAcknowledgementsTable).values({
      schoolId: u.schoolId, userId: u.userId, policyVersion: OPERATING_STRUCTURE_VERSION, actionType: "adopted",
    });
  });
  if (!won) {
    const [fresh] = await db.select({ ptaClaimedAt: schoolsTable.ptaClaimedAt }).from(schoolsTable).where(eq(schoolsTable.id, u.schoolId));
    res.json({ claimedAt: fresh?.ptaClaimedAt ?? claimedAt });
    return;
  }
  await writeAudit({ schoolId: u.schoolId, eventType: "pta_charter_adopted", actor: u, targetType: "school", targetId: u.schoolId, details: { version: OPERATING_STRUCTURE_VERSION }, req });
  res.json({ claimedAt });
});

// POST /pta/charter/acknowledge — an appointed officer records their own
// acknowledgement of the charter. Idempotent per (user, version). Does NOT
// change ptaClaimedAt.
router.post("/pta/charter/acknowledge", authMiddleware, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const [existing] = await db.select({ id: ptaPolicyAcknowledgementsTable.id })
    .from(ptaPolicyAcknowledgementsTable)
    .where(and(
      eq(ptaPolicyAcknowledgementsTable.schoolId, u.schoolId),
      eq(ptaPolicyAcknowledgementsTable.userId, u.userId),
      eq(ptaPolicyAcknowledgementsTable.policyVersion, OPERATING_STRUCTURE_VERSION),
      eq(ptaPolicyAcknowledgementsTable.actionType, "acknowledged"),
    ));
  if (!existing) {
    await db.insert(ptaPolicyAcknowledgementsTable).values({
      schoolId: u.schoolId, userId: u.userId, policyVersion: OPERATING_STRUCTURE_VERSION, actionType: "acknowledged",
    });
    await writeAudit({ schoolId: u.schoolId, eventType: "pta_charter_acknowledged", actor: u, targetType: "school", targetId: u.schoolId, details: {}, req });
  }
  res.json({ ok: true });
});

export default router;
