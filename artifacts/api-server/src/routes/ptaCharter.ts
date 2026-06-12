import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import {
  db, schoolsTable, ptaOfficersTable, ptaMembersTable, usersTable, ptaPolicyAcknowledgementsTable,
} from "@workspace/db";
import { authMiddleware, type JwtPayload } from "../lib/auth";
import { OPERATING_STRUCTURE, OPERATING_STRUCTURE_VERSION } from "../lib/operatingStructure";

const router: IRouter = Router();

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

  res.json({
    version: OPERATING_STRUCTURE.version,
    title: OPERATING_STRUCTURE.title,
    sections: OPERATING_STRUCTURE.sections,
    claimed: school?.ptaClaimedAt != null,
    claimedAt: school?.ptaClaimedAt ?? null,
    officers: officers.map((o) => ({ role: o.role, domain: o.domain, name: `${o.firstName} ${o.lastName}`.trim() })),
    acknowledgements: acks.map((a) => ({ name: `${a.firstName} ${a.lastName}`.trim(), actionType: a.actionType, createdAt: a.createdAt })),
  });
});

export default router;
