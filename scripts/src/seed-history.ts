import { db, usersTable, incidentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

function refNum() {
  return `INC-${String(Math.floor(10000 + Math.random() * 90000))}`;
}

function dateAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const LOCATIONS = [
  "playground", "classroom", "corridor", "forest", "stage_amphitheatre",
  "tires", "play_park", "cafeteria_buffet", "picnic_area", "eating_caravan",
  "basketball_court", "football_pitch", "library", "entrance_gate", "toilets",
  "cloakroom", "online",
];

const OUTDOOR_LOCATIONS = [
  "playground", "forest", "stage_amphitheatre", "tires", "play_park",
  "picnic_area", "basketball_court", "football_pitch",
];

const INDOOR_LOCATIONS = [
  "classroom", "corridor", "library", "cafeteria_buffet", "cloakroom",
];

function locationForDescription(desc: string, category: string): string {
  if (category === "online" || category.includes("online") || desc.includes("group chat") || desc.includes("online") || desc.includes("messages") || desc.includes("social media") || desc.includes("photo of me")) return "online";
  if (desc.includes("corridor")) return "corridor";
  if (desc.includes("classroom") || desc.includes("chair") || desc.includes("in class") || desc.includes("in my class") || desc.includes("read out loud") || desc.includes("teacher didn't see")) return "classroom";
  if (desc.includes("lunch") || desc.includes("sit with me at") || desc.includes("hungry")) return "cafeteria_buffet";
  if (desc.includes("clothing") || desc.includes("arrived at school") || desc.includes("arrived without")) return "classroom";
  if (desc.includes("break") || desc.includes("outside") || desc.includes("play ") || desc.includes("playground")) return pick(OUTDOOR_LOCATIONS);
  if (desc.includes("wall") || desc.includes("push")) return pick([...OUTDOOR_LOCATIONS, "corridor"]);
  if (desc.includes("team") || desc.includes("game")) return pick(OUTDOOR_LOCATIONS);
  return pick(LOCATIONS.filter(l => l !== "online"));
}

const CATEGORIES = ["verbal", "physical", "psychological", "exclusion", "online", "verbal,physical", "verbal,psychological"];

const EMOTIONS = [
  "sad", "scared", "angry", "worried", "confused", "lonely",
  "embarrassed", "sad,scared", "scared,angry", "worried,confused",
  "sad,lonely", "angry,scared", "embarrassed,sad", "sad,worried",
];

async function seedHistory() {
  console.log("Seeding historical incidents (6 months)...");

  const allUsers = await db.select().from(usersTable);
  const byName = (first: string, last: string) => {
    const u = allUsers.find((u) => u.firstName === first && u.lastName === last);
    if (!u) throw new Error(`User not found: ${first} ${last}`);
    return u;
  };

  const school = allUsers[0].schoolId;

  const boyA = byName("Boy", "A");
  const boyB = byName("Boy", "B");
  const boyC = byName("Boy", "C");
  const boyD = byName("Boy", "D");
  const girlA = byName("Girl", "A");
  const girlB = byName("Girl", "B");
  const girlC = byName("Girl", "C");
  const girlD = byName("Girl", "D");
  const teacherA = byName("Teacher", "A");
  const teacherB = byName("Teacher", "B");
  const teacherC = byName("Teacher", "C");
  const coordinator = byName("Coordinator", "A");

  const pupils = [boyA, boyB, boyC, boyD, girlA, girlB, girlC, girlD];
  const staff = [teacherA, teacherB, teacherC, coordinator];

  const PUPIL_DESCRIPTIONS: Record<string, { categories: string[]; emotions: string[]; descriptions: string[] }> = {
    [boyA.id]: {
      categories: ["verbal", "physical", "verbal,physical", "psychological"],
      emotions: ["sad,scared", "scared,angry", "sad", "worried"],
      descriptions: [
        "Someone keeps saying unkind things to me at break time. It happens a lot and I feel really upset about it.",
        "I got pushed in the corridor today. The same person has done it before and it hurts.",
        "People keep leaving me out of things and whispering about me. I feel really sad.",
        "Someone took my things and wouldn't give them back. When I asked nicely they laughed at me.",
        "I don't want to go outside at break because the same person is always being unkind to me.",
      ],
    },
    [girlA.id]: {
      categories: ["physical", "exclusion", "online", "verbal"],
      emotions: ["scared,angry", "lonely", "worried,confused", "sad"],
      descriptions: [
        "Someone bumped into me on purpose and I fell over. They said it was an accident but it wasn't.",
        "The other children won't let me play with them. They run away when I come over.",
        "Someone is saying unkind things about me in a group chat. I feel really worried about it.",
        "I heard someone calling me names behind my back. It made me feel really upset.",
        "Some children keep whispering and looking at me. I feel left out and confused.",
      ],
    },
    [girlB.id]: {
      categories: ["exclusion", "psychological", "verbal"],
      emotions: ["sad,lonely", "sad", "embarrassed,sad"],
      descriptions: [
        "Nobody wants to sit with me at lunch. I always have to sit alone and it makes me sad.",
        "Someone keeps copying what I say in a mean way. Everyone laughs and I feel embarrassed.",
        "I feel like nobody at school likes me. I try to be friendly but people ignore me.",
      ],
    },
  };

  const STAFF_DESCRIPTIONS = [
    "Observed an incident between two pupils during break time. One pupil appeared upset. Both spoken to individually.",
    "A pupil reported feeling unsafe at school. Spoke with them to understand the situation and offered support.",
    "Noticed a pattern of behaviour between two pupils. This appears to be an ongoing situation. Logged for monitoring.",
    "A pupil came to me saying they were being picked on. We talked about it and I reassured them.",
    "Witnessed unkind behaviour in the playground. Intervened immediately and spoke with all children involved.",
    "A pupil seemed withdrawn today. After talking to them, they shared that something has been bothering them at school.",
    "Following up on a previous incident. Checked in with the pupil and they say things have improved.",
    "Observed exclusion behaviour during group activity. Reminded all pupils about our school values.",
    "A pupil reported online behaviour that made them uncomfortable. Documented and reported to coordinator.",
    "Noticed a pupil arriving without proper clothing/lunch on multiple occasions. Flagging as a welfare concern.",
  ];

  const PARENT_SUMMARIES = [
    "A minor disagreement occurred at school today. Both children have been spoken to and the matter has been resolved.",
    "Your child reported feeling upset about an incident at school. We have spoken with them and are monitoring the situation.",
    "There was a small incident during break time. Staff intervened promptly and all children are fine.",
    "Your child mentioned feeling left out by some classmates. We are working with the class on friendship and inclusion.",
    "We wanted to let you know about a minor incident at school. Your child is safe and we are keeping an eye on things.",
    "Following a report from your child, we have spoken with everyone involved. We will continue to monitor the situation.",
    "An incident was reported today and your child was involved. Staff addressed it immediately and will follow up.",
    "Your child had a difficult day at school. We've provided support and will keep you updated on how things progress.",
  ];

  const incidents: any[] = [];

  for (let month = 6; month >= 1; month--) {
    const incidentsThisMonth = 4 + Math.floor(Math.random() * 6);

    for (let i = 0; i < incidentsThisMonth; i++) {
      const dayInMonth = 1 + Math.floor(Math.random() * 27);
      const daysAgo = month * 30 - dayInMonth;
      if (daysAgo < 15) continue;

      const isStaffReport = Math.random() > 0.55;
      let reporter, reporterRole: string, victim, perpetrator;
      let description: string;
      let category: string;
      let emotion: string | undefined;

      if (isStaffReport) {
        reporter = pick(staff);
        reporterRole = reporter.role || "teacher";
        victim = pick(pupils);
        perpetrator = pick(pupils.filter((p) => p.id !== victim.id));
        description = pick(STAFF_DESCRIPTIONS);
        category = pick(CATEGORIES);
      } else {
        const pupilsWithDescs = pupils.filter((p) => PUPIL_DESCRIPTIONS[p.id]);
        victim = pick(pupilsWithDescs.length > 0 ? pupilsWithDescs : pupils);
        reporter = victim;
        reporterRole = "pupil";
        perpetrator = pick(pupils.filter((p) => p.id !== victim.id));

        const defs = PUPIL_DESCRIPTIONS[victim.id];
        if (defs) {
          description = pick(defs.descriptions);
          category = pick(defs.categories);
          emotion = pick(defs.emotions);
        } else {
          description = "Something happened at school that made me feel upset. I wanted to tell someone about it.";
          category = pick(CATEGORIES);
          emotion = pick(EMOTIONS);
        }
      }

      const escalationTier = category.includes("physical") || category.includes("online") ? 2 : 1;
      const statuses = ["open", "submitted", "investigating", "closed"];
      const status = month >= 3 ? pick(["closed", "closed", "investigating", "submitted"]) : pick(statuses);
      const isAnonymous = !isStaffReport && Math.random() < 0.15;

      const makeParentVisible = status === "closed" || (Math.random() < 0.4 && month <= 4);
      const parentSummary = makeParentVisible ? pick(PARENT_SUMMARIES) : undefined;

      const inc: any = {
        referenceNumber: refNum(),
        schoolId: school,
        reporterId: reporter.id,
        reporterRole,
        anonymous: isAnonymous,
        category,
        escalationTier,
        safeguardingTrigger: false,
        incidentDate: dateAgo(daysAgo),
        location: locationForDescription(description, category),
        description,
        victimIds: [victim.id],
        perpetratorIds: [perpetrator.id],
        status,
        parentVisible: makeParentVisible,
        addedToFile: status === "closed" || Math.random() < 0.3,
      };

      if (emotion) inc.emotionalState = emotion;
      if (!isStaffReport) {
        inc.happeningToMe = true;
        inc.happeningToSomeoneElse = false;
        inc.iSawIt = false;
      }
      if (isStaffReport) {
        inc.childrenSeparated = Math.random() > 0.5;
        inc.coordinatorNotified = Math.random() > 0.4;
      }
      if (parentSummary) inc.parentSummary = parentSummary;

      if (makeParentVisible && teacherA) {
        inc.assessedBy = teacherA.id;
        inc.assessedAt = new Date(new Date().setDate(new Date().getDate() - daysAgo + 1));
      }

      incidents.push(inc);
    }
  }

  const boyABoyBPattern = [
    { daysAgo: 150, cat: "verbal", desc: "Someone in my class keeps calling me unkind names. It has been happening for a while now.", time: "10:15" },
    { daysAgo: 130, cat: "verbal,physical", desc: "The same person pushed me today and called me a name. I told my teacher.", time: "11:30" },
    { daysAgo: 110, cat: "physical", desc: "I got pushed again at break. I'm starting to feel really worried about going to school.", time: "10:45" },
    { daysAgo: 90, cat: "verbal", desc: "They said something really mean to me today. I don't understand why they keep doing it.", time: "13:00" },
    { daysAgo: 75, cat: "exclusion", desc: "Now they are telling other people not to play with me. I feel really lonely.", time: "12:30" },
    { daysAgo: 55, cat: "verbal,physical", desc: "It happened again today. They pushed me and said unkind words. I feel scared and sad.", time: "10:00" },
    { daysAgo: 40, cat: "physical", desc: "They tripped me up in the corridor. A teacher saw and came to help me.", time: "14:10" },
    { daysAgo: 25, cat: "verbal", desc: "They were whispering about me and laughing. When I asked what was funny they said 'nothing'.", time: "11:15" },
  ];

  for (const pattern of boyABoyBPattern) {
    incidents.push({
      referenceNumber: refNum(),
      schoolId: school,
      reporterId: boyA.id,
      reporterRole: "pupil",
      anonymous: false,
      category: pattern.cat,
      escalationTier: pattern.cat.includes("physical") ? 2 : 1,
      safeguardingTrigger: false,
      incidentDate: dateAgo(pattern.daysAgo),
      incidentTime: pattern.time,
      location: locationForDescription(pattern.desc, pattern.cat),
      description: pattern.desc,
      victimIds: [boyA.id],
      perpetratorIds: [boyB.id],
      emotionalState: pick(["sad,scared", "scared,angry", "sad", "worried,scared"]),
      happeningToMe: true,
      happeningToSomeoneElse: false,
      iSawIt: false,
      status: pattern.daysAgo > 60 ? "closed" : "investigating",
      parentVisible: pattern.daysAgo > 40,
      addedToFile: true,
      parentSummary: pattern.daysAgo > 40 ? pick(PARENT_SUMMARIES) : undefined,
      assessedBy: teacherA.id,
      assessedAt: new Date(new Date().setDate(new Date().getDate() - pattern.daysAgo + 2)),
    });
  }

  const boyBIncidents = [
    { daysAgo: 160, cat: "verbal", desc: "Some older children in the playground called me names. It made me feel really sad.", emotion: "sad", time: "10:30" },
    { daysAgo: 125, cat: "physical", desc: "Someone kicked my bag across the floor and everyone laughed. I didn't do anything wrong.", emotion: "angry", time: "12:45" },
    { daysAgo: 95, cat: "exclusion", desc: "Nobody picked me for their team again today. They always leave me until last.", emotion: "sad,lonely", time: "11:00" },
    { daysAgo: 68, cat: "verbal,psychological", desc: "Someone keeps saying I'm stupid. They say it quietly so the teacher can't hear.", emotion: "worried,confused", time: "14:15" },
    { daysAgo: 50, cat: "online", desc: "People posted a photo of me on a group chat and wrote mean things underneath it.", emotion: "scared,angry", time: "16:00" },
    { daysAgo: 35, cat: "physical", desc: "I got pushed into the wall at break time. My arm really hurt but I didn't tell anyone until now.", emotion: "scared", time: "10:45" },
  ];

  for (const inc of boyBIncidents) {
    incidents.push({
      referenceNumber: refNum(),
      schoolId: school,
      reporterId: boyB.id,
      reporterRole: "pupil",
      anonymous: false,
      category: inc.cat,
      escalationTier: inc.cat.includes("physical") || inc.cat.includes("online") ? 2 : 1,
      safeguardingTrigger: false,
      incidentDate: dateAgo(inc.daysAgo),
      incidentTime: inc.time,
      location: locationForDescription(inc.desc, inc.cat),
      description: inc.desc,
      victimIds: [boyB.id],
      perpetratorIds: [pick(pupils.filter((p) => p.id !== boyB.id)).id],
      emotionalState: inc.emotion,
      happeningToMe: true,
      happeningToSomeoneElse: false,
      iSawIt: false,
      status: inc.daysAgo > 80 ? "closed" : "investigating",
      parentVisible: true,
      addedToFile: inc.daysAgo < 100,
      parentSummary: pick(PARENT_SUMMARIES),
      assessedBy: teacherA.id,
      assessedAt: new Date(new Date().setDate(new Date().getDate() - inc.daysAgo + 1)),
    });
  }

  const girlAIncidents = [
    { daysAgo: 140, cat: "online", desc: "Someone sent me unkind messages in our class group chat. I showed my mum.", emotion: "worried,confused", time: "16:30" },
    { daysAgo: 100, cat: "exclusion", desc: "The other girls won't let me play with them. They keep running away from me.", emotion: "sad,lonely", time: "10:30" },
    { daysAgo: 70, cat: "verbal", desc: "Someone said something really horrible about my family. I felt really upset.", emotion: "sad,angry", time: "13:15" },
    { daysAgo: 45, cat: "physical", desc: "Someone pushed me off my chair on purpose. The teacher didn't see.", emotion: "scared,angry", time: "09:45" },
  ];

  for (const inc of girlAIncidents) {
    incidents.push({
      referenceNumber: refNum(),
      schoolId: school,
      reporterId: girlA.id,
      reporterRole: "pupil",
      anonymous: false,
      category: inc.cat,
      escalationTier: inc.cat.includes("physical") || inc.cat.includes("online") ? 2 : 1,
      safeguardingTrigger: false,
      incidentDate: dateAgo(inc.daysAgo),
      incidentTime: inc.time,
      location: locationForDescription(inc.desc, inc.cat),
      description: inc.desc,
      victimIds: [girlA.id],
      perpetratorIds: [pick(pupils.filter((p) => p.id !== girlA.id)).id],
      emotionalState: inc.emotion,
      happeningToMe: true,
      happeningToSomeoneElse: false,
      iSawIt: false,
      status: inc.daysAgo > 80 ? "closed" : "investigating",
      parentVisible: true,
      addedToFile: true,
      parentSummary: pick(PARENT_SUMMARIES),
      assessedBy: teacherB.id,
      assessedAt: new Date(new Date().setDate(new Date().getDate() - inc.daysAgo + 1)),
    });
  }

  incidents.sort((a, b) => a.incidentDate.localeCompare(b.incidentDate));

  for (const inc of incidents) {
    await db.insert(incidentsTable).values(inc);
    console.log(`  Created: ${inc.referenceNumber} - ${inc.category} (${inc.incidentDate}) [${inc.status}]`);
  }

  console.log(`\nSeeded ${incidents.length} historical incidents spanning 6 months.`);
  console.log("Key data points:");
  console.log(`  - Boy A → Boy B pattern: 8 dedicated incidents over 5 months`);
  console.log(`  - Girl A incidents: 4 dedicated incidents over 4 months`);
  console.log(`  - Random incidents: ~${incidents.length - 12} across all pupils`);
  console.log(`  - Many incidents shared with parents (parentVisible=true)`);
  process.exit(0);
}

seedHistory().catch((err) => {
  console.error("History seed failed:", err);
  process.exit(1);
});
