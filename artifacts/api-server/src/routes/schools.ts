import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, schoolsTable, usersTable } from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";

const router: IRouter = Router();

router.get("/schools", async (_req, res): Promise<void> => {
  const schools = await db.select().from(schoolsTable).where(eq(schoolsTable.active, true));
  res.json(
    schools.map((s) => ({
      id: s.id,
      name: s.name,
      legalEntity: s.legalEntity,
      cif: s.cif,
      address: s.address,
      country: s.country,
      region: s.region,
      active: s.active,
    }))
  );
});

router.get("/schools/:schoolId/pupils", async (req, res): Promise<void> => {
  const schoolId = Array.isArray(req.params.schoolId) ? req.params.schoolId[0] : req.params.schoolId;
  const className = req.query.className as string | undefined;

  let conditions: any[] = [eq(usersTable.schoolId, schoolId), eq(usersTable.role, "pupil"), eq(usersTable.active, true)];
  if (className) {
    conditions.push(eq(usersTable.className, className));
  }

  const pupils = await db.select().from(usersTable).where(and(...conditions));

  res.json(
    pupils.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName ? p.lastName.charAt(0) + "." : "",
      yearGroup: p.yearGroup,
      className: p.className,
      avatarType: p.avatarType,
      avatarValue: p.avatarValue,
    }))
  );
});

router.get("/schools/:schoolId/staff", authMiddleware, requireRole("coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const schoolId = Array.isArray(req.params.schoolId) ? req.params.schoolId[0] : req.params.schoolId;

  const staff = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.schoolId, schoolId),
        inArray(usersTable.role, ["teacher", "coordinator", "head_teacher", "senco"]),
        eq(usersTable.active, true)
      )
    );

  res.json(
    staff.map((u) => ({
      id: u.id,
      schoolId: u.schoolId,
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      yearGroup: u.yearGroup,
      className: u.className,
      avatarType: u.avatarType,
      avatarValue: u.avatarValue,
      avatarImageUrl: u.avatarImageUrl,
      parentOf: u.parentOf || [],
      active: u.active,
      lastLogin: u.lastLogin?.toISOString() || null,
    }))
  );
});

router.post("/users/:id/avatar", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (user.userId !== id && user.role !== "coordinator") {
    res.status(403).json({ error: "Can only update your own avatar" });
    return;
  }

  const { avatarType, avatarValue } = req.body;
  if (!avatarType || !avatarValue) {
    res.status(400).json({ error: "avatarType and avatarValue required" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ avatarType, avatarValue })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    avatarType: updated.avatarType,
    avatarValue: updated.avatarValue,
    avatarImageUrl: updated.avatarImageUrl,
  });
});

export default router;
