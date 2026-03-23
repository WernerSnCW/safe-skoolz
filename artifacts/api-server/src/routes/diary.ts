import { Router, type IRouter, type Request, type Response } from "express";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { db, pupilDiaryTable, patternAlertsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import OpenAI from "openai";

const router: IRouter = Router();

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (openaiClient) return openaiClient;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!baseURL || !apiKey) return null;
  openaiClient = new OpenAI({ baseURL, apiKey });
  return openaiClient;
}

async function scanDiaryEntry(
  entryId: string,
  note: string,
  mood: number,
  pupilId: string,
  schoolId: string
): Promise<void> {
  const client = getOpenAI();
  if (!client || !note || note.trim().length < 10) return;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content: `You are a child safeguarding AI assistant used by a school welfare system. You review diary entries written by pupils (children) to identify SERIOUS safeguarding concerns that require adult intervention.

You must ONLY flag entries that indicate:
- Self-harm or suicidal ideation
- Physical abuse or violence at home
- Sexual abuse or inappropriate contact
- Severe bullying involving threats of harm
- Substance abuse
- Neglect (not being fed, cared for)
- Exploitation or grooming
- Domestic violence witnessed

You must NOT flag entries about:
- Normal childhood sadness or frustration
- Arguments with friends
- Bad days at school
- Homework stress
- Feeling left out occasionally
- Normal peer conflict

Respond with ONLY a JSON object: {"flag": true/false, "level": "red"|"amber"|null, "reason": "brief reason"|null}
- "red" = immediate danger, needs urgent intervention
- "amber" = concerning pattern, needs welfare check
- null = no concern`
        },
        {
          role: "user",
          content: `Pupil diary entry (mood: ${mood}/5):\n\n${note}`
        }
      ],
    });

    const content = response.choices?.[0]?.message?.content?.trim();
    if (!content) return;

    let parsed: { flag: boolean; level: string | null; reason: string | null };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      return;
    }

    if (!parsed.flag || !parsed.level) return;

    const validLevels = ["red", "amber"];
    const safeLevel = validLevels.includes(parsed.level) ? parsed.level : "amber";

    await db.insert(patternAlertsTable).values({
      schoolId,
      ruleId: "diary_ai_safeguard",
      ruleLabel: "AI Diary Safeguarding Flag",
      alertLevel: safeLevel,
      victimId: pupilId,
      perpetratorIds: null,
      linkedIncidentIds: null,
      status: "open",
      notes: "A pupil's diary entry has been flagged for welfare review. Please check in with this pupil directly.",
    });

    console.log(`[diary-ai] Flagged entry ${entryId} as ${safeLevel}`);
  } catch (err) {
    console.error("[diary-ai] Scan failed (non-blocking):", (err as Error).message);
  }
}

router.get(
  "/diary/entries",
  authMiddleware,
  requireRole("pupil"),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user as JwtPayload;
    const entries = await db
      .select()
      .from(pupilDiaryTable)
      .where(eq(pupilDiaryTable.pupilId, user.userId))
      .orderBy(desc(pupilDiaryTable.createdAt))
      .limit(100);
    res.json(entries);
  }
);

router.post(
  "/diary/entries",
  authMiddleware,
  requireRole("pupil"),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user as JwtPayload;
    const { mood, note } = req.body;

    const validMood = (typeof mood === "number" && mood >= 1 && mood <= 5) ? mood : null;
    const trimmedNote = typeof note === "string" ? note.trim().slice(0, 1000) : null;

    if (!validMood && !trimmedNote) {
      res.status(400).json({ error: "Please write something or pick a mood" });
      return;
    }

    const [entry] = await db
      .insert(pupilDiaryTable)
      .values({
        pupilId: user.userId,
        schoolId: user.schoolId,
        mood: validMood,
        note: trimmedNote || null,
      })
      .returning();

    res.status(201).json(entry);

    if (trimmedNote && trimmedNote.length >= 10) {
      scanDiaryEntry(entry.id, trimmedNote, validMood || 3, user.userId, user.schoolId).catch(() => {});
    }
  }
);

router.delete(
  "/diary/entries/:id",
  authMiddleware,
  requireRole("pupil"),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user as JwtPayload;
    const { id } = req.params;

    const [entry] = await db
      .select()
      .from(pupilDiaryTable)
      .where(and(eq(pupilDiaryTable.id, id), eq(pupilDiaryTable.pupilId, user.userId)));

    if (!entry) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }

    await db
      .delete(pupilDiaryTable)
      .where(and(eq(pupilDiaryTable.id, id), eq(pupilDiaryTable.pupilId, user.userId)));

    res.json({ success: true });
  }
);

export default router;
