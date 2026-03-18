import { db, incidentsTable, patternAlertsTable, notificationsTable, usersTable } from "@workspace/db";
import { eq, and, gte, sql, inArray } from "drizzle-orm";

export async function runPatternDetection(incident: typeof incidentsTable.$inferSelect) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  if (incident.category === "sexual") {
    await createAlert({
      schoolId: incident.schoolId,
      ruleId: "sexual_any",
      ruleLabel: "Sexual incident reported - immediate review required",
      alertLevel: "red",
      victimId: incident.victimIds?.[0] || null,
      perpetratorIds: incident.perpetratorIds || [],
      linkedIncidentIds: [incident.id],
    });
    await notifyCoordinators(incident.schoolId, "Red alert: Sexual incident reported", incident.referenceNumber);
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
          await createAlert({
            schoolId: incident.schoolId,
            ruleId: "same_pair_escalating",
            ruleLabel: "Escalating pattern: same victim, multiple categories",
            alertLevel: "red",
            victimId,
            perpetratorIds: incident.perpetratorIds || [],
            linkedIncidentIds: recentVictimIncidents.map((i) => i.id),
          });
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
            gte(incidentsTable.createdAt, fourteenDaysAgo),
            sql`${perpId} = ANY(${incidentsTable.perpetratorIds})`
          )
        );

      if (recentPerpIncidents.length >= 2) {
        await createAlert({
          schoolId: incident.schoolId,
          ruleId: "same_perpetrator_2_incidents",
          ruleLabel: "Same perpetrator in 2+ incidents (14 days)",
          alertLevel: "amber",
          victimId: incident.victimIds?.[0] || null,
          perpetratorIds: [perpId],
          linkedIncidentIds: recentPerpIncidents.map((i) => i.id),
        });
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
        await createAlert({
          schoolId: incident.schoolId,
          ruleId: "emotional_distress_pattern",
          ruleLabel: "Emotional distress pattern detected (30 days)",
          alertLevel: "amber",
          victimId,
          perpetratorIds: [],
          linkedIncidentIds: distressIncidents.map((i) => i.id),
        });
      }
    }
  }
}

async function createAlert(data: {
  schoolId: string;
  ruleId: string;
  ruleLabel: string;
  alertLevel: string;
  victimId: string | null;
  perpetratorIds: string[];
  linkedIncidentIds: string[];
}) {
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

  if (data.alertLevel === "red") {
    await notifyCoordinators(data.schoolId, `Red Alert: ${data.ruleLabel}`, undefined);
  }
}

async function notifyCoordinators(schoolId: string, message: string, reference?: string) {
  const coordinators = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.schoolId, schoolId),
        inArray(usersTable.role, ["coordinator", "head_teacher"]),
        eq(usersTable.active, true)
      )
    );

  for (const coord of coordinators) {
    await db.insert(notificationsTable).values({
      schoolId,
      recipientId: coord.id,
      trigger: "pattern_alert",
      channel: "in_app",
      subject: "Pattern Alert",
      body: message,
      reference: reference || null,
      delivered: true,
    });
  }
}
