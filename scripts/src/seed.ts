import { db, schoolsTable, usersTable } from "@workspace/db";
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

  const pupils = [
    { firstName: "Boy", lastName: "A", yearGroup: "Y6", className: "6A", avatarType: "animal", avatarValue: "\uD83E\uDD8A" },
    { firstName: "Boy", lastName: "B", yearGroup: "Y6", className: "6A", avatarType: "animal", avatarValue: "\uD83D\uDC3B" },
    { firstName: "Girl", lastName: "A", yearGroup: "Y5", className: "5B", avatarType: "animal", avatarValue: "\uD83D\uDC2C" },
    { firstName: "Girl", lastName: "B", yearGroup: "Y5", className: "5B", avatarType: "animal", avatarValue: "\uD83E\uDD8B" },
    { firstName: "Boy", lastName: "C", yearGroup: "Y4", className: "4A", avatarType: "animal", avatarValue: "\uD83D\uDC27" },
    { firstName: "Girl", lastName: "C", yearGroup: "Y4", className: "4A", avatarType: "animal", avatarValue: "\uD83E\uDD81" },
    { firstName: "Boy", lastName: "D", yearGroup: "Y3", className: "3A", avatarType: "animal", avatarValue: "\uD83D\uDC28" },
    { firstName: "Girl", lastName: "D", yearGroup: "Y3", className: "3A", avatarType: "animal", avatarValue: "\uD83D\uDC3A" },
  ];

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
