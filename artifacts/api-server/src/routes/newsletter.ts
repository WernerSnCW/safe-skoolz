import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, newsletterSubscribersTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/newsletter/subscribe", async (req, res): Promise<void> => {
  const { organisationType, organisationName, contactName, email, role, region, interests, consentGiven } = req.body;

  if (!organisationType || !organisationName || !contactName || !email) {
    res.status(400).json({ error: "Organisation type, name, contact name, and email are required." });
    return;
  }

  const validTypes = ["school", "authority", "trust", "ngo", "other"];
  if (!validTypes.includes(organisationType)) {
    res.status(400).json({ error: "Invalid organisation type." });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Invalid email address." });
    return;
  }

  if (!consentGiven) {
    res.status(400).json({ error: "You must consent to receive communications." });
    return;
  }

  const existing = await db.select({ id: newsletterSubscribersTable.id })
    .from(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "This email is already registered." });
    return;
  }

  await db.insert(newsletterSubscribersTable).values({
    organisationType,
    organisationName: organisationName.trim(),
    contactName: contactName.trim(),
    email: email.toLowerCase().trim(),
    role: role?.trim() || null,
    region: region?.trim() || null,
    interests: interests?.trim() || null,
    consentGiven: true,
  });

  res.status(201).json({ message: "Thank you for registering! We'll be in touch soon." });
});

export default router;
