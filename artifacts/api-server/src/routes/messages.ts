import { Router, type IRouter } from "express";
import { eq, and, or, desc, inArray, isNull } from "drizzle-orm";
import { db, messagesTable, usersTable, notificationsTable } from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";

const router: IRouter = Router();

const ALL_STAFF_ROLES = ["coordinator", "head_teacher", "teacher", "head_of_year", "senco", "support_staff"] as const;

router.get("/parent-contacts", authMiddleware, requireRole("parent"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const [parent] = await db.select({ id: usersTable.id, parentOf: usersTable.parentOf }).from(usersTable).where(eq(usersTable.id, user.userId));
  if (!parent) { res.status(404).json({ error: "User not found" }); return; }

  const childIds = parent.parentOf || [];
  const children = childIds.length > 0
    ? await db.select({
        id: usersTable.id,
        className: usersTable.className,
        yearGroup: usersTable.yearGroup,
      }).from(usersTable).where(
        and(eq(usersTable.schoolId, user.schoolId), eq(usersTable.role, "pupil"), inArray(usersTable.id, childIds))
      )
    : [];

  const childClasses = [...new Set(children.map(c => c.className).filter(Boolean))];
  const childYears = [...new Set(children.map(c => c.yearGroup).filter(Boolean))];

  const contacts = await db.select({
    id: usersTable.id,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    role: usersTable.role,
    className: usersTable.className,
    yearGroup: usersTable.yearGroup,
  }).from(usersTable).where(
    and(
      eq(usersTable.schoolId, user.schoolId),
      eq(usersTable.active, true),
      inArray(usersTable.role, ["teacher", "head_of_year", "senco", "coordinator", "head_teacher", "support_staff"]),
    )
  );

  const sorted = contacts.sort((a, b) => {
    const aIsClassTeacher = childClasses.includes(a.className || "") ? 1 : 0;
    const bIsClassTeacher = childClasses.includes(b.className || "") ? 1 : 0;
    if (aIsClassTeacher !== bIsClassTeacher) return bIsClassTeacher - aIsClassTeacher;
    const aIsYearHead = a.role === "head_of_year" && childYears.includes(a.yearGroup || "") ? 1 : 0;
    const bIsYearHead = b.role === "head_of_year" && childYears.includes(b.yearGroup || "") ? 1 : 0;
    if (aIsYearHead !== bIsYearHead) return bIsYearHead - aIsYearHead;
    const roleOrder: Record<string, number> = { teacher: 0, head_of_year: 1, senco: 2, support_staff: 3, coordinator: 4, head_teacher: 5 };
    return (roleOrder[a.role || ""] ?? 99) - (roleOrder[b.role || ""] ?? 99);
  });

  const result = sorted.map(c => ({
    ...c,
    isChildsTeacher: childClasses.includes(c.className || ""),
    displayRole: c.role === "teacher" ? "Class Teacher" :
      c.role === "head_of_year" ? "Head of Year" :
      c.role === "senco" ? "SENCO" :
      c.role === "support_staff" ? "Support Staff" :
      c.role === "coordinator" ? "Safeguarding Coordinator" :
      c.role === "head_teacher" ? "Head Teacher" : "Staff",
  }));

  res.json(result);
});

router.get("/safe-contacts", authMiddleware, requireRole("pupil"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const contacts = await db.select({
    id: usersTable.id,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    role: usersTable.role,
    className: usersTable.className,
    yearGroup: usersTable.yearGroup,
  }).from(usersTable).where(
    and(
      eq(usersTable.schoolId, user.schoolId),
      eq(usersTable.active, true),
      inArray(usersTable.role, ["teacher", "head_of_year", "senco", "coordinator", "head_teacher", "support_staff"]),
    )
  );

  const [pupil] = await db.select({ className: usersTable.className, yearGroup: usersTable.yearGroup })
    .from(usersTable).where(eq(usersTable.id, user.userId));

  const sorted = contacts.sort((a, b) => {
    const aIsFormTutor = a.className === pupil?.className ? 1 : 0;
    const bIsFormTutor = b.className === pupil?.className ? 1 : 0;
    if (aIsFormTutor !== bIsFormTutor) return bIsFormTutor - aIsFormTutor;

    const roleOrder: Record<string, number> = { teacher: 0, head_of_year: 1, senco: 2, support_staff: 3, coordinator: 4, head_teacher: 5 };
    return (roleOrder[a.role || ""] ?? 99) - (roleOrder[b.role || ""] ?? 99);
  });

  const result = sorted.map(c => ({
    ...c,
    isFormTutor: c.className === pupil?.className && (c.role === "teacher" || c.role === "head_of_year"),
    displayRole: c.role === "teacher" ? "Teacher" :
      c.role === "head_of_year" ? "Head of Year" :
      c.role === "senco" ? "School Counsellor" :
      c.role === "support_staff" ? "Support Staff" :
      c.role === "coordinator" ? "Safeguarding Lead" :
      c.role === "head_teacher" ? "Head Teacher" : "Staff",
  }));

  res.json(result);
});

router.post("/messages", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const { recipientId, body, priority, type, location, parentMessageId } = req.body;

  if (!recipientId || !body?.trim()) {
    res.status(400).json({ error: "recipientId and body are required" });
    return;
  }

  const validPriorities = ["normal", "important", "urgent"];
  const validTypes = ["message", "chat_request", "urgent_help"];
  const msgPriority = validPriorities.includes(priority) ? priority : "normal";
  const msgType = validTypes.includes(type) ? type : "message";

  const [recipient] = await db.select().from(usersTable).where(
    and(eq(usersTable.id, recipientId), eq(usersTable.schoolId, user.schoolId))
  );

  if (!recipient) {
    res.status(404).json({ error: "Recipient not found" });
    return;
  }

  if (user.role === "pupil" || user.role === "parent") {
    const staffRoles = ["teacher", "head_of_year", "senco", "coordinator", "head_teacher", "support_staff"];
    if (!staffRoles.includes(recipient.role || "")) {
      res.status(403).json({ error: user.role === "pupil" ? "Pupils can only message staff members" : "Parents can only message staff members" });
      return;
    }
  }

  const [message] = await db.insert(messagesTable).values({
    schoolId: user.schoolId,
    senderId: user.userId,
    recipientId,
    senderRole: user.role,
    priority: msgPriority,
    type: msgType,
    body: body.trim(),
    location: location || null,
    parentMessageId: parentMessageId || null,
  }).returning();

  const [sender] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable).where(eq(usersTable.id, user.userId));

  const senderName = sender ? `${sender.firstName} ${sender.lastName}` : "Someone";

  let notifSubject: string;
  let notifBody: string;

  if (msgType === "urgent_help") {
    notifSubject = `URGENT: ${senderName} needs help NOW`;
    notifBody = `${senderName} is asking for urgent help${location ? ` at ${location.replace(/_/g, " ")}` : ""}. Message: "${body.trim()}"`;
  } else if (msgType === "chat_request") {
    notifSubject = `${senderName} would like to talk`;
    notifBody = `${senderName} has requested a chat with you. Message: "${body.trim()}"`;
  } else {
    const priorityLabel = msgPriority === "urgent" ? "[URGENT] " : msgPriority === "important" ? "[Important] " : "";
    notifSubject = `${priorityLabel}Message from ${senderName}`;
    notifBody = body.trim();
  }

  await db.insert(notificationsTable).values({
    schoolId: user.schoolId,
    recipientId,
    trigger: msgType === "urgent_help" ? "urgent_help_request" : msgType === "chat_request" ? "chat_request" : user.role === "parent" ? "parent_message" : "pupil_message",
    subject: notifSubject,
    body: notifBody,
    channel: "in_app",
    delivered: false,
  });

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "message_sent",
    actor: { userId: user.userId, schoolId: user.schoolId, role: user.role },
    targetType: "message",
    targetId: message.id,
    details: { recipientId, type: msgType, priority: msgPriority },
    req,
  });

  res.status(201).json(message);
});

router.get("/messages", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const contactId = req.query.contactId as string | undefined;

  const conditions = [
    or(
      eq(messagesTable.senderId, user.userId),
      eq(messagesTable.recipientId, user.userId),
    )!,
    eq(messagesTable.schoolId, user.schoolId),
  ];

  if (contactId) {
    conditions.push(
      or(
        and(eq(messagesTable.senderId, user.userId), eq(messagesTable.recipientId, contactId))!,
        and(eq(messagesTable.senderId, contactId), eq(messagesTable.recipientId, user.userId))!,
      )!
    );
  }

  const messages = await db.select().from(messagesTable)
    .where(and(...conditions))
    .orderBy(desc(messagesTable.createdAt))
    .limit(100);

  const userIds = new Set<string>();
  for (const m of messages) {
    userIds.add(m.senderId);
    userIds.add(m.recipientId);
  }

  let userMap: Record<string, { firstName: string; lastName: string; role: string | null }> = {};
  if (userIds.size > 0) {
    const users = await db.select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      role: usersTable.role,
    }).from(usersTable).where(inArray(usersTable.id, [...userIds]));
    for (const u of users) userMap[u.id] = { firstName: u.firstName, lastName: u.lastName, role: u.role };
  }

  const result = messages.map(m => ({
    ...m,
    senderName: userMap[m.senderId] ? `${userMap[m.senderId].firstName} ${userMap[m.senderId].lastName}` : "Unknown",
    recipientName: userMap[m.recipientId] ? `${userMap[m.recipientId].firstName} ${userMap[m.recipientId].lastName}` : "Unknown",
    isFromMe: m.senderId === user.userId,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt ? m.readAt.toISOString() : null,
  }));

  res.json(result);
});

router.patch("/messages/:id/read", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const id = req.params.id;

  const [message] = await db.select().from(messagesTable).where(
    and(eq(messagesTable.id, id), eq(messagesTable.recipientId, user.userId))
  );

  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (!message.readAt) {
    await db.update(messagesTable).set({ readAt: new Date() }).where(eq(messagesTable.id, id));
  }

  res.json({ success: true });
});

router.get("/messages/conversations", authMiddleware, requireRole(...ALL_STAFF_ROLES, "parent"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const allMessages = await db.select().from(messagesTable)
    .where(
      and(
        eq(messagesTable.schoolId, user.schoolId),
        or(
          eq(messagesTable.senderId, user.userId),
          eq(messagesTable.recipientId, user.userId),
        ),
      )
    )
    .orderBy(desc(messagesTable.createdAt));

  const convMap = new Map<string, {
    contactId: string;
    lastMessage: typeof allMessages[0];
    unreadCount: number;
  }>();

  for (const m of allMessages) {
    const contactId = m.senderId === user.userId ? m.recipientId : m.senderId;
    if (!convMap.has(contactId)) {
      convMap.set(contactId, {
        contactId,
        lastMessage: m,
        unreadCount: 0,
      });
    }
    if (m.recipientId === user.userId && !m.readAt) {
      const conv = convMap.get(contactId)!;
      conv.unreadCount++;
    }
  }

  const contactIds = [...convMap.keys()];
  let contactMap: Record<string, { firstName: string; lastName: string; role: string | null; className: string | null }> = {};
  if (contactIds.length > 0) {
    const contacts = await db.select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      role: usersTable.role,
      className: usersTable.className,
    }).from(usersTable).where(inArray(usersTable.id, contactIds));
    for (const c of contacts) contactMap[c.id] = c;
  }

  const conversations = [...convMap.values()].map(conv => ({
    contactId: conv.contactId,
    contactName: contactMap[conv.contactId] ? `${contactMap[conv.contactId].firstName} ${contactMap[conv.contactId].lastName}` : "Unknown",
    contactRole: contactMap[conv.contactId]?.role || "unknown",
    contactClass: contactMap[conv.contactId]?.className || null,
    lastMessage: conv.lastMessage.body,
    lastMessageType: conv.lastMessage.type,
    lastMessagePriority: conv.lastMessage.priority,
    lastMessageAt: conv.lastMessage.createdAt.toISOString(),
    lastMessageIsFromMe: conv.lastMessage.senderId === user.userId,
    unreadCount: conv.unreadCount,
  }));

  conversations.sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });

  res.json(conversations);
});

router.get("/messages/child-alerts", authMiddleware, requireRole("parent"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const [parentRecord] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId));
  const childIds: string[] = parentRecord?.parentOf || [];

  if (childIds.length === 0) {
    res.json([]);
    return;
  }

  const alerts = await db.select().from(messagesTable)
    .where(
      and(
        eq(messagesTable.schoolId, user.schoolId),
        inArray(messagesTable.senderId, childIds),
        eq(messagesTable.type, "urgent_help"),
      )
    )
    .orderBy(desc(messagesTable.createdAt))
    .limit(50);

  const userIds = new Set<string>();
  for (const m of alerts) {
    userIds.add(m.senderId);
    userIds.add(m.recipientId);
  }

  let userMap: Record<string, { firstName: string; lastName: string; role: string | null }> = {};
  if (userIds.size > 0) {
    const users = await db.select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      role: usersTable.role,
    }).from(usersTable).where(inArray(usersTable.id, [...userIds]));
    for (const u of users) userMap[u.id] = { firstName: u.firstName, lastName: u.lastName, role: u.role };
  }

  const result = alerts.map(m => ({
    id: m.id,
    childName: userMap[m.senderId] ? `${userMap[m.senderId].firstName} ${userMap[m.senderId].lastName}` : "Your child",
    recipientName: userMap[m.recipientId] ? `${userMap[m.recipientId].firstName} ${userMap[m.recipientId].lastName}` : "Staff member",
    recipientRole: userMap[m.recipientId]?.role || null,
    body: m.body,
    location: m.location,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt ? m.readAt.toISOString() : null,
  }));

  res.json(result);
});

export default router;
