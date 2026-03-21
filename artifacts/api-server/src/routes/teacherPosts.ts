import { Router, type IRouter, type Request, type Response } from "express";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { db, teacherPostsTable, usersTable } from "@workspace/db";
import { eq, desc, and, or, sql } from "drizzle-orm";

const STAFF_ROLES = ["teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher"];

const VALID_CATEGORIES = ["general", "safeguarding", "wellbeing", "curriculum", "event", "policy"];
const VALID_AUDIENCES = ["everyone", "pupils", "parents", "staff", "pupils_parents"];

const router: IRouter = Router();

router.get(
  "/teacher-posts",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user as JwtPayload;

    const audienceFilter = (() => {
      const role = user.role;
      if (STAFF_ROLES.includes(role)) {
        return or(
          eq(teacherPostsTable.audience, "everyone"),
          eq(teacherPostsTable.audience, "staff")
        );
      }
      if (role === "pupil") {
        return or(
          eq(teacherPostsTable.audience, "everyone"),
          eq(teacherPostsTable.audience, "pupils"),
          eq(teacherPostsTable.audience, "pupils_parents")
        );
      }
      if (role === "parent") {
        return or(
          eq(teacherPostsTable.audience, "everyone"),
          eq(teacherPostsTable.audience, "parents"),
          eq(teacherPostsTable.audience, "pupils_parents")
        );
      }
      if (role === "pta") {
        return or(
          eq(teacherPostsTable.audience, "everyone"),
          eq(teacherPostsTable.audience, "parents")
        );
      }
      return eq(teacherPostsTable.audience, "everyone");
    })();

    const posts = await db
      .select({
        id: teacherPostsTable.id,
        authorId: teacherPostsTable.authorId,
        title: teacherPostsTable.title,
        body: teacherPostsTable.body,
        category: teacherPostsTable.category,
        audience: teacherPostsTable.audience,
        createdAt: teacherPostsTable.createdAt,
        authorFirstName: usersTable.firstName,
        authorLastName: usersTable.lastName,
        authorRole: usersTable.role,
      })
      .from(teacherPostsTable)
      .innerJoin(usersTable, eq(teacherPostsTable.authorId, usersTable.id))
      .where(
        and(
          eq(teacherPostsTable.schoolId, user.schoolId),
          audienceFilter
        )
      )
      .orderBy(desc(teacherPostsTable.createdAt))
      .limit(50);

    res.json(posts);
  }
);

router.post(
  "/teacher-posts",
  authMiddleware,
  requireRole(...STAFF_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user as JwtPayload;
    const { title, body, category, audience } = req.body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      res.status(400).json({ error: "Title is required" });
      return;
    }
    if (!body || typeof body !== "string" || body.trim().length === 0) {
      res.status(400).json({ error: "Body is required" });
      return;
    }
    if (category && !VALID_CATEGORIES.includes(category)) {
      res.status(400).json({ error: "Invalid category" });
      return;
    }
    if (audience && !VALID_AUDIENCES.includes(audience)) {
      res.status(400).json({ error: "Invalid audience" });
      return;
    }

    const [post] = await db
      .insert(teacherPostsTable)
      .values({
        schoolId: user.schoolId,
        authorId: user.userId,
        title: title.trim().slice(0, 200),
        body: body.trim().slice(0, 5000),
        category: category || "general",
        audience: audience || "everyone",
      })
      .returning();

    res.status(201).json(post);
  }
);

router.delete(
  "/teacher-posts/:id",
  authMiddleware,
  requireRole(...STAFF_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user as JwtPayload;
    const { id } = req.params;

    const [post] = await db
      .select()
      .from(teacherPostsTable)
      .where(and(eq(teacherPostsTable.id, id), eq(teacherPostsTable.schoolId, user.schoolId)));

    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    const isAuthor = post.authorId === user.userId;
    const isAdmin = ["coordinator", "head_teacher"].includes(user.role);

    if (!isAuthor && !isAdmin) {
      res.status(403).json({ error: "Only the author or a coordinator can delete posts" });
      return;
    }

    await db.delete(teacherPostsTable).where(and(eq(teacherPostsTable.id, id), eq(teacherPostsTable.schoolId, user.schoolId)));
    res.json({ success: true });
  }
);

export default router;
