import { db, incidentsTable, patternAlertsTable, notificationsTable, usersTable, schoolsTable, pupilDiaryTable } from "@workspace/db";
import { eq, and, gte, sql, inArray, lte } from "drizzle-orm";
import { sendEmail } from "./emailHelper";

export async function runPatternDetection(incident: typeof incidentsTable.$inferSelect) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  if (incident.category === "sexual" || incident.category === "sexualised") {
    const created = await createAlert({
      schoolId: incident.schoolId,
      ruleId: "sexual_any",
      ruleLabel: "Sexual incident reported - immediate review required",
      alertLevel: "red",
      victimId: incident.victimIds?.[0] || null,
      perpetratorIds: incident.perpetratorIds || [],
      linkedIncidentIds: [incident.id],
    });
    if (created) {
      await notifyCoordinators(incident.schoolId, "Red alert: Sexual incident reported", incident.referenceNumber);
    }
    return;
  }

  if (incident.victimIds && incident.victimIds.length > 0) {
    for (const victimId of incident.victimIds) {
      const recentVictimIncidents = await db
        .select()
        .from(incidentsTable)
        .where(
          and(
            eq(incidentsTable.schoolId, incident.schoolId),
            gte(incidentsTable.createdAt, thirtyDaysAgo),
            sql`${victimId} = ANY(${incidentsTable.victimIds})`
          )
        );

      if (recentVictimIncidents.length >= 3) {
        const categories = new Set(recentVictimIncidents.map((i) => i.category));
        if (categories.size >= 2) {
          const created = await createAlert({
            schoolId: incident.schoolId,
            ruleId: "same_pair_escalating",
            ruleLabel: "Escalating pattern: same victim, multiple categories",
            alertLevel: "red",
            victimId,
            perpetratorIds: incident.perpetratorIds || [],
            linkedIncidentIds: recentVictimIncidents.map((i) => i.id),
          });
          if (created) {
            await notifyCoordinators(incident.schoolId, "Red alert: Escalating pattern detected", incident.referenceNumber);
          }
        } else {
          await createAlert({
            schoolId: incident.schoolId,
            ruleId: "same_victim_3_incidents",
            ruleLabel: "Same victim involved in 3+ incidents (30 days)",
            alertLevel: "amber",
            victimId,
            perpetratorIds: [],
            linkedIncidentIds: recentVictimIncidents.map((i) => i.id),
          });
        }
      }

      const recentVictimIncidents14d = await db
        .select()
        .from(incidentsTable)
        .where(
          and(
            eq(incidentsTable.schoolId, incident.schoolId),
            gte(incidentsTable.createdAt, fourteenDaysAgo),
            sql`${victimId} = ANY(${incidentsTable.victimIds})`
          )
        );

      const distinctPerps = new Set<string>();
      for (const inc of recentVictimIncidents14d) {
        if (inc.perpetratorIds) {
          for (const pid of inc.perpetratorIds) {
            distinctPerps.add(pid);
          }
        }
      }
      if (distinctPerps.size >= 3) {
        const created = await createAlert({
          schoolId: incident.schoolId,
          ruleId: "group_targeting",
          ruleLabel: "Group targeting: same victim targeted by 3+ different perpetrators (14 days)",
          alertLevel: "red",
          victimId,
          perpetratorIds: Array.from(distinctPerps),
          linkedIncidentIds: recentVictimIncidents14d.map((i) => i.id),
        });
        if (created) {
          await notifyCoordinators(incident.schoolId, "Red alert: Group targeting pattern detected", incident.referenceNumber);
        }
      }
    }
  }

  if (incident.perpetratorIds && incident.perpetratorIds.length > 0) {
    for (const perpId of incident.perpetratorIds) {
      const recentPerpIncidents = await db
        .select()
        .from(incidentsTable)
        .where(
          and(
            eq(incidentsTable.schoolId, incident.schoolId),
            gte(incidentsTable.createdAt, thirtyDaysAgo),
            sql`${perpId} = ANY(${incidentsTable.perpetratorIds})`
          )
        );

      if (recentPerpIncidents.length >= 3) {
        const created = await createAlert({
          schoolId: incident.schoolId,
          ruleId: "repeat_perpetrator",
          ruleLabel: "Same perpetrator in 3+ incidents (30 days)",
          alertLevel: "amber",
          victimId: incident.victimIds?.[0] || null,
          perpetratorIds: [perpId],
          linkedIncidentIds: recentPerpIncidents.map((i) => i.id),
        });
        if (created) {
          await notifyCoordinators(incident.schoolId, "Amber alert: Repeat perpetrator pattern detected", incident.referenceNumber);
        }
      }
    }
  }

  if (incident.location) {
    const locationIncidents = await db
      .select()
      .from(incidentsTable)
      .where(
        and(
          eq(incidentsTable.schoolId, incident.schoolId),
          gte(incidentsTable.createdAt, fourteenDaysAgo),
          eq(incidentsTable.location, incident.location)
        )
      );

    if (locationIncidents.length >= 3) {
      const created = await createAlert({
        schoolId: incident.schoolId,
        ruleId: "location_hotspot",
        ruleLabel: `Location hotspot: 3+ incidents at "${incident.location}" (14 days)`,
        alertLevel: "amber",
        victimId: null,
        perpetratorIds: [],
        linkedIncidentIds: locationIncidents.map((i) => i.id),
      });
      if (created) {
        await notifyCoordinators(incident.schoolId, `Amber alert: Location hotspot at "${incident.location}"`, incident.referenceNumber);
      }
    }
  }

  if (
    incident.emotionalState &&
    ["scared", "sad", "worried"].includes(incident.emotionalState) &&
    incident.victimIds &&
    incident.victimIds.length > 0
  ) {
    for (const victimId of incident.victimIds) {
      const distressIncidents = await db
        .select()
        .from(incidentsTable)
        .where(
          and(
            eq(incidentsTable.schoolId, incident.schoolId),
            gte(incidentsTable.createdAt, thirtyDaysAgo),
            sql`${victimId} = ANY(${incidentsTable.victimIds})`,
            inArray(incidentsTable.emotionalState, ["scared", "sad", "worried"])
          )
        );

      if (distressIncidents.length >= 3) {
        const created = await createAlert({
          schoolId: incident.schoolId,
          ruleId: "emotional_distress_pattern",
          ruleLabel: "Emotional distress pattern detected (30 days)",
          alertLevel: "amber",
          victimId,
          perpetratorIds: [],
          linkedIncidentIds: distressIncidents.map((i) => i.id),
        });
        if (created) {
          await notifyCoordinators(incident.schoolId, "Amber alert: Emotional distress pattern detected", incident.referenceNumber);
          await notifyByRole(incident.schoolId, "senco", "Amber alert: Emotional distress pattern detected", incident.referenceNumber);
        }
      }
    }
  }
}

export async function runMoodDeclineScan() {
  const schools = await db.select({ id: schoolsTable.id }).from(schoolsTable).where(eq(schoolsTable.active, true));
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  for (const school of schools) {
    const pupilMoods = await db.execute(sql`
      SELECT pupil_id,
             COUNT(*) as entry_count,
             AVG(mood) as avg_mood
      FROM pupil_diary
      WHERE school_id = ${school.id}
        AND created_at >= ${fourteenDaysAgo}
      GROUP BY pupil_id
      HAVING COUNT(*) >= 5 AND AVG(mood) <= 2.0
    `);

    for (const row of pupilMoods.rows as any[]) {
      const created = await createAlert({
        schoolId: school.id,
        ruleId: "mood_decline",
        ruleLabel: `Mood diary decline: average mood ${Number(row.avg_mood).toFixed(1)}/5 over ${row.entry_count} entries (14 days)`,
        alertLevel: "amber",
        victimId: row.pupil_id,
        perpetratorIds: [],
        linkedIncidentIds: [],
      });
      if (created) {
        await notifyByRole(school.id, "senco", "Amber alert: Pupil mood diary shows sustained low wellbeing");
        await notifyCoordinators(school.id, "Amber alert: Pupil mood diary shows sustained low wellbeing");
      }
    }
  }
}

export async function runScheduledPatternScan() {
  const schools = await db.select({ id: schoolsTable.id }).from(schoolsTable).where(eq(schoolsTable.active, true));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const school of schools) {
    const recentIncidents = await db
      .select()
      .from(incidentsTable)
      .where(
        and(
          eq(incidentsTable.schoolId, school.id),
          gte(incidentsTable.createdAt, thirtyDaysAgo)
        )
      );

    for (const incident of recentIncidents) {
      try {
        await runPatternDetection(incident);
      } catch (err) {
        console.error(`Pattern scan error for incident ${incident.id}:`, err);
      }
    }
  }

  try {
    await runMoodDeclineScan();
  } catch (err) {
    console.error("[cron] Mood decline scan error:", err);
  }

  console.log(`[cron] Pattern scan complete for ${schools.length} school(s)`);
}

/** @internal */
export async function createAlert(data: {
  schoolId: string;
  ruleId: string;
  ruleLabel: string;
  alertLevel: string;
  victimId: string | null;
  perpetratorIds: string[];
  linkedIncidentIds: string[];
}): Promise<boolean> {
  const conditions: any[] = [
    eq(patternAlertsTable.schoolId, data.schoolId),
    eq(patternAlertsTable.ruleId, data.ruleId),
    eq(patternAlertsTable.status, "open"),
  ];
  if (data.victimId) {
    conditions.push(eq(patternAlertsTable.victimId, data.victimId));
  }

  const existing = await db.select({ id: patternAlertsTable.id })
    .from(patternAlertsTable)
    .where(and(...conditions))
    .limit(1);

  if (existing.length > 0) {
    return false;
  }

  await db.insert(patternAlertsTable).values({
    schoolId: data.schoolId,
    ruleId: data.ruleId,
    ruleLabel: data.ruleLabel,
    alertLevel: data.alertLevel,
    victimId: data.victimId,
    perpetratorIds: data.perpetratorIds,
    linkedIncidentIds: data.linkedIncidentIds,
    status: "open",
  });

  if (data.alertLevel === "amber" || data.alertLevel === "red") {
    (async () => {
      try {
        const [school] = await db.select({ name: schoolsTable.name }).from(schoolsTable).where(eq(schoolsTable.id, data.schoolId));
        const schoolName = school?.name || "your school";
        const levelLabel = data.alertLevel.charAt(0).toUpperCase() + data.alertLevel.slice(1);
        const emailRecipients = await db.select().from(usersTable).where(
          and(eq(usersTable.schoolId, data.schoolId), inArray(usersTable.role, ["coordinator", "head_teacher"]), eq(usersTable.active, true))
        );
        const emailBody = `A ${levelLabel} pattern alert has been detected at ${schoolName}.\n\nAlert: ${data.ruleLabel}\nDetected: ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}\n\nPlease log in to Safeskoolz to review this alert.\n\nThis is an automated alert from Safeskoolz.`;
        await Promise.all(
          emailRecipients
            .filter(r => r.email)
            .map(r => sendEmail({
              to: r.email!,
              toName: `${r.firstName} ${r.lastName}`,
              subject: `Safeskoolz — ${levelLabel} Pattern Alert: ${data.ruleLabel}`,
              bodyText: emailBody,
              trigger: "pattern_alert",
              recipientId: r.id,
              schoolId: data.schoolId,
            }))
        );
      } catch {}
    })();
  }

  return true;
}

async function notifyCoordinators(schoolId: string, message: string, reference?: string) {
  await notifyByRole(schoolId, "coordinator", message, reference);
  await notifyByRole(schoolId, "head_teacher", message, reference);
}

async function notifyByRole(schoolId: string, role: string, message: string, reference?: string) {
  const users = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.schoolId, schoolId),
        eq(usersTable.role, role),
        eq(usersTable.active, true)
      )
    );

  for (const user of users) {
    await db.insert(notificationsTable).values({
      schoolId,
      recipientId: user.id,
      trigger: "pattern_alert",
      channel: "in_app",
      subject: "Pattern Alert",
      body: message,
      reference: reference || null,
      delivered: true,
    });
  }
}
