/**
 * seed-demo-content — fills the live Riverside demo school with realistic activity.
 *
 * The boot seed (api-server/src/lib/seed.ts) only creates school + users + codes,
 * so every dashboard shows 0 incidents / 0 messages / no behaviour. This script
 * adds the activity layer. It replaces the old seed-demo/seed-full pair, which
 * broke because they looked up placeholder pupils ("Boy A") that no longer exist.
 *
 * Resolution is by email (staff/parents, stable across seed generations) and by
 * pupil name (the live roster and the boot-seed roster share the same names).
 * Every section is guarded so the script is safe to re-run.
 */
import {
  db,
  usersTable,
  schoolLoginCodesTable,
  incidentsTable,
  protocolsTable,
  patternAlertsTable,
  notificationsTable,
  interviewsTable,
  caseTasksTable,
  messagesTable,
  auditLogTable,
  behaviourPointsTable,
  pupilDiaryTable,
  teacherPostsTable,
  lessonsTable,
  lessonProgressTable,
  voiceGroupsTable,
  voiceMembersTable,
  voiceSupportersTable,
} from "@workspace/db";
import { eq, and, asc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function hoursAgo(n: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}
function dateOnly(n: number): string {
  return daysAgo(n).toISOString().split("T")[0];
}
function incidentRef() {
  return `INC-${String(Math.floor(10000 + Math.random() * 90000))}`;
}
function protocolRef() {
  return `PRO-${String(Math.floor(10000 + Math.random() * 90000))}`;
}

async function main() {
  console.log("Seeding demo activity content for Riverside…\n");

  const allUsers = await db.select().from(usersTable);
  if (allUsers.length === 0) throw new Error("No users in DB — run the boot seed first.");
  const school = allUsers[0].schoolId;

  const byEmail = (email: string) => {
    const u = allUsers.find((u) => u.email === email);
    if (!u) throw new Error(`User not found: ${email}`);
    return u;
  };
  const pupil = (first: string, last: string) => {
    const u = allUsers.find((u) => u.role === "pupil" && u.firstName === first && u.lastName === last);
    if (!u) throw new Error(`Pupil not found: ${first} ${last}`);
    return u;
  };

  const coordinator = byEmail("coordinator@safeschool.dev");
  const headTeacher = byEmail("head@safeschool.dev");
  const headOfYear = byEmail("teacher@safeschool.dev"); // head_of_year, 6A
  const senco = byEmail("senco@safeschool.dev");
  const support = byEmail("support@safeschool.dev");
  const teacher5B = byEmail("teacher2@safeschool.dev");
  const teacher4A = byEmail("teacher3@safeschool.dev");
  const teacher3A = byEmail("teacher4@safeschool.dev");
  const parentA = byEmail("parent.a@safeschool.dev");
  const parentB = byEmail("parent.b@safeschool.dev");

  // Story cast (names exist in both the live roster and the boot seed)
  const daniel = pupil("Daniel", "Harris"); // 4A — victim of repeated incidents
  const jan = pupil("Jan", "Schmidt"); // 4A — perpetrator
  const lily = pupil("Lily", "Thompson"); // 4A — witness
  const alice = pupil("Alice", "Walker"); // 5B — online bullying victim
  const iris = pupil("Iris", "Young"); // 5B — anonymous reporter
  const mia = pupil("Mia", "Williams"); // 3A — welfare concern
  const carmen = pupil("Carmen", "Diaz"); // 5B — tier-3 safeguarding case
  const luna = pupil("Luna", "Martinez"); // 3A — exclusion (Parent A's child)
  const oliver = pupil("Oliver", "Smith"); // 3A — snack-taking victim (Parent B's child)
  const marco = pupil("Marco", "Ruiz"); // 4A — older child taking snacks
  const tomB = pupil("Tom", "Bakker"); // 4A — mocked when reading

  // ---------------------------------------------------------------- incidents
  const existingIncidents = await db
    .select()
    .from(incidentsTable)
    .where(eq(incidentsTable.schoolId, school));

  let incidents = existingIncidents;
  if (existingIncidents.length > 0) {
    console.log(`[incidents] ${existingIncidents.length} already present — skipping`);
  } else {
    const rows = [
      {
        referenceNumber: incidentRef(),
        schoolId: school,
        reporterId: daniel.id,
        reporterRole: "pupil",
        anonymous: false,
        category: "verbal",
        escalationTier: 1,
        safeguardingTrigger: false,
        incidentDate: dateOnly(14),
        location: "playground",
        description:
          "Someone in my class keeps calling me unkind names at break time. It makes me feel really upset and I don't want to go outside anymore.",
        victimIds: [daniel.id],
        perpetratorIds: [jan.id],
        personInvolvedText: "Jan Schmidt",
        witnessText: "Lily was nearby",
        emotionalState: "sad,scared",
        happeningToMe: true,
        happeningToSomeoneElse: false,
        iSawIt: false,
        status: "open",
      },
      {
        referenceNumber: incidentRef(),
        schoolId: school,
        reporterId: lily.id,
        reporterRole: "pupil",
        anonymous: false,
        category: "physical",
        escalationTier: 2,
        safeguardingTrigger: false,
        incidentDate: dateOnly(12),
        location: "corridor",
        description:
          "Someone bumped into Daniel on purpose in the corridor and he fell over. His knee got a scrape and it really hurt him.",
        victimIds: [daniel.id],
        perpetratorIds: [jan.id],
        personInvolvedText: "Jan Schmidt",
        emotionalState: "worried",
        happeningToMe: false,
        happeningToSomeoneElse: true,
        iSawIt: true,
        status: "open",
      },
      {
        referenceNumber: incidentRef(),
        schoolId: school,
        reporterId: teacher4A.id,
        reporterRole: "teacher",
        anonymous: false,
        category: "verbal,psychological",
        escalationTier: 2,
        safeguardingTrigger: false,
        incidentDate: dateOnly(10),
        location: "classroom",
        description:
          "Observed Jan leaving Daniel out of group work on purpose and saying unkind things to him. Daniel looked upset. This is the third time I have noticed this happening between them.",
        victimIds: [daniel.id],
        perpetratorIds: [jan.id],
        childrenSeparated: true,
        coordinatorNotified: true,
        immediateActionTaken:
          "Moved pupils to different groups. Spoke with both children. Logged with coordinator.",
        partOfKnownPattern: true,
        status: "investigating",
      },
      {
        referenceNumber: incidentRef(),
        schoolId: school,
        reporterId: iris.id,
        reporterRole: "pupil",
        anonymous: true,
        category: "online",
        escalationTier: 2,
        safeguardingTrigger: false,
        incidentDate: dateOnly(8),
        location: "online",
        description:
          "Someone made a group chat and they are writing unkind things about a girl in my class. They are sharing things to upset her and it is not fair.",
        victimIds: [alice.id],
        personInvolvedText: "Some people in Y5",
        emotionalState: "worried,confused",
        happeningToMe: false,
        happeningToSomeoneElse: true,
        iSawIt: true,
        status: "submitted",
      },
      {
        referenceNumber: incidentRef(),
        schoolId: school,
        reporterId: oliver.id,
        reporterRole: "pupil",
        anonymous: false,
        category: "physical",
        escalationTier: 2,
        safeguardingTrigger: false,
        incidentDate: dateOnly(7),
        location: "playground",
        description:
          "An older child keeps taking my snack at break time and won't give it back. When I ask for it back they push me away.",
        victimIds: [oliver.id],
        perpetratorIds: [marco.id],
        personInvolvedText: "Marco from Y4",
        emotionalState: "scared,sad",
        happeningToMe: true,
        happeningToSomeoneElse: false,
        iSawIt: false,
        status: "open",
      },
      {
        referenceNumber: incidentRef(),
        schoolId: school,
        reporterId: teacher3A.id,
        reporterRole: "teacher",
        anonymous: false,
        category: "neglect",
        escalationTier: 2,
        safeguardingTrigger: true,
        incidentDate: dateOnly(6),
        location: "classroom",
        description:
          "Mia has arrived at school without a coat or warm clothes several times this term. She seemed tired and hungry this morning. I want to make sure she is getting the support she needs.",
        victimIds: [mia.id],
        childrenSeparated: false,
        coordinatorNotified: true,
        immediateActionTaken:
          "Offered breakfast from the school kitchen. Notified coordinator so we can check in with the family.",
        toldByChild: false,
        status: "escalated",
      },
      {
        referenceNumber: incidentRef(),
        schoolId: school,
        reporterId: coordinator.id,
        reporterRole: "coordinator",
        anonymous: false,
        category: "safeguarding",
        escalationTier: 3,
        safeguardingTrigger: true,
        incidentDate: dateOnly(5),
        location: "other",
        description:
          "Following a staff referral, a safeguarding concern has been raised for Carmen. The school is following the correct steps to make sure she is safe and supported. LOPIVI protocol started. External support has been contacted.",
        victimIds: [carmen.id],
        childrenSeparated: true,
        coordinatorNotified: true,
        immediateActionTaken:
          "Made sure the child feels safe at school. Contacted the right people for help.",
        toldByChild: true,
        childConsentToShare: true,
        formalResponseRequested: true,
        requestExternalReferral: true,
        confidentialFlag: true,
        status: "escalated",
      },
      {
        referenceNumber: incidentRef(),
        schoolId: school,
        reporterId: luna.id,
        reporterRole: "pupil",
        anonymous: false,
        category: "exclusion",
        escalationTier: 1,
        safeguardingTrigger: false,
        incidentDate: dateOnly(4),
        location: "classroom",
        description:
          "The other children won't let me join in their games at play time. They walk away when I come over. It happens nearly every day and it makes me feel lonely.",
        victimIds: [luna.id],
        emotionalState: "sad,lonely",
        happeningToMe: true,
        happeningToSomeoneElse: false,
        iSawIt: false,
        status: "submitted",
      },
      {
        referenceNumber: incidentRef(),
        schoolId: school,
        reporterId: daniel.id,
        reporterRole: "pupil",
        anonymous: false,
        category: "verbal,physical",
        escalationTier: 2,
        safeguardingTrigger: false,
        incidentDate: dateOnly(3),
        location: "playground",
        description:
          "The same person pushed me again today at break. They told me not to tell anyone. I feel worried about coming to school.",
        victimIds: [daniel.id],
        perpetratorIds: [jan.id],
        personInvolvedText: "Jan Schmidt",
        emotionalState: "scared,angry,sad",
        happeningToMe: true,
        happeningToSomeoneElse: false,
        iSawIt: false,
        status: "submitted",
      },
      {
        referenceNumber: incidentRef(),
        schoolId: school,
        reporterId: tomB.id,
        reporterRole: "pupil",
        anonymous: true,
        category: "psychological",
        escalationTier: 2,
        safeguardingTrigger: false,
        incidentDate: dateOnly(2),
        location: "classroom",
        description:
          "Some children keep laughing when I read out loud in class. They copy my voice afterwards. It makes me feel embarrassed and I don't want to read anymore.",
        victimIds: [tomB.id],
        emotionalState: "embarrassed,sad",
        happeningToMe: true,
        happeningToSomeoneElse: false,
        iSawIt: false,
        status: "submitted",
      },
      {
        referenceNumber: incidentRef(),
        schoolId: school,
        reporterId: teacher4A.id,
        reporterRole: "teacher",
        anonymous: false,
        category: "physical,verbal",
        escalationTier: 2,
        safeguardingTrigger: false,
        incidentDate: dateOnly(1),
        location: "playground",
        description:
          "Pattern follow-up: Jan was involved in another incident with Daniel at morning break. Jan pushed Daniel. Other children saw it happen. This is the fourth time this has been reported in 2 weeks. Requesting that the Convivèxit process is started.",
        victimIds: [daniel.id],
        perpetratorIds: [jan.id],
        childrenSeparated: true,
        coordinatorNotified: true,
        immediateActionTaken:
          "Children separated. Jan given a different break area while we look into this.",
        partOfKnownPattern: true,
        formalResponseRequested: true,
        status: "investigating",
      },
    ];

    incidents = [];
    for (const inc of rows) {
      const [created] = await db.insert(incidentsTable).values(inc as any).returning();
      incidents.push(created);
    }
    console.log(`[incidents] created ${incidents.length}`);

    // Assessments + parent-visible summaries on the key arcs
    const danielPattern = incidents.filter(
      (i) => i.victimIds?.includes(daniel.id) && i.status === "investigating"
    );
    for (const inc of danielPattern) {
      await db
        .update(incidentsTable)
        .set({
          assessedBy: teacher4A.id,
          assessedAt: daysAgo(0),
          staffNotes:
            "Observed repeated pattern of unkind behaviour from Jan towards Daniel. I have personally witnessed two incidents. Daniel is becoming reluctant to come to school. Convivèxit protocol now in progress.",
          witnessStatements: [
            {
              witnessName: "Lily Thompson",
              statement:
                "I saw Jan push Daniel on the playground during break. Daniel fell over and looked really upset.",
              recordedAt: daysAgo(3).toISOString(),
              recordedBy: "Class teacher (4A)",
            },
          ],
          parentSummary:
            "We are aware of some difficulties your child has been having with another pupil. The school is taking this seriously and has started a formal process to make sure things improve. We will keep you updated.",
          parentVisible: true,
          addedToFile: true,
        })
        .where(eq(incidentsTable.id, inc.id));
    }

    const miaIncident = incidents.find((i) => i.victimIds?.includes(mia.id));
    if (miaIncident) {
      await db
        .update(incidentsTable)
        .set({
          assessedBy: teacher3A.id,
          assessedAt: daysAgo(4),
          staffNotes:
            "Mia has shown signs of neglect on several occasions this term. Arrived without a coat in cold weather, appeared tired. Offered breakfast. Reported to coordinator for further monitoring.",
          parentSummary:
            "The school has noticed that your child may need some extra support. We want to work with you to make sure she is happy and well looked after. Please don't hesitate to contact us.",
          parentVisible: true,
          addedToFile: true,
        })
        .where(eq(incidentsTable.id, miaIncident.id));
    }

    const lunaIncident = incidents.find((i) => i.victimIds?.includes(luna.id));
    if (lunaIncident) {
      await db
        .update(incidentsTable)
        .set({
          assessedBy: teacher3A.id,
          assessedAt: daysAgo(2),
          staffNotes:
            "Spoke with Luna and the group involved. Set up a buddy arrangement at play time and the class is doing a friendship circle this week. Will monitor.",
          parentSummary:
            "Luna told us she has been feeling left out at play time. We have spoken with the children involved and set up a buddy system so she always has someone to play with. We will keep an eye on how she is getting on.",
          parentVisible: true,
          addedToFile: true,
        })
        .where(eq(incidentsTable.id, lunaIncident.id));
    }
    console.log("[incidents] assessed key incidents with parent-visible summaries");
  }

  const danielIncidents = incidents.filter(
    (i) => i.victimIds?.includes(daniel.id) && i.perpetratorIds?.includes(jan.id)
  );
  const carmenIncident = incidents.find((i) => i.victimIds?.includes(carmen.id));
  const miaIncident = incidents.find((i) => i.victimIds?.includes(mia.id));

  // ---------------------------------------------------------------- protocols
  const existingProtocols = await db
    .select()
    .from(protocolsTable)
    .where(eq(protocolsTable.schoolId, school));

  let convivexit = existingProtocols.find((p) => p.protocolType === "convivexit");
  let lopivi = existingProtocols.find((p) => p.protocolType === "lopivi");

  if (existingProtocols.length > 0) {
    console.log(`[protocols] ${existingProtocols.length} already present — skipping`);
  } else {
    [convivexit] = await db
      .insert(protocolsTable)
      .values({
        referenceNumber: protocolRef(),
        schoolId: school,
        openedBy: coordinator.id,
        openedAt: daysAgo(1),
        protocolType: "convivexit",
        protocolSource: "pattern_detection",
        genderBasedViolence: false,
        context:
          "Repeated incidents of physical and verbal aggression by Jan towards Daniel over a 2-week period. Four separate reports received from pupils and staff. Convivèxit protocol initiated following class teacher recommendation.",
        linkedIncidentIds: danielIncidents.map((i) => i.id),
        victimId: daniel.id,
        allegedPerpetratorIds: [jan.id],
        parentNotificationSent: true,
        parentNotificationAt: daysAgo(1),
        interviewsRequired: true,
        riskLevel: "medium",
        riskFactors: ["repeated_behaviour", "physical_aggression", "victim_distress", "escalating_severity"],
        protectiveFactors: ["victim_has_friends", "school_awareness"],
        protectiveMeasures: ["separate_break_areas", "increased_supervision", "class_group_change"],
        externalReferralRequired: false,
        status: "open",
      } as any)
      .returning()
      .then((r) => r);
    console.log(`[protocols] Convivèxit ${convivexit!.referenceNumber}`);

    [lopivi] = await db
      .insert(protocolsTable)
      .values({
        referenceNumber: protocolRef(),
        schoolId: school,
        openedBy: coordinator.id,
        openedAt: daysAgo(4),
        protocolType: "lopivi",
        protocolSource: "staff_report",
        genderBasedViolence: false,
        context:
          "Safeguarding concern raised for Carmen following teacher referral. LOPIVI duty to report activated. Child has disclosed information that requires formal investigation and external support. Immediate protective measures implemented.",
        linkedIncidentIds: carmenIncident ? [carmenIncident.id] : [],
        victimId: carmen.id,
        allegedPerpetratorIds: [],
        parentNotificationSent: true,
        parentNotificationAt: daysAgo(3),
        interviewsRequired: true,
        riskLevel: "high",
        riskFactors: ["child_disclosure", "external_risk", "ongoing_concern", "emotional_impact"],
        protectiveFactors: ["child_trusts_school", "family_engagement"],
        protectiveMeasures: ["designated_safe_adult", "daily_check_in", "external_support_referral"],
        externalReferralRequired: true,
        externalReferralBody: "Fiscalía de Menores de Palma",
        externalReferralAt: daysAgo(3),
        status: "open",
      } as any)
      .returning()
      .then((r) => r);
    console.log(`[protocols] LOPIVI ${lopivi!.referenceNumber}`);

    for (const inc of danielIncidents) {
      await db.update(incidentsTable).set({ protocolId: convivexit!.id }).where(eq(incidentsTable.id, inc.id));
    }
    if (carmenIncident) {
      await db.update(incidentsTable).set({ protocolId: lopivi!.id }).where(eq(incidentsTable.id, carmenIncident.id));
    }

    await db.insert(interviewsTable).values([
      {
        protocolId: convivexit!.id,
        schoolId: school,
        intervieweeId: daniel.id,
        intervieweeRole: "victim",
        conductedBy: coordinator.id,
        interviewDate: dateOnly(1),
        summary:
          "Daniel described feeling scared and upset. He said Jan has been calling him names and pushing him for about two weeks. He is worried about coming to school and doesn't want to go outside at break time. He feels safe with his class teacher and wants the behaviour to stop.",
        annexReference: "ANNEX-II",
      },
      {
        protocolId: convivexit!.id,
        schoolId: school,
        intervieweeId: jan.id,
        intervieweeRole: "perpetrator",
        conductedBy: coordinator.id,
        interviewDate: dateOnly(1),
        summary:
          "Jan acknowledged pushing Daniel but said he was 'just playing'. When asked about the name-calling, he said 'everyone does it'. He was reminded of the school's kindness expectations. He agreed to try to be kinder but seemed reluctant.",
        annexReference: "ANNEX-II",
      },
      {
        protocolId: convivexit!.id,
        schoolId: school,
        intervieweeId: lily.id,
        intervieweeRole: "witness",
        conductedBy: teacher4A.id,
        interviewDate: dateOnly(0),
        summary:
          "Lily confirmed she saw Jan push Daniel on the playground. She said it has happened several times and that Daniel looks upset afterwards. She also heard Jan calling him names in the corridor.",
        annexReference: "ANNEX-II",
      },
      {
        protocolId: lopivi!.id,
        schoolId: school,
        intervieweeId: carmen.id,
        intervieweeRole: "victim",
        conductedBy: coordinator.id,
        interviewDate: dateOnly(3),
        summary:
          "Confidential interview conducted with appropriate safeguards. Carmen felt safe to share her concerns. She was reassured that the school will help keep her safe. Notes filed under confidential protocol records.",
        annexReference: "LOP-I",
      },
    ] as any);
    console.log("[protocols] 4 interviews created");

    await db.insert(caseTasksTable).values([
      {
        schoolId: school,
        protocolId: convivexit!.id,
        taskType: "interview",
        title: "Meet Jan's parents",
        description:
          "Arrange a meeting with Jan's parents to discuss the pattern of behaviour and agree on next steps together.",
        assigneeId: coordinator.id,
        priority: "high",
        status: "pending",
        dueAt: daysAgo(0),
      },
      {
        schoolId: school,
        protocolId: convivexit!.id,
        taskType: "protective_measure",
        title: "Implement separate break-time areas",
        description:
          "Ensure Daniel and Jan have separate designated areas during break and lunch for at least 2 weeks.",
        assigneeId: teacher4A.id,
        priority: "high",
        status: "completed",
        completedAt: daysAgo(0),
        completedBy: teacher4A.id,
        notes: "Arrangements in place. Jan assigned to the library area during morning break.",
      },
      {
        schoolId: school,
        protocolId: convivexit!.id,
        taskType: "follow_up",
        title: "Check in with Daniel daily",
        description:
          "Daily wellbeing check-in with Daniel for the next two weeks to monitor his emotional state and ensure he feels safe.",
        assigneeId: teacher4A.id,
        priority: "normal",
        status: "in_progress",
        dueAt: daysAgo(-14),
      },
      {
        schoolId: school,
        protocolId: lopivi!.id,
        taskType: "external_referral",
        title: "Confirm receipt of referral to Fiscalía de Menores",
        description:
          "Follow up with Fiscalía de Menores de Palma to confirm they received the LOPIVI referral and obtain a case reference number.",
        assigneeId: coordinator.id,
        priority: "urgent",
        status: "pending",
        dueAt: daysAgo(-1),
      },
      {
        schoolId: school,
        protocolId: lopivi!.id,
        taskType: "protective_measure",
        title: "Assign designated safe adult for Carmen",
        description:
          "SENCO to be Carmen's designated safe adult for daily check-ins and to provide a safe space if she feels overwhelmed.",
        assigneeId: senco.id,
        priority: "high",
        status: "completed",
        completedAt: daysAgo(2),
        completedBy: senco.id,
        notes: "Carmen knows she can come to the SENCO office at any time. Morning check-in established.",
      },
      {
        schoolId: school,
        protocolId: convivexit!.id,
        taskType: "documentation",
        title: "Complete Annex III conclusions report",
        description:
          "Write up the investigation conclusions report (Annex III) based on all interviews conducted and evidence gathered.",
        assigneeId: coordinator.id,
        priority: "normal",
        status: "pending",
        dueAt: daysAgo(-5),
      },
      {
        schoolId: school,
        protocolId: lopivi!.id,
        taskType: "parent_notification",
        title: "Schedule follow-up meeting with Carmen's family",
        description:
          "Arrange a second meeting with Carmen's parents to update on progress and agree continued support measures.",
        assigneeId: headTeacher.id,
        priority: "normal",
        status: "pending",
        dueAt: daysAgo(-3),
      },
    ] as any);
    console.log("[protocols] 7 case tasks created");

    await db.insert(auditLogTable).values([
      {
        schoolId: school,
        eventType: "protocol_opened",
        actorRole: "coordinator",
        actorId: coordinator.id,
        targetType: "protocol",
        targetId: convivexit!.id,
        details: { protocolType: "convivexit", victimName: "Daniel Harris", referenceNumber: convivexit!.referenceNumber },
      },
      {
        schoolId: school,
        eventType: "protocol_opened",
        actorRole: "coordinator",
        actorId: coordinator.id,
        targetType: "protocol",
        targetId: lopivi!.id,
        details: { protocolType: "lopivi", victimName: "Carmen Diaz", referenceNumber: lopivi!.referenceNumber },
      },
      {
        schoolId: school,
        eventType: "external_referral_sent",
        actorRole: "coordinator",
        actorId: coordinator.id,
        targetType: "protocol",
        targetId: lopivi!.id,
        details: { referralBody: "Fiscalía de Menores de Palma", referenceNumber: lopivi!.referenceNumber },
      },
      {
        schoolId: school,
        eventType: "interview_conducted",
        actorRole: "coordinator",
        actorId: coordinator.id,
        targetType: "protocol",
        targetId: convivexit!.id,
        details: { intervieweeRole: "victim", intervieweeName: "Daniel Harris" },
      },
      {
        schoolId: school,
        eventType: "alert_reviewed",
        actorRole: "coordinator",
        actorId: coordinator.id,
        targetType: "alert",
        details: { alertType: "online_bullying", victimName: "Alice Walker", status: "reviewed" },
      },
    ] as any);
    console.log("[protocols] 5 audit log entries created");
  }

  // ------------------------------------------------------------ pattern alerts
  const [{ count: alertCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(patternAlertsTable)
    .where(eq(patternAlertsTable.schoolId, school));
  if (alertCount > 0) {
    console.log(`[alerts] ${alertCount} already present — skipping`);
  } else {
    await db.insert(patternAlertsTable).values([
      {
        schoolId: school,
        ruleId: "repeated_perpetrator",
        ruleLabel: "Repeated Perpetrator — Same child involved in 4+ incidents",
        alertLevel: "red",
        victimId: daniel.id,
        perpetratorIds: [jan.id],
        linkedIncidentIds: danielIncidents.map((i) => i.id),
        triggeredAt: daysAgo(1),
        status: "open",
        notes:
          "Jan has been identified as the perpetrator in 4 incidents targeting Daniel over a 14-day period. Pattern escalating from verbal to physical aggression.",
      },
      {
        schoolId: school,
        ruleId: "welfare_concern",
        ruleLabel: "Welfare Concern — Safeguarding trigger flagged by staff",
        alertLevel: "amber",
        victimId: mia.id,
        perpetratorIds: [] as string[],
        linkedIncidentIds: miaIncident ? [miaIncident.id] : [],
        triggeredAt: daysAgo(5),
        status: "open",
        notes:
          "Class teacher raised a welfare concern for Mia — arriving without proper clothing, appearing tired and hungry. Possible neglect indicators.",
      },
      {
        schoolId: school,
        ruleId: "multi_victim_online",
        ruleLabel: "Online Bullying — Multiple pupils affected by group chat",
        alertLevel: "amber",
        victimId: alice.id,
        perpetratorIds: [] as string[],
        linkedIncidentIds: incidents.filter((i) => i.category?.includes("online")).map((i) => i.id),
        triggeredAt: daysAgo(7),
        reviewedAt: daysAgo(6),
        reviewedBy: coordinator.id,
        status: "reviewed",
        notes:
          "Anonymous report of an unkind group chat targeting a Year 5 pupil. Coordinator reviewed and monitoring. Parents informed.",
      },
    ] as any);
    console.log("[alerts] 3 pattern alerts created");
  }

  // ---------------------------------------------------------------- messages
  const [{ count: msgCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(eq(messagesTable.schoolId, school));
  if (msgCount > 0) {
    console.log(`[messages] ${msgCount} already present — skipping`);
  } else {
    const send = async (m: any) => {
      const [row] = await db.insert(messagesTable).values(m).returning();
      return row;
    };

    const m1 = await send({
      schoolId: school,
      senderId: daniel.id,
      recipientId: teacher4A.id,
      senderRole: "pupil",
      priority: "important",
      type: "message",
      body: "I don't want to go outside at break time today. Can I stay inside please?",
      createdAt: daysAgo(3),
      readAt: daysAgo(3),
    });
    await send({
      schoolId: school,
      senderId: teacher4A.id,
      recipientId: daniel.id,
      senderRole: "teacher",
      priority: "normal",
      type: "message",
      body: "Of course you can. Come to the library at break time and I'll check in with you. You're doing the right thing by telling me.",
      parentMessageId: m1.id,
      createdAt: daysAgo(3),
      readAt: daysAgo(3),
    });

    const m2 = await send({
      schoolId: school,
      senderId: daniel.id,
      recipientId: teacher4A.id,
      senderRole: "pupil",
      priority: "normal",
      type: "chat_request",
      body: "Can I talk to you about something? I'm feeling worried.",
      createdAt: daysAgo(2),
      readAt: daysAgo(2),
    });
    await send({
      schoolId: school,
      senderId: teacher4A.id,
      recipientId: daniel.id,
      senderRole: "teacher",
      priority: "normal",
      type: "message",
      body: "Yes, absolutely. Come find me at the start of lunch and we can have a chat in the quiet room. I'm here for you.",
      parentMessageId: m2.id,
      createdAt: daysAgo(2),
      readAt: daysAgo(1),
    });

    const m3 = await send({
      schoolId: school,
      senderId: carmen.id,
      recipientId: senco.id,
      senderRole: "pupil",
      priority: "urgent",
      type: "urgent_help",
      body: "I need to talk to someone right now please",
      location: "Classroom",
      createdAt: daysAgo(5),
      readAt: daysAgo(5),
    });
    await send({
      schoolId: school,
      senderId: senco.id,
      recipientId: carmen.id,
      senderRole: "senco",
      priority: "normal",
      type: "message",
      body: "I'm coming to you right now. Stay where you are, I'll be there in 2 minutes. You're safe.",
      parentMessageId: m3.id,
      createdAt: daysAgo(5),
      readAt: daysAgo(5),
    });

    await send({
      schoolId: school,
      senderId: lily.id,
      recipientId: teacher4A.id,
      senderRole: "pupil",
      priority: "normal",
      type: "message",
      body: "I saw something unkind happening to Daniel again today. I wanted to tell you.",
      createdAt: daysAgo(1),
      readAt: daysAgo(1),
    });

    await send({
      schoolId: school,
      senderId: oliver.id,
      recipientId: teacher3A.id,
      senderRole: "pupil",
      priority: "important",
      type: "message",
      body: "Someone keeps taking my things and I don't know what to do.",
      createdAt: daysAgo(4),
    });

    const m4 = await send({
      schoolId: school,
      senderId: mia.id,
      recipientId: support.id,
      senderRole: "pupil",
      priority: "normal",
      type: "message",
      body: "I forgot my lunch again. Can I get some food from the kitchen?",
      createdAt: daysAgo(2),
      readAt: daysAgo(2),
    });
    await send({
      schoolId: school,
      senderId: support.id,
      recipientId: mia.id,
      senderRole: "support_staff",
      priority: "normal",
      type: "message",
      body: "Yes of course, come to the kitchen at lunch time and we'll sort you out. You don't need to worry about that.",
      parentMessageId: m4.id,
      createdAt: daysAgo(2),
      readAt: daysAgo(1),
    });

    const m5 = await send({
      schoolId: school,
      senderId: daniel.id,
      recipientId: coordinator.id,
      senderRole: "pupil",
      priority: "important",
      type: "message",
      body: "Are you the person who can help make things better? My teacher said I could talk to you.",
      createdAt: daysAgo(1),
      readAt: daysAgo(1),
    });
    await send({
      schoolId: school,
      senderId: coordinator.id,
      recipientId: daniel.id,
      senderRole: "coordinator",
      priority: "normal",
      type: "message",
      body: "Yes, I'm here to help. Your teacher told me what's been happening and we're going to make sure things get better. You were very brave to speak up.",
      parentMessageId: m5.id,
      createdAt: daysAgo(1),
      readAt: hoursAgo(12),
    });

    await send({
      schoolId: school,
      senderId: teacher4A.id,
      recipientId: coordinator.id,
      senderRole: "teacher",
      priority: "important",
      type: "message",
      body: "Just wanted to flag — Daniel was very upset at morning registration today. He said he doesn't want to go outside at all anymore. I think we need to move quickly on the Convivèxit process.",
      createdAt: daysAgo(1),
      readAt: daysAgo(1),
    });

    await send({
      schoolId: school,
      senderId: luna.id,
      recipientId: teacher3A.id,
      senderRole: "pupil",
      priority: "normal",
      type: "message",
      body: "Thank you for helping me find someone to play with today. It was much better.",
      createdAt: daysAgo(1),
      readAt: hoursAgo(20),
    });

    console.log("[messages] 14 messages created (6 conversations with replies)");
  }

  // ----------------------------------------------------------- behaviour points
  const [{ count: bpCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(behaviourPointsTable)
    .where(eq(behaviourPointsTable.schoolId, school));
  if (bpCount > 0) {
    console.log(`[behaviour] ${bpCount} already present — skipping`);
  } else {
    await db.insert(behaviourPointsTable).values([
      {
        schoolId: school,
        pupilId: jan.id,
        points: 2,
        reason: "Repeated name-calling towards another pupil at break time",
        category: "verbal",
        issuedBy: teacher4A.id,
        issuedAt: daysAgo(10),
        note: "Spoken to about kindness expectations. Parents informed.",
      },
      {
        schoolId: school,
        pupilId: jan.id,
        points: 3,
        reason: "Pushed another pupil in the corridor causing a fall",
        category: "physical",
        issuedBy: teacher4A.id,
        issuedAt: daysAgo(7),
        note: "Incident logged and coordinator notified.",
      },
      {
        schoolId: school,
        pupilId: jan.id,
        points: 3,
        reason: "Continued targeting of the same pupil — part of a known pattern",
        category: "bullying",
        issuedBy: coordinator.id,
        issuedAt: daysAgo(1),
        note: "Linked to open Convivèxit protocol. Meeting with parents being arranged.",
      },
      {
        schoolId: school,
        pupilId: marco.id,
        points: 3,
        reason: "Taking a younger pupil's snack and pushing him away",
        category: "physical",
        issuedBy: teacher3A.id,
        issuedAt: daysAgo(6),
        note: "Apologised to the younger pupil. Break-time supervision increased.",
      },
      {
        schoolId: school,
        pupilId: pupil("Alejandro", "Ramos").id,
        points: 1,
        reason: "Repeatedly talking over the teacher during maths",
        category: "disruption",
        issuedBy: teacher4A.id,
        issuedAt: daysAgo(9),
      },
      {
        schoolId: school,
        pupilId: pupil("Noah", "King").id,
        points: 1,
        reason: "Refused to line up after break despite repeated instructions",
        category: "defiance",
        issuedBy: teacher5B.id,
        issuedAt: daysAgo(8),
      },
      {
        schoolId: school,
        pupilId: pupil("Antonio", "Suarez").id,
        points: 2,
        reason: "Unkind comments in a class group chat",
        category: "online",
        issuedBy: headOfYear.id,
        issuedAt: daysAgo(5),
        note: "Discussed digital kindness. Parents informed.",
      },
      {
        schoolId: school,
        pupilId: pupil("Jack", "Wright").id,
        points: 1,
        reason: "Disrupting the lesson by throwing paper",
        category: "disruption",
        issuedBy: headOfYear.id,
        issuedAt: daysAgo(3),
      },
      {
        schoolId: school,
        pupilId: pupil("Diego", "Torres").id,
        points: 1,
        reason: "Drawing on a classmate's workbook",
        category: "property",
        issuedBy: teacher3A.id,
        issuedAt: daysAgo(2),
      },
    ] as any);
    console.log("[behaviour] 9 behaviour point entries created");
  }

  // ---------------------------------------------------------------- notifications
  const [{ count: notifCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(eq(notificationsTable.schoolId, school));
  if (notifCount > 0) {
    console.log(`[notifications] ${notifCount} already present — skipping`);
  } else {
    const ref = (p?: { referenceNumber: string } | null) => p?.referenceNumber;
    await db.insert(notificationsTable).values(
      [
        {
          recipientId: coordinator.id,
          trigger: "pattern_detected",
          subject: "Pattern Alert: Jan Schmidt — Repeated Perpetrator",
          body: "The system has detected a pattern: Jan has been involved as perpetrator in 4 incidents over the past 14 days, all targeting Daniel. Alert level: RED. Immediate review recommended.",
          sentAt: daysAgo(1),
        },
        {
          recipientId: coordinator.id,
          trigger: "incident_escalated",
          subject: "Incident Escalated — Daniel Harris (verbal/physical)",
          body: "An incident involving Daniel has been escalated to tier 2. This is the third report involving the same perpetrator. Please review and consider initiating a formal protocol.",
          reference: danielIncidents[0]?.referenceNumber,
          sentAt: daysAgo(10),
        },
        {
          recipientId: coordinator.id,
          trigger: "safeguarding_trigger",
          subject: "Safeguarding Trigger — Mia Williams (welfare concern)",
          body: "A class teacher has flagged a safeguarding concern for Mia. The child has arrived at school without appropriate clothing on multiple occasions and appeared tired and hungry. Please review and consider appropriate support.",
          reference: miaIncident?.referenceNumber,
          sentAt: daysAgo(6),
          acknowledgedAt: daysAgo(5),
        },
        {
          recipientId: coordinator.id,
          trigger: "protocol_opened",
          subject: `Convivèxit Protocol Opened — ${ref(convivexit) ?? ""}`,
          body: `A Convivèxit protocol has been opened for the repeated incidents involving Daniel (victim) and Jan (alleged perpetrator). Reference: ${ref(convivexit) ?? "n/a"}. Interviews are required.`,
          reference: ref(convivexit),
          sentAt: daysAgo(1),
        },
        {
          recipientId: headTeacher.id,
          trigger: "protocol_opened",
          subject: `LOPIVI Protocol Opened — ${ref(lopivi) ?? ""}`,
          body: `A LOPIVI safeguarding protocol has been opened for Carmen. External referral to Fiscalía de Menores has been initiated. Reference: ${ref(lopivi) ?? "n/a"}.`,
          reference: ref(lopivi),
          sentAt: daysAgo(4),
          acknowledgedAt: daysAgo(4),
        },
        {
          recipientId: headTeacher.id,
          trigger: "external_referral",
          subject: "External Referral Sent — Fiscalía de Menores",
          body: "An external referral has been sent to the Fiscalía de Menores de Palma regarding the safeguarding case for Carmen. Awaiting confirmation of receipt.",
          reference: ref(lopivi),
          sentAt: daysAgo(3),
        },
        {
          recipientId: headTeacher.id,
          trigger: "pattern_detected",
          subject: "Pattern Alert: Welfare Concern — Mia Williams",
          body: "A welfare alert has been raised for Mia. Staff have observed signs that may indicate a safeguarding concern. The alert has been raised to amber level for coordinator review.",
          sentAt: daysAgo(5),
        },
        {
          recipientId: teacher4A.id,
          trigger: "task_assigned",
          subject: "Task Assigned: Check in with Daniel daily",
          body: "You have been assigned a new task related to the Convivèxit protocol. Please conduct daily wellbeing check-ins with Daniel for the next two weeks.",
          reference: ref(convivexit),
          sentAt: daysAgo(1),
        },
        {
          recipientId: teacher4A.id,
          trigger: "incident_reported",
          subject: "New Incident Report — Your class (Daniel Harris)",
          body: "A new incident has been reported involving a pupil in your class (Daniel). The incident is categorised as verbal/physical and has been flagged as part of a known pattern.",
          sentAt: daysAgo(3),
          acknowledgedAt: daysAgo(3),
        },
        {
          recipientId: senco.id,
          trigger: "task_assigned",
          subject: "Task Assigned: Designated safe adult for Carmen",
          body: "You have been assigned as the designated safe adult for Carmen under the LOPIVI protocol. Please establish daily check-ins and ensure she has access to a safe space.",
          reference: ref(lopivi),
          sentAt: daysAgo(4),
          acknowledgedAt: daysAgo(3),
        },
        {
          recipientId: teacher3A.id,
          trigger: "incident_acknowledged",
          subject: "Your Safeguarding Report Acknowledged",
          body: "Your safeguarding report regarding Mia has been received and acknowledged by the Safeguarding Coordinator. Appropriate support measures are being put in place. Thank you for raising this concern.",
          sentAt: daysAgo(5),
          acknowledgedAt: daysAgo(5),
        },
        {
          recipientId: coordinator.id,
          trigger: "incident_reported",
          subject: "New Anonymous Report — Online Bullying",
          body: "An anonymous report has been submitted regarding online bullying involving a group chat. The reporter states unkind messages are being shared about a Year 5 pupil. Please review.",
          sentAt: daysAgo(8),
          acknowledgedAt: daysAgo(7),
        },
        {
          recipientId: coordinator.id,
          trigger: "task_overdue",
          subject: "Overdue Task: Meet Jan's parents",
          body: "The task 'Meet Jan's parents' is now overdue. Please schedule this meeting as soon as possible.",
          reference: ref(convivexit),
          sentAt: hoursAgo(6),
        },
        {
          recipientId: support.id,
          trigger: "alert_raised",
          subject: "New Alert: Repeated behaviour pattern detected",
          body: "A pattern of repeated behaviour has been detected involving pupils in your school. Please be aware and maintain increased supervision during unstructured times.",
          sentAt: daysAgo(1),
        },
        {
          recipientId: parentA.id,
          trigger: "parent_update",
          subject: "Update about your child's wellbeing",
          body: "Luna told her teacher she has been feeling left out at play time. We have set up a buddy system and the class is doing a friendship circle this week. A summary has been added to your dashboard.",
          sentAt: daysAgo(2),
        },
        {
          recipientId: parentB.id,
          trigger: "incident_shared",
          subject: "New information shared with you",
          body: "A staff member has shared an update about an incident involving your child. You can view the details on your dashboard. Please contact the school if you have any questions.",
          sentAt: daysAgo(1),
        },
      ].map((n) => ({ ...n, schoolId: school, delivered: true })) as any
    );
    console.log("[notifications] 16 notifications created");
  }

  // ---------------------------------------------------------------- pupil diary
  const [{ count: diaryCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pupilDiaryTable)
    .where(eq(pupilDiaryTable.schoolId, school));
  if (diaryCount > 0) {
    console.log(`[diary] ${diaryCount} already present — skipping`);
  } else {
    const entries = [
      // Daniel — the arc the staff side is responding to
      { pupilId: daniel.id, mood: 4, note: "Played basketball at break. Our team won 12-8. I'm not very tall but I'm quick so I'm good at stealing the ball.", createdAt: daysAgo(16) },
      { pupilId: daniel.id, mood: 3, note: "Someone keeps saying things about me at break. I tried to ignore it.", createdAt: daysAgo(13) },
      { pupilId: daniel.id, mood: 2, note: "It happened again today. I don't want to go outside at break anymore.", createdAt: daysAgo(9) },
      { pupilId: daniel.id, mood: 2, note: "I told my teacher what's been happening. She really listened. I hope it gets better now.", createdAt: daysAgo(3) },
      { pupilId: daniel.id, mood: 3, note: "Talked to the coordinator today. She said I was brave. Break time was OK because I stayed in the library.", createdAt: daysAgo(1) },
      // Luna — exclusion arc (Parent A's child)
      { pupilId: luna.id, mood: 3, note: "No one wanted me on their team today.", createdAt: daysAgo(8) },
      { pupilId: luna.id, mood: 2, note: "They won't let me join in. I sat alone at lunch.", createdAt: daysAgo(5) },
      { pupilId: luna.id, mood: 4, note: "My teacher set up a buddy system and today I played with Sofia all break. It was fun!", createdAt: daysAgo(1) },
      // Mia — welfare-adjacent, gentle
      { pupilId: mia.id, mood: 3, note: "I was really hungry this morning but the kitchen gave me breakfast.", createdAt: daysAgo(6) },
      { pupilId: mia.id, mood: 4, note: "Good day today, played with friends at break.", createdAt: daysAgo(2) },
      // Happy background noise so the mood picture isn't all negative
      { pupilId: oliver.id, mood: 4, note: "We did a science experiment with volcanoes!! Mine was the best eruption.", createdAt: daysAgo(4) },
      { pupilId: lily.id, mood: 5, note: "Art class was so fun today! We got to paint whatever we wanted and I did a sunset over the sea.", createdAt: daysAgo(3) },
      { pupilId: pupil("Sofia", "Garcia").id, mood: 5, note: "Great day! I love school.", createdAt: daysAgo(5) },
      { pupilId: pupil("Amy", "Hughes").id, mood: 4, note: "Library time today. I found a book about space that is really cool. Did you know Saturn has 146 moons??", createdAt: daysAgo(2) },
      { pupilId: pupil("George", "Martin").id, mood: 4, note: "Answered a question in class and felt good about it.", createdAt: daysAgo(1) },
    ];
    for (const e of entries) {
      await db.insert(pupilDiaryTable).values({ ...e, schoolId: school } as any);
    }
    console.log(`[diary] ${entries.length} diary entries created`);
  }

  // ---------------------------------------------------------------- teacher posts
  const [{ count: postCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(teacherPostsTable)
    .where(eq(teacherPostsTable.schoolId, school));
  if (postCount > 0) {
    console.log(`[posts] ${postCount} already present — skipping`);
  } else {
    await db.insert(teacherPostsTable).values([
      {
        schoolId: school,
        authorId: headTeacher.id,
        title: "Friendship circles — week 3 update",
        body: "Lovely to see the Y3 friendship circles bedding in. Two classes report fewer break-time fallouts already. If your class hasn't started yet, the SENCO has the materials ready to go.",
        category: "general",
        audience: "everyone",
        createdAt: daysAgo(3),
      },
      {
        schoolId: school,
        authorId: coordinator.id,
        title: "Reminder: log break-time incidents the same day",
        body: "The pattern detection only works if reports go in promptly — two of this month's alerts came from same-day logging. Two minutes on the form saves a safeguarding gap later.",
        category: "safeguarding",
        audience: "everyone",
        createdAt: daysAgo(5),
      },
      {
        schoolId: school,
        authorId: headOfYear.id,
        title: "Y6 transition workshops start next week",
        body: "We're running the secondary-transition wellbeing sessions for Y6 from Monday. Please encourage pupils to use their diaries during this period — it helps us spot anyone struggling with the change.",
        category: "wellbeing",
        audience: "everyone",
        createdAt: daysAgo(1),
      },
    ] as any);
    console.log("[posts] 3 staff posts created");
  }

  // -------------------------------------------------- Year 7 class + lesson progress
  // All 14 lessons are the Year 7 (KS3) pilot curriculum, but the roster only
  // had Y3–Y6 — so no pupil could ever see a lesson. Create class 7A with its
  // login code, then give those pupils realistic progress.
  const existing7A = allUsers.filter((u) => u.role === "pupil" && u.className === "7A");
  let y7Pupils = existing7A;
  if (existing7A.length > 0) {
    console.log(`[7A] ${existing7A.length} pupils already present — skipping create`);
  } else {
    const y7Roster = [
      { firstName: "Lucia", lastName: "Demo", avatarValue: "🦉" },
      { firstName: "Adam", lastName: "Kowalski", avatarValue: "🦊" },
      { firstName: "Beatriz", lastName: "Salas", avatarValue: "🐬" },
      { firstName: "Callum", lastName: "Reid", avatarValue: "🐺" },
      { firstName: "Daniela", lastName: "Pons", avatarValue: "🐱" },
      { firstName: "Erik", lastName: "Lindqvist", avatarValue: "🐻" },
      { firstName: "Fatima", lastName: "Haddad", avatarValue: "🦋" },
      { firstName: "Gabriel", lastName: "Mas", avatarValue: "🦁" },
      { firstName: "Holly", lastName: "Barnes", avatarValue: "🐧" },
      { firstName: "Ivan", lastName: "Petrov", avatarValue: "🦈" },
      { firstName: "Jade", lastName: "Okafor", avatarValue: "🐢" },
      { firstName: "Klara", lastName: "Novak", avatarValue: "🐰" },
    ];
    const pinHash = await bcrypt.hash("1234", 12);
    y7Pupils = [];
    for (const p of y7Roster) {
      const [created] = await db
        .insert(usersTable)
        .values({
          schoolId: school,
          role: "pupil",
          firstName: p.firstName,
          lastName: p.lastName,
          pinHash,
          yearGroup: "Y7",
          className: "7A",
          avatarType: "animal",
          avatarValue: p.avatarValue,
        } as any)
        .returning();
      y7Pupils.push(created);
    }
    console.log(`[7A] created ${y7Pupils.length} Year 7 pupils`);

    const codeHash = await bcrypt.hash("7A-RIVER", 12);
    await db.insert(schoolLoginCodesTable).values({
      schoolId: school,
      codeType: "pupil_login",
      codeHash,
      className: "7A",
    } as any);
    console.log("[7A] created 7A-RIVER login code");
  }

  const [{ count: lpCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lessonProgressTable)
    .where(eq(lessonProgressTable.schoolId, school));
  if (lpCount > 0) {
    console.log(`[lesson-progress] ${lpCount} already present — skipping`);
  } else {
    const lessons = await db
      .select()
      .from(lessonsTable)
      .where(eq(lessonsTable.keyStage, "KS3"))
      .orderBy(asc(lessonsTable.sortOrder));
    let total = 0;
    for (let pi = 0; pi < y7Pupils.length; pi++) {
      const p = y7Pupils[pi];
      // Class is ~5 lessons into the 14-lesson course; pupils vary around that.
      const completed = Math.max(1, Math.min(7, 4 + ((pi * 7) % 5) - 1));
      for (let li = 0; li < completed && li < lessons.length; li++) {
        const startDays = 28 - li * 4 - (pi % 3);
        await db.insert(lessonProgressTable).values({
          schoolId: school,
          userId: p.id,
          lessonId: lessons[li].id,
          startedAt: daysAgo(startDays),
          completedAt: daysAgo(startDays - 1),
          quizScore: 55 + ((pi * 13 + li * 17) % 46), // 55–100
        } as any);
        total++;
      }
      // Most pupils have the next lesson started but not finished
      if (pi % 3 !== 0 && completed < lessons.length) {
        await db.insert(lessonProgressTable).values({
          schoolId: school,
          userId: p.id,
          lessonId: lessons[completed].id,
          startedAt: daysAgo(1),
        } as any);
        total++;
      }
    }
    console.log(`[lesson-progress] ${total} progress rows for ${y7Pupils.length} Y7 pupils`);
  }

  // ---------------------------------------------------------------- VOICE backing
  // Populate the in-app demo VOICE ("Riverside Parents for VBE"). The live
  // shared campaign (91bedd3e…) is left untouched on purpose — fake supporters
  // on a link real parents might open would undermine it. Flagged for Tom.
  const voices = await db.select().from(voiceGroupsTable).where(eq(voiceGroupsTable.schoolId, school));
  const demoVoice = voices.find((v) => v.name === "Riverside Parents for VBE");
  if (!demoVoice) {
    console.log("[voice] demo VOICE 'Riverside Parents for VBE' not found — skipping");
  } else {
    const members = await db.select().from(voiceMembersTable).where(eq(voiceMembersTable.voiceId, demoVoice.id));
    if (!members.some((m) => m.userId === parentB.id)) {
      await db.insert(voiceMembersTable).values({
        voiceId: demoVoice.id,
        userId: parentB.id,
        role: "member",
        joinedAt: daysAgo(9),
      } as any);
      console.log("[voice] added Parent B as member");
    }
    const supporters = await db
      .select()
      .from(voiceSupportersTable)
      .where(eq(voiceSupportersTable.voiceId, demoVoice.id));
    if (supporters.length >= 10) {
      console.log(`[voice] ${supporters.length} supporters already present — skipping`);
    } else {
      const names = [
        "Maria Santos", "Tom Whitfield", "Aisha Rahman", "Pere Bonet", "Sophie Keller",
        "James O'Neill", "Carla Ferrer", "Daan Vermeulen", "Lucy Hartley", "Miguel Serra",
        "Annika Berg", "Rosa Camps",
      ];
      let added = 0;
      for (let i = 0; i < names.length; i++) {
        const email = names[i].toLowerCase().replace(/[^a-z ]/g, "").replace(/ /g, ".") + "@example.com";
        if (supporters.some((s) => s.email === email)) continue;
        await db.insert(voiceSupportersTable).values({
          voiceId: demoVoice.id,
          name: names[i],
          email,
          createdAt: daysAgo(12 - i),
        } as any);
        added++;
      }
      console.log(`[voice] added ${added} public supporters to '${demoVoice.name}'`);
    }
  }

  // ------------------------------------------------- default demo pupil (Lucia, 7A)
  // The login page prefills the 7A code, so Lucia Demo is the pupil most demo
  // visitors land on — make sure her diary and inbox aren't empty. Guarded
  // separately because the diary/messages table guards above will have tripped.
  const luciaDemo = (await db.select().from(usersTable).where(
    and(eq(usersTable.schoolId, school), eq(usersTable.firstName, "Lucia"), eq(usersTable.lastName, "Demo"))
  ))[0];
  if (!luciaDemo) {
    console.log("[lucia] Lucia Demo not found — skipping");
  } else {
    const [{ count: luciaDiary }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pupilDiaryTable)
      .where(eq(pupilDiaryTable.pupilId, luciaDemo.id));
    if (luciaDiary > 0) {
      console.log(`[lucia] diary already present — skipping`);
    } else {
      const luciaEntries = [
        { mood: 4, note: "First term of secondary is going OK. The lesson about sleep and screens actually made me put my phone outside my room. Slept so much better.", createdAt: daysAgo(12) },
        { mood: 3, note: "Friendship stuff is confusing this year. The lesson about who's good for you made me think about my group a bit.", createdAt: daysAgo(7) },
        { mood: 5, note: "Got 9/10 on the wellbeing quiz! Also basketball tryouts went really well today.", createdAt: daysAgo(4) },
        { mood: 4, note: "Talked to Miss about feeling stressed before the maths test. She showed me the worry vs sadness thing from the lesson. It helped.", createdAt: daysAgo(1) },
      ];
      for (const e of luciaEntries) {
        await db.insert(pupilDiaryTable).values({ ...e, pupilId: luciaDemo.id, schoolId: school } as any);
      }
      const [lm] = await db.insert(messagesTable).values({
        schoolId: school,
        senderId: luciaDemo.id,
        recipientId: headOfYear.id,
        senderRole: "pupil",
        priority: "normal",
        type: "chat_request",
        body: "Can I ask you about the next wellbeing lesson? I want to show my mum the sleep one.",
        createdAt: daysAgo(2),
        readAt: daysAgo(2),
      } as any).returning();
      await db.insert(messagesTable).values({
        schoolId: school,
        senderId: headOfYear.id,
        recipientId: luciaDemo.id,
        senderRole: "head_of_year",
        priority: "normal",
        type: "message",
        body: "Of course! There's a parent version of the sleep lesson — I'll print it for you tomorrow. Really pleased you're sharing it at home.",
        parentMessageId: lm.id,
        createdAt: daysAgo(2),
        readAt: daysAgo(1),
      } as any);
      console.log("[lucia] 4 diary entries + a message thread for the default demo pupil");
    }
  }

  console.log("\n✅ Demo content seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("seed-demo-content failed:", err);
  process.exit(1);
});
