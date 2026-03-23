import { db, schoolsTable, usersTable, ptaAnnualReportsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12;

async function seed() {
  console.log("Seeding SafeSchool database...");

  const existingSchools = await db.select().from(schoolsTable);
  if (existingSchools.length > 0) {
    console.log("Database already seeded. Skipping.");
    process.exit(0);
  }

  const [school] = await db
    .insert(schoolsTable)
    .values({
      name: "Morna",
      legalEntity: "Morna International College S.L.",
      cif: "B12345678",
      address: "Carrer de Sa Figuera 12, Palma, Mallorca",
      country: "ES",
      region: "Balearic Islands",
    })
    .returning();

  console.log(`Created school: ${school.name} (${school.id})`);

  function generateRandomPin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  const staffPassword = await bcrypt.hash("password123", BCRYPT_ROUNDS);
  const parentPassword = await bcrypt.hash("parent123", BCRYPT_ROUNDS);
  const ptaPassword = await bcrypt.hash("pta123", BCRYPT_ROUNDS);

  const animalEmojis = ["\uD83E\uDD8A","\uD83D\uDC3B","\uD83D\uDC36","\uD83D\uDC31","\uD83D\uDC30","\uD83E\uDD81","\uD83D\uDC38","\uD83D\uDC28","\uD83D\uDC2F","\uD83E\uDD89","\uD83D\uDC2C","\uD83E\uDD8B","\uD83D\uDC27","\uD83D\uDC3A","\uD83D\uDC3C","\uD83E\uDD84","\uD83D\uDC22","\uD83E\uDD88","\uD83D\uDC19","\uD83E\uDD9C"];

  const classRosters: { yearGroup: string; className: string; names: [string, string][] }[] = [
    { yearGroup: "Y3", className: "3A", names: [
      ["Luna","Martinez"],["Oliver","Smith"],["Sofia","Garcia"],["Max","Weber"],["Isla","Johnson"],
      ["Pablo","Fernandez"],["Emma","de Vries"],["Leo","Müller"],["Mia","Williams"],["Hugo","Lopez"],
      ["Amelia","Brown"],["Lucas","Romero"],["Chloe","Petersen"],["Mateo","Santos"],["Freya","Anderson"],
      ["Diego","Torres"],["Lara","Fischer"],["Ethan","Davies"],["Nina","Herrera"],["Finn","van Dijk"],
    ]},
    { yearGroup: "Y4", className: "4A", names: [
      ["Marco","Ruiz"],["Sophie","Taylor"],["Carlos","Moreno"],["Lily","Thompson"],["Jan","Schmidt"],
      ["Valentina","Navarro"],["James","Wilson"],["Elena","Castro"],["Tom","Bakker"],["Clara","Ortiz"],
      ["Daniel","Harris"],["Noa","Jimenez"],["Hannah","Meyer"],["Alejandro","Ramos"],["Eva","White"],
      ["Sebastian","Molina"],["Ruby","Clark"],["Adrian","Serrano"],["Julia","Jansen"],["Liam","Cooper"],
    ]},
    { yearGroup: "Y5", className: "5B", names: [
      ["Ines","Vega"],["George","Martin"],["Carmen","Diaz"],["Oscar","Hall"],["Anke","Schneider"],
      ["Paula","Reyes"],["William","Lewis"],["Maria","Cruz"],["Lars","de Boer"],["Lucia","Medina"],
      ["Charlotte","Roberts"],["Alvaro","Flores"],["Zoe","Mitchell"],["Rafael","Gutierrez"],["Iris","Young"],
      ["Manuel","Aguilar"],["Alice","Walker"],["Hector","Vargas"],["Lotte","Visser"],["Noah","King"],
    ]},
    { yearGroup: "Y6", className: "6A", names: [
      ["Isabel","Hernandez"],["Thomas","Robinson"],["Andrea","Morales"],["Jack","Wright"],["Felix","Bauer"],
      ["Rocio","Dominguez"],["Emily","Green"],["David","Castillo"],["Sophie","de Jong"],["Miguel","Perez"],
      ["Olivia","Scott"],["Jorge","Alonso"],["Amy","Hughes"],["Antonio","Suarez"],["Lena","Krause"],
      ["Victor","Blanco"],["Grace","Edwards"],["Sergio","Mendez"],["Mila","Smit"],["Alexander","Kelly"],
    ]},
  ];

  const pupils: { firstName: string; lastName: string; yearGroup: string; className: string; avatarType: string; avatarValue: string }[] = [];
  let emojiIdx = 0;
  for (const roster of classRosters) {
    for (const [firstName, lastName] of roster.names) {
      pupils.push({
        firstName, lastName,
        yearGroup: roster.yearGroup,
        className: roster.className,
        avatarType: "animal",
        avatarValue: animalEmojis[emojiIdx % animalEmojis.length],
      });
      emojiIdx++;
    }
  }

  const pupilPins: { name: string; pin: string }[] = [];
  const pupilRecords = [];
  for (const p of pupils) {
    const pin = generateRandomPin();
    const pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);
    const [record] = await db
      .insert(usersTable)
      .values({
        schoolId: school.id,
        role: "pupil",
        firstName: p.firstName,
        lastName: p.lastName,
        yearGroup: p.yearGroup,
        className: p.className,
        avatarType: p.avatarType,
        avatarValue: p.avatarValue,
        pinHash,
        active: true,
      })
      .returning();
    pupilRecords.push(record);
    pupilPins.push({ name: `${p.firstName} ${p.lastName}`, pin });
    console.log(`  Pupil: ${p.firstName} ${p.lastName} (PIN: ${pin})`);
  }

  const staffMembers = [
    { firstName: "Coordinator", lastName: "A", role: "coordinator", email: "coordinator@safeschool.dev" },
    { firstName: "Head Teacher", lastName: "A", role: "head_teacher", email: "head@safeschool.dev" },
    { firstName: "Teacher", lastName: "A", role: "head_of_year", email: "teacher@safeschool.dev", className: "6A", yearGroup: "Y6" },
    { firstName: "Teacher", lastName: "B", role: "teacher", email: "teacher2@safeschool.dev", className: "5B" },
    { firstName: "Teacher", lastName: "C", role: "teacher", email: "teacher3@safeschool.dev", className: "4A" },
    { firstName: "Teacher", lastName: "D", role: "teacher", email: "teacher4@safeschool.dev", className: "3A" },
    { firstName: "Support Staff", lastName: "A", role: "support_staff", email: "support@safeschool.dev" },
    { firstName: "SENCO", lastName: "A", role: "senco", email: "senco@safeschool.dev" },
  ];

  for (const s of staffMembers) {
    await db.insert(usersTable).values({
      schoolId: school.id,
      role: s.role,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      className: (s as any).className || null,
      yearGroup: (s as any).yearGroup || null,
      passwordHash: staffPassword,
      active: true,
    });
    console.log(`  Staff: ${s.firstName} ${s.lastName} (${s.role}, password: password123)`);
  }

  const parents = [
    { firstName: "Parent", lastName: "A", email: "parent.a@safeschool.dev", childIndex: 0 },
    { firstName: "Parent", lastName: "B", email: "parent.b@safeschool.dev", childIndex: 1 },
  ];

  for (const p of parents) {
    await db.insert(usersTable).values({
      schoolId: school.id,
      role: "parent",
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      passwordHash: parentPassword,
      parentOf: [pupilRecords[p.childIndex].id],
      active: true,
    });
    console.log(`  Parent: ${p.firstName} ${p.lastName} (password: parent123, child: ${pupils[p.childIndex].firstName} ${pupils[p.childIndex].lastName})`);
  }

  const ptaMembers = [
    { firstName: "PTA Chair", lastName: "A", email: "pta.chair@safeschool.dev" },
    { firstName: "PTA Member", lastName: "1", email: "pta.member1@safeschool.dev" },
  ];

  for (const p of ptaMembers) {
    await db.insert(usersTable).values({
      schoolId: school.id,
      role: "pta",
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      passwordHash: ptaPassword,
      active: true,
    });
    console.log(`  PTA: ${p.firstName} ${p.lastName} (password: pta123)`);
  }

  const [coordinatorUser] = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, "coordinator@safeschool.dev"));

  if (coordinatorUser) {
    const now = new Date();
    const academicYear = now.getMonth() >= 8
      ? `${now.getFullYear()}-${now.getFullYear() + 1}`
      : `${now.getFullYear() - 1}-${now.getFullYear()}`;

    await db.insert(ptaAnnualReportsTable).values({
      schoolId: school.id,
      academicYear,
      reportData: {
        academicYear,
        generatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        totalIncidents: 169,
        incidentsByCategory: [
          { category: "bullying", count: 52 },
          { category: "cyberbullying", count: 28 },
          { category: "verbal", count: 31 },
          { category: "physical", count: 18 },
          { category: "emotional", count: 14 },
          { category: "discrimination", count: 9 },
          { category: "safeguarding", count: 7 },
          { category: "other", count: 10 },
        ],
        protocolsByStatus: [
          { status: "open", count: 2 },
          { status: "resolved", count: 8 },
          { status: "closed", count: 5 },
        ],
        alertsSummary: [
          { level: "high", status: "active", count: 3 },
          { level: "high", status: "resolved", count: 12 },
          { level: "medium", status: "active", count: 5 },
          { level: "medium", status: "resolved", count: 20 },
        ],
      },
      status: "approved",
      generatedById: coordinatorUser.id,
      approvedById: coordinatorUser.id,
      approvedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    });
    console.log(`  Seeded approved PTA annual report for ${academicYear}`);
  }

  console.log("\nSeed complete!");
  console.log("\nLogin credentials:");
  console.log("  Coordinator: coordinator@safeschool.dev / password123");
  console.log("  Head Teacher: head@safeschool.dev / password123");
  console.log("  Teacher A (Head of Year Y6): teacher@safeschool.dev / password123");
  console.log("  Teacher B: teacher2@safeschool.dev / password123");
  console.log("  Teacher C: teacher3@safeschool.dev / password123");
  console.log("  Teacher D: teacher4@safeschool.dev / password123");
  console.log("  Support Staff A: support@safeschool.dev / password123");
  console.log("  SENCO: senco@safeschool.dev / password123");
  console.log("  Parent A: parent.a@safeschool.dev / parent123");
  console.log("  Parent B: parent.b@safeschool.dev / parent123");
  console.log("  PTA Chair: pta.chair@safeschool.dev / pta123");
  console.log("  PTA Member 1: pta.member1@safeschool.dev / pta123");
  console.log("  Pupils: Each pupil has a unique random PIN (see above). Staff can reset PINs from the My Class page.");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
