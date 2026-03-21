import { db, incidentsTable, patternAlertsTable, notificationsTable, usersTable, schoolsTable } from "@workspace/db";
import { eq, and, gte, sql, inArray } from "drizzle-orm";

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
  console.log(`[cron] Pattern scan complete for ${schools.length} school(s)`);
}

async function createAlert(data: {
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
