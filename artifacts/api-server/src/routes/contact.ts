import { Router, type IRouter } from "express";
import { db, contactMessagesTable } from "@workspace/db";

const router: IRouter = Router();

// Public, no-auth: the SchoolVBE site contact form (/about#contact).
router.post("/contact", async (req, res): Promise<void> => {
  const { name, email, role, message } = req.body ?? {};

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    res.status(400).json({ error: "Name, email, and message are required." });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Invalid email address." });
    return;
  }

  if (String(message).length > 5000 || String(name).length > 150) {
    res.status(400).json({ error: "Message too long." });
    return;
  }

  await db.insert(contactMessagesTable).values({
    name: String(name).trim(),
    email: String(email).toLowerCase().trim(),
    role: role ? String(role).trim().slice(0, 100) : null,
    message: String(message).trim(),
  });

  res.status(201).json({ message: "Thank you — we'll be in touch." });
});

export default router;
