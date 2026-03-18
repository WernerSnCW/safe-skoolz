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
      name: "International School of Mallorca",
      legalEntity: "ISM Foundation S.L.",
      cif: "B12345678",
      address: "Carrer de Sa Figuera 12, Palma, Mallorca",
      country: "ES",
      region: "Balearic Islands",
    })
    .returning();

  console.log(`Created school: ${school.name} (${school.id})`);

  const pinHash = await bcrypt.hash("1234", BCRYPT_ROUNDS);
  const staffPassword = await bcrypt.hash("password123", BCRYPT_ROUNDS);
  const parentPassword = await bcrypt.hash("parent123", BCRYPT_ROUNDS);

  const pupils = [
    { firstName: "Lucia", lastName: "Martinez", yearGroup: "Y6", className: "6A", avatarType: "animal", avatarValue: "\uD83E\uDD8A" },
    { firstName: "Marc", lastName: "Garcia", yearGroup: "Y6", className: "6A", avatarType: "animal", avatarValue: "\uD83D\uDC3B" },
    { firstName: "Sofia", lastName: "Lopez", yearGroup: "Y5", className: "5B", avatarType: "animal", avatarValue: "\uD83D\uDC2C" },
    { firstName: "Pablo", lastName: "Fernandez", yearGroup: "Y5", className: "5B", avatarType: "animal", avatarValue: "\uD83E\uDD8B" },
    { firstName: "Mia", lastName: "Torres", yearGroup: "Y4", className: "4A", avatarType: "animal", avatarValue: "\uD83D\uDC27" },
    { firstName: "Leo", lastName: "Ruiz", yearGroup: "Y4", className: "4A", avatarType: "animal", avatarValue: "\uD83E\uDD81" },
    { firstName: "Emma", lastName: "Navarro", yearGroup: "Y3", className: "3A", avatarType: "animal", avatarValue: "\uD83D\uDC28" },
    { firstName: "Daniel", lastName: "Moreno", yearGroup: "Y3", className: "3A", avatarType: "animal", avatarValue: "\uD83D\uDC3A" },
  ];

  const pupilRecords = [];
  for (const p of pupils) {
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
    console.log(`  Pupil: ${p.firstName} ${p.lastName} (PIN: 1234)`);
  }

  const staffMembers = [
    { firstName: "Ana", lastName: "Coordinator", role: "coordinator", email: "coordinator@safeschool.dev" },
    { firstName: "Carlos", lastName: "HeadTeacher", role: "head_teacher", email: "head@safeschool.dev" },
    { firstName: "Maria", lastName: "Teacher", role: "teacher", email: "teacher@safeschool.dev", className: "6A" },
    { firstName: "Juan", lastName: "SENCO", role: "senco", email: "senco@safeschool.dev" },
    { firstName: "Elena", lastName: "Teacher2", role: "teacher", email: "teacher2@safeschool.dev", className: "5B" },
  ];

  for (const s of staffMembers) {
    await db.insert(usersTable).values({
      schoolId: school.id,
      role: s.role,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      className: (s as any).className || null,
      passwordHash: staffPassword,
      active: true,
    });
    console.log(`  Staff: ${s.firstName} ${s.lastName} (${s.role}, password: password123)`);
  }

  const parents = [
    { firstName: "Isabel", lastName: "Martinez", email: "parent.martinez@safeschool.dev", childIndex: 0 },
    { firstName: "Roberto", lastName: "Garcia", email: "parent.garcia@safeschool.dev", childIndex: 1 },
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
    console.log(`  Parent: ${p.firstName} ${p.lastName} (password: parent123, child: ${pupils[p.childIndex].firstName})`);
  }

  console.log("\nSeed complete!");
  console.log("\nLogin credentials:");
  console.log("  Coordinator: coordinator@safeschool.dev / password123");
  console.log("  Head Teacher: head@safeschool.dev / password123");
  console.log("  Teacher: teacher@safeschool.dev / password123");
  console.log("  Parent: parent.martinez@safeschool.dev / parent123");
  console.log("  Pupil: Select school, select pupil, PIN: 1234");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
