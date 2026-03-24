import { db } from "@workspace/db";
import { schoolsTable, usersTable, schoolLoginCodesTable, delegatedRolesTable, pupilDiaryTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const SCHOOL_ID = "0a6a9fba-5ecb-474f-8544-a7f2caafd924";

const STAFF_PW_HASH = "$2b$12$66nn5PbkIojacGdJxNR2n.dnP4IV6hC6pJDfP3gINFjeiuUdzaT.e";
const PARENT_PW_HASH = "$2b$12$QvXc3X.LfkXgjXJT8pifne4rc5W7dRZakXPcsPmaY9Gc8GDlaN57m";
const PARENT_PIN_HASH = "$2b$12$q8Dk4X07xODPCFpqUqI6Je6qbzHFFi6JZt4jDrjyltQf.SklkM.di";
const PTA_PW_HASH = "$2b$12$Z5PFcen9T8fY8BcHn.S8Zu014gw4hclPy6256N86JVnb3Jsq/Moyq";
const PUPIL_PIN_HASH = "$2b$12$NG29nWH9VuEHR9q1/Yx4ru1djVHYKWVILTvNG.OXFHKnPQTWu7gX6";
const BOB_PIN_HASH = "$2b$12$dUnw1VoDGDIyn8Y2MA8xwe5seNC0A.KT1sHmFEHzCP4xIXHzwamMu";
const CODE_HASH = "$2b$12$cEZbSR0Pjg869.HMVJMzJOJS6IET4yOq5JL9fzlhoIMIJA4xE0gcG";

const BOB_ID = "bea9c727-d295-4337-9fa4-3c0b8821c898";
const CAROLINE_ID = "7fc4f9b9-cf90-4561-96fd-bcc939691e28";
const ELENA_N_ID = "4b63e258-1a45-44de-a7e3-bb8b22e42c81";
const PABLO_ID = "00a5a01d-f215-4c4e-b5b4-12510bdf28d7";

const SARAH_ID = "497d63a7-0c2e-4aac-ae6d-2b636fea225f";
const JAMES_C_ID = "6cabe296-79d5-41e9-930d-fdb0892e2d6b";
const EMMA_D_ID = "b94b675d-95de-4ead-b846-565eb1166681";
const HELEN_ID = "0fb0bcc0-35cb-4958-b1ad-6a05d4c08039";

export async function seedDemoData() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schoolsTable);
  if (count > 0) {
    console.log("[seed] Database already has data, skipping seed");
    return;
  }

  console.log("[seed] Empty database detected — seeding demo data…");

  await db.insert(schoolsTable).values({
    id: SCHOOL_ID,
    name: "Morna",
    legalEntity: "ISM Foundation S.L.",
    cif: "B12345678",
    address: "Carrer de Sa Figuera 12, Palma, Mallorca",
    country: "ES",
    region: "Balearic Islands",
  });

  await db.insert(schoolLoginCodesTable).values({
    schoolId: SCHOOL_ID,
    codeType: "pupil_login",
    codeHash: CODE_HASH,
  });

  const staffUsers: any[] = [
    { id: SARAH_ID, role: "coordinator", firstName: "Sarah", lastName: "Mitchell", email: "coordinator@safeschool.dev", passwordHash: STAFF_PW_HASH },
    { id: JAMES_C_ID, role: "head_teacher", firstName: "James", lastName: "Crawford", email: "head@safeschool.dev", passwordHash: STAFF_PW_HASH },
    { id: EMMA_D_ID, role: "head_of_year", firstName: "Emma", lastName: "Davies", email: "teacher@safeschool.dev", passwordHash: STAFF_PW_HASH, yearGroup: "Y6", className: "6A" },
    { id: HELEN_ID, role: "senco", firstName: "Helen", lastName: "Clarke", email: "senco@safeschool.dev", passwordHash: STAFF_PW_HASH },
    { id: "11e9bced-f116-4a03-a6ad-89fa28e028f5", role: "support_staff", firstName: "Chris", lastName: "Taylor", email: "support@safeschool.dev", passwordHash: STAFF_PW_HASH },
    { id: "2aa6ac8e-9c9e-45df-aa69-8746aa0aab9c", role: "teacher", firstName: "David", lastName: "Wilson", email: "teacher2@safeschool.dev", passwordHash: STAFF_PW_HASH },
    { id: "e4bf21ba-8f7e-47d1-be56-e1647885df3b", role: "teacher", firstName: "Laura", lastName: "Bennett", email: "teacher3@safeschool.dev", passwordHash: STAFF_PW_HASH },
    { id: "c0e057d7-2fc1-48fb-99bb-00c46c4e87f3", role: "teacher", firstName: "Tom", lastName: "Harris", email: "teacher4@safeschool.dev", passwordHash: STAFF_PW_HASH },
  ];

  const parentUsers: any[] = [
    { id: "f504f6a3-bde4-4942-940c-ba6b0b7c534a", role: "parent", firstName: "Albert", lastName: "Demo", email: "parent.a@safeschool.dev", pinHash: PARENT_PIN_HASH, passwordHash: PARENT_PW_HASH, parentOf: [ELENA_N_ID] },
    { id: "aa0a5ec3-cc17-4e6b-a8c0-4d6478f83a07", role: "parent", firstName: "Jennifer", lastName: "Demo", email: "parent.b@safeschool.dev", pinHash: PARENT_PIN_HASH, passwordHash: PARENT_PW_HASH, parentOf: [PABLO_ID] },
  ];

  const ptaUsers: any[] = [
    { id: "6e138046-57ee-4452-b76a-c473dfcfdecf", role: "pta", firstName: "Rachel", lastName: "Foster", email: "pta.chair@safeschool.dev", passwordHash: PTA_PW_HASH },
    { id: "297a275d-9afb-462e-b163-591dc013e246", role: "pta", firstName: "Mark", lastName: "Stevens", email: "pta.member1@safeschool.dev", passwordHash: PTA_PW_HASH },
  ];

  type PupilRow = { id: string; firstName: string; lastName: string; yearGroup: string; className: string; avatarValue: string; pinHash?: string };

  const pupils: PupilRow[] = [
    { id: BOB_ID, firstName: "Bob", lastName: "Demo", yearGroup: "Y4", className: "4A", avatarValue: "🦁", pinHash: BOB_PIN_HASH },
    { id: CAROLINE_ID, firstName: "Caroline", lastName: "Demo", yearGroup: "Y5", className: "5B", avatarValue: "🐬" },
    { id: ELENA_N_ID, firstName: "Elena", lastName: "Navarro", yearGroup: "Y6", className: "6A", avatarValue: "🐱" },
    { id: PABLO_ID, firstName: "Pablo", lastName: "Garcia", yearGroup: "Y6", className: "6A", avatarValue: "🐻" },
    { id: "db41e263-6ac6-4997-a8d2-b20e1214ae2a", firstName: "Adrian", lastName: "Serrano", yearGroup: "Y4", className: "4A", avatarValue: "🦈" },
    { id: "2827d369-3ccf-40c4-9b21-d38fd7daaa92", firstName: "Alejandro", lastName: "Ramos", yearGroup: "Y4", className: "4A", avatarValue: "🐺" },
    { id: "342fa065-89f3-4b20-8d21-f86ff5d21223", firstName: "Alexander", lastName: "Kelly", yearGroup: "Y6", className: "6A", avatarValue: "🦜" },
    { id: "96a9bcc4-cd5d-49e0-9600-606b8976646b", firstName: "Alice", lastName: "Walker", yearGroup: "Y5", className: "5B", avatarValue: "🐢" },
    { id: "d7a0f2aa-8799-4e5d-9c40-f2349439f8db", firstName: "Alvaro", lastName: "Flores", yearGroup: "Y5", className: "5B", avatarValue: "🦋" },
    { id: "997cb964-5fc9-4925-9ea4-2f2a5fc4037d", firstName: "Amelia", lastName: "Brown", yearGroup: "Y3", className: "3A", avatarValue: "🐬" },
    { id: "47fad258-2f72-42e7-8357-e81a1a845b56", firstName: "Amy", lastName: "Hughes", yearGroup: "Y6", className: "6A", avatarValue: "🐧" },
    { id: "2b78a5c7-8c7d-4a10-9101-0009d6f0d090", firstName: "Andrea", lastName: "Morales", yearGroup: "Y6", className: "6A", avatarValue: "🐶" },
    { id: "8611aab8-8676-4028-b565-766557f60717", firstName: "Anke", lastName: "Schneider", yearGroup: "Y5", className: "5B", avatarValue: "🐰" },
    { id: "1112c789-7983-4ad2-9013-677269335f77", firstName: "Antonio", lastName: "Suarez", yearGroup: "Y6", className: "6A", avatarValue: "🐺" },
    { id: "0faabc9d-396c-4f0c-9db1-e5c6342b3904", firstName: "Carlos", lastName: "Moreno", yearGroup: "Y4", className: "4A", avatarValue: "🐶" },
    { id: "f07c5d14-6882-41a8-906a-94d3e1e1cde7", firstName: "Carmen", lastName: "Diaz", yearGroup: "Y5", className: "5B", avatarValue: "🐶" },
    { id: "62c58255-e0eb-4ffa-955e-1c1097ce0f2b", firstName: "Charlotte", lastName: "Roberts", yearGroup: "Y5", className: "5B", avatarValue: "🐬" },
    { id: "02652d96-1f4d-4c64-8561-e9ae319688fe", firstName: "Chloe", lastName: "Petersen", yearGroup: "Y3", className: "3A", avatarValue: "🐧" },
    { id: "99b5ba4a-02d9-412d-a830-6c318129386d", firstName: "Clara", lastName: "Ortiz", yearGroup: "Y4", className: "4A", avatarValue: "🦉" },
    { id: "d0dda775-6a38-406c-934c-0e0db050df8f", firstName: "Daniel", lastName: "Harris", yearGroup: "Y4", className: "4A", avatarValue: "🐬" },
    { id: "e5125ab3-b1ae-4774-b866-a985316b2bbc", firstName: "David", lastName: "Castillo", yearGroup: "Y6", className: "6A", avatarValue: "🐨" },
    { id: "53cae15d-7202-48b8-aa17-da9f59e41d53", firstName: "Diego", lastName: "Torres", yearGroup: "Y3", className: "3A", avatarValue: "🦄" },
    { id: "77f66fae-343c-405c-9ab5-1e652d9f0623", firstName: "Dylan", lastName: "King", yearGroup: "Y5", className: "5B", avatarValue: "🦜" },
    { id: "e8c45313-d00d-40f4-a04b-54537bf5319d", firstName: "Elena", lastName: "Castro", yearGroup: "Y4", className: "4A", avatarValue: "🐨" },
    { id: "ca1bfeb5-4d76-47f8-854e-7bc90d47d7b0", firstName: "Emily", lastName: "Green", yearGroup: "Y6", className: "6A", avatarValue: "🐸" },
    { id: "5ee6fc8d-5d40-47be-bbfb-63b67d259456", firstName: "Emma", lastName: "de Vries", yearGroup: "Y3", className: "3A", avatarValue: "🐸" },
    { id: "6d6c9fe4-d68c-443a-8e33-5fd894d30ed9", firstName: "Ethan", lastName: "Davies", yearGroup: "Y3", className: "3A", avatarValue: "🦈" },
    { id: "c7266bbe-e3a2-413d-ae9c-7d85047f07b6", firstName: "Eva", lastName: "White", yearGroup: "Y4", className: "4A", avatarValue: "🐼" },
    { id: "b9ba03b6-8869-47bc-809e-eacb8010e81e", firstName: "Felix", lastName: "Bauer", yearGroup: "Y6", className: "6A", avatarValue: "🐰" },
    { id: "bb089873-1c44-4923-94f5-a74e5261fd60", firstName: "Finn", lastName: "van Dijk", yearGroup: "Y3", className: "3A", avatarValue: "🦜" },
    { id: "ccbeadbe-0180-46fe-a7bf-72b708442c6d", firstName: "Freya", lastName: "Anderson", yearGroup: "Y3", className: "3A", avatarValue: "🐼" },
    { id: "a84cb4f8-65bf-453d-accf-525d890351bd", firstName: "George", lastName: "Martin", yearGroup: "Y5", className: "5B", avatarValue: "🐻" },
    { id: "8ee956fd-657e-47a4-a9ea-cb9124ce593f", firstName: "Grace", lastName: "Edwards", yearGroup: "Y6", className: "6A", avatarValue: "🐢" },
    { id: "8d3023da-03de-4cb3-8faf-881dbb59d61a", firstName: "Hannah", lastName: "Meyer", yearGroup: "Y4", className: "4A", avatarValue: "🐧" },
    { id: "df5eb16d-6c2d-48fd-bad6-2cdc012aad22", firstName: "Hector", lastName: "Vargas", yearGroup: "Y5", className: "5B", avatarValue: "🦈" },
    { id: "ed06b600-b3be-4212-9f68-bcee15263ed9", firstName: "Hugo", lastName: "Moreno", yearGroup: "Y3", className: "3A", avatarValue: "🐨" },
    { id: "139aadb4-ff1f-4f13-948c-58c17e6b8e5a", firstName: "Hugo", lastName: "Lopez", yearGroup: "Y3", className: "3A", avatarValue: "🦉" },
    { id: "9efec090-a425-44a8-9ae5-1e85f4ab0e48", firstName: "Ines", lastName: "Vega", yearGroup: "Y5", className: "5B", avatarValue: "🦊" },
    { id: "c6927119-2b2d-4cab-8a07-73d82915d732", firstName: "Iris", lastName: "Young", yearGroup: "Y5", className: "5B", avatarValue: "🐼" },
    { id: "06db9736-b9b3-4d96-8736-6fe44c99dde8", firstName: "Isabel", lastName: "Hernandez", yearGroup: "Y6", className: "6A", avatarValue: "🦊" },
    { id: "eb421eb7-85a0-490b-b480-e414755451f7", firstName: "Isla", lastName: "Johnson", yearGroup: "Y3", className: "3A", avatarValue: "🐰" },
    { id: "1e57883c-ffda-455c-aa43-45e40d391a07", firstName: "Jack", lastName: "Wright", yearGroup: "Y6", className: "6A", avatarValue: "🐱" },
    { id: "ab56bfcd-4230-4942-9974-c7e8f676a2c2", firstName: "James", lastName: "Wilson", yearGroup: "Y4", className: "4A", avatarValue: "🐸" },
    { id: "b58b317c-03d2-4610-859c-1e567672f7cb", firstName: "Jan", lastName: "Schmidt", yearGroup: "Y4", className: "4A", avatarValue: "🐰" },
    { id: "02571b8d-ef98-43f0-a9df-cab396e61ea7", firstName: "Jorge", lastName: "Alonso", yearGroup: "Y6", className: "6A", avatarValue: "🦋" },
    { id: "4b52e453-617c-4f82-9628-ef72f2b254fb", firstName: "Julia", lastName: "Jansen", yearGroup: "Y4", className: "4A", avatarValue: "🐙" },
    { id: "a1140dd9-d688-42e7-806a-92c06e2995a6", firstName: "Lara", lastName: "Fischer", yearGroup: "Y3", className: "3A", avatarValue: "🐢" },
    { id: "03fb2841-435d-4eaa-83d2-ed14e3018f05", firstName: "Lars", lastName: "de Boer", yearGroup: "Y5", className: "5B", avatarValue: "🐯" },
    { id: "496876ad-e2dd-4082-8456-ec3fadd7b03d", firstName: "Lena", lastName: "Krause", yearGroup: "Y6", className: "6A", avatarValue: "🐼" },
    { id: "27f73b18-73ae-4d4e-abc9-8cee4c981541", firstName: "Leo", lastName: "Müller", yearGroup: "Y3", className: "3A", avatarValue: "🐨" },
    { id: "a8fb602f-5571-4508-a09e-9b9f5a523726", firstName: "Leo", lastName: "Hernandez", yearGroup: "Y4", className: "4A", avatarValue: "🐧" },
    { id: "6e967c0e-8bf0-4b7a-846b-0b7a6e3f678b", firstName: "Liam", lastName: "Cooper", yearGroup: "Y4", className: "4A", avatarValue: "🦜" },
    { id: "a927b987-3650-4d62-b193-cf6c01d45578", firstName: "Lily", lastName: "Thompson", yearGroup: "Y4", className: "4A", avatarValue: "🐱" },
    { id: "3ca79409-189b-445b-b375-2001088fe604", firstName: "Lotte", lastName: "Visser", yearGroup: "Y5", className: "5B", avatarValue: "🐙" },
    { id: "92bc90ea-d2b0-4c65-82dd-76d735b2ac41", firstName: "Lucas", lastName: "Romero", yearGroup: "Y3", className: "3A", avatarValue: "🦋" },
    { id: "dad73d4b-5d5c-4816-8c8c-7f526c540ac7", firstName: "Lucia", lastName: "Medina", yearGroup: "Y5", className: "5B", avatarValue: "🦉" },
    { id: "3e3065a4-6bb9-4db3-88b4-6f3f88ef0055", firstName: "Lucia", lastName: "Fernandez", yearGroup: "Y5", className: "5B", avatarValue: "🦋" },
    { id: "17e8253f-e234-4981-bd31-ce909b7638cd", firstName: "Luna", lastName: "Martinez", yearGroup: "Y3", className: "3A", avatarValue: "🦊" },
    { id: "5dbab546-9291-40fa-9567-ce4a2764d762", firstName: "Manuel", lastName: "Aguilar", yearGroup: "Y5", className: "5B", avatarValue: "🦄" },
    { id: "1c630296-f2ad-4f4d-80a1-e1bbf752cf58", firstName: "Marco", lastName: "Ruiz", yearGroup: "Y4", className: "4A", avatarValue: "🦊" },
    { id: "534ddf8d-b66c-474d-84a3-6cce29872711", firstName: "Maria", lastName: "Cruz", yearGroup: "Y5", className: "5B", avatarValue: "🐨" },
    { id: "109cb15d-5d7c-4c19-8145-3bdd9702f96f", firstName: "Mateo", lastName: "Santos", yearGroup: "Y3", className: "3A", avatarValue: "🐺" },
    { id: "058650a1-83ff-4b26-86f8-bb90c5775860", firstName: "Max", lastName: "Weber", yearGroup: "Y3", className: "3A", avatarValue: "🐱" },
    { id: "15e8d239-8e9d-469f-8446-58eec913914c", firstName: "Mia", lastName: "Williams", yearGroup: "Y3", className: "3A", avatarValue: "🐯" },
    { id: "5740c05c-4530-4a1f-b942-48436d28e62b", firstName: "Mia", lastName: "Torres", yearGroup: "Y3", className: "3A", avatarValue: "🐺" },
    { id: "aed8aa9b-ca0c-47a9-845b-9425698442c3", firstName: "Miguel", lastName: "Perez", yearGroup: "Y6", className: "6A", avatarValue: "🦉" },
    { id: "de50e3e6-452d-4ca1-836e-b43ece3db246", firstName: "Mila", lastName: "Smit", yearGroup: "Y6", className: "6A", avatarValue: "🐙" },
    { id: "8c4759b7-b45d-409c-b51b-d18525b2bc8d", firstName: "Nina", lastName: "Herrera", yearGroup: "Y3", className: "3A", avatarValue: "🐙" },
    { id: "436910bf-c1cd-4a3b-89e3-74f589ecf99b", firstName: "Noa", lastName: "Jimenez", yearGroup: "Y4", className: "4A", avatarValue: "🦋" },
    { id: "5792abc2-b16e-44e0-8a76-b972da1772fc", firstName: "Oliver", lastName: "Smith", yearGroup: "Y3", className: "3A", avatarValue: "🐻" },
    { id: "af585ca5-356b-4742-a573-baf91caa32af", firstName: "Olivia", lastName: "Scott", yearGroup: "Y6", className: "6A", avatarValue: "🐬" },
    { id: "8ff1c0da-1f76-41cb-ab38-e0328c8a2645", firstName: "Oscar", lastName: "Hall", yearGroup: "Y5", className: "5B", avatarValue: "🐱" },
    { id: "b4a3742c-fb0a-4420-a298-f30ec20319dd", firstName: "Pablo", lastName: "Fernandez", yearGroup: "Y3", className: "3A", avatarValue: "🦁" },
    { id: "29c21b59-15a9-45d6-bd2f-5a27d8242561", firstName: "Paula", lastName: "Reyes", yearGroup: "Y5", className: "5B", avatarValue: "🦁" },
    { id: "3330746d-2cc3-4a55-951d-29c9f1edf16f", firstName: "Rafael", lastName: "Gutierrez", yearGroup: "Y5", className: "5B", avatarValue: "🐺" },
    { id: "6c999eb2-fade-47d0-91d9-8161adbfee84", firstName: "Rocio", lastName: "Dominguez", yearGroup: "Y6", className: "6A", avatarValue: "🦁" },
    { id: "12e3e436-5da1-40b7-9c63-1c12f546e82e", firstName: "Ruby", lastName: "Clark", yearGroup: "Y4", className: "4A", avatarValue: "🐢" },
    { id: "72d06179-56f1-43c5-8ad3-c4a743757210", firstName: "Sebastian", lastName: "Molina", yearGroup: "Y4", className: "4A", avatarValue: "🦄" },
    { id: "1c4e8deb-e473-41a9-bca3-ab0e1a1f751d", firstName: "Sergio", lastName: "Mendez", yearGroup: "Y6", className: "6A", avatarValue: "🦈" },
    { id: "adb67095-ef12-4114-93e3-b55085c489ba", firstName: "Sofia", lastName: "Garcia", yearGroup: "Y3", className: "3A", avatarValue: "🐶" },
    { id: "426b3c22-17c5-4924-b21a-379727b24e66", firstName: "Sophie", lastName: "Taylor", yearGroup: "Y4", className: "4A", avatarValue: "🐻" },
    { id: "9283baca-b3dc-4ac6-a3a7-f73d32e82e6b", firstName: "Sophie", lastName: "de Jong", yearGroup: "Y6", className: "6A", avatarValue: "🐯" },
    { id: "1170de0e-2d3b-4940-9702-ad15da5b523b", firstName: "Thomas", lastName: "Robinson", yearGroup: "Y6", className: "6A", avatarValue: "🐻" },
    { id: "ef4c1366-3a85-4db2-a90f-e2e8f0b3ea20", firstName: "Tom", lastName: "Bakker", yearGroup: "Y4", className: "4A", avatarValue: "🐯" },
    { id: "db96a860-06a0-4437-9bbd-50d0fd4a0b24", firstName: "Valentina", lastName: "Navarro", yearGroup: "Y4", className: "4A", avatarValue: "🦁" },
    { id: "3dc320f9-4644-4e1c-9a5e-e097f875cf3b", firstName: "Victor", lastName: "Blanco", yearGroup: "Y6", className: "6A", avatarValue: "🦄" },
    { id: "5020a81f-b279-4f70-acd1-429ff0714ab8", firstName: "William", lastName: "Lewis", yearGroup: "Y5", className: "5B", avatarValue: "🐸" },
    { id: "81d94ceb-2202-46f2-8fb5-cb537a1b480d", firstName: "Zoe", lastName: "Mitchell", yearGroup: "Y5", className: "5B", avatarValue: "🐧" },
  ];

  for (const u of staffUsers) {
    await db.insert(usersTable).values({ ...u, schoolId: SCHOOL_ID });
  }

  for (const u of parentUsers) {
    await db.insert(usersTable).values({ ...u, schoolId: SCHOOL_ID });
  }

  for (const u of ptaUsers) {
    await db.insert(usersTable).values({ ...u, schoolId: SCHOOL_ID });
  }

  for (const p of pupils) {
    await db.insert(usersTable).values({
      id: p.id,
      schoolId: SCHOOL_ID,
      role: "pupil",
      firstName: p.firstName,
      lastName: p.lastName,
      pinHash: p.pinHash ?? PUPIL_PIN_HASH,
      yearGroup: p.yearGroup,
      className: p.className,
      avatarType: "animal",
      avatarValue: p.avatarValue,
    });
  }

  await db.insert(delegatedRolesTable).values([
    {
      schoolId: SCHOOL_ID,
      userId: SARAH_ID,
      roleType: "lopivi_delegate",
      mandateScope: "Full safeguarding coordination including LOPIVI compliance, incident management, and external referrals",
      trainingDate: new Date("2025-09-15"),
      trainingNotes: "Completed CAIB Delegat de Protecció certification course (40h)",
      appointedAt: new Date("2025-09-01"),
      expiresAt: new Date("2027-08-31"),
    },
    {
      schoolId: SCHOOL_ID,
      userId: SARAH_ID,
      roleType: "convivexit_coordinator",
      mandateScope: "Lead school coexistence and anti-bullying protocol implementation per Convivèxit 2024",
      trainingDate: new Date("2025-10-01"),
      trainingNotes: "Convivèxit protocol training — Conselleria d'Educació workshop",
      appointedAt: new Date("2025-09-01"),
      expiresAt: new Date("2027-08-31"),
    },
    {
      schoolId: SCHOOL_ID,
      userId: JAMES_C_ID,
      roleType: "machista_protocol_lead",
      mandateScope: "Oversight of machista violence protocol activation and external referral coordination",
      trainingDate: new Date("2025-11-10"),
      trainingNotes: "IB Dona training on educational centre protocol for machista violence",
      appointedAt: new Date("2025-09-01"),
      expiresAt: new Date("2027-08-31"),
    },
    {
      schoolId: SCHOOL_ID,
      userId: HELEN_ID,
      roleType: "senco_lead",
      mandateScope: "Special educational needs coordination and safeguarding support for vulnerable students",
      appointedAt: new Date("2025-09-01"),
      expiresAt: new Date("2027-08-31"),
    },
  ]);

  const bobDiary = [
    { mood: 4, note: "Library time today. I found a book about space that is really cool. Did you know Saturn has 146 moons?? That is mental.", createdAt: new Date("2026-03-06T17:11:00Z") },
    { mood: 4, note: "Played basketball at break. Our team won 12-8. I'm not very tall but I'm quick so I'm good at stealing the ball.", createdAt: new Date("2026-03-09T09:59:00Z") },
    { mood: 2, note: "Got in trouble for talking in class. It wasn't even me who started it but I got the blame. That's not fair.", createdAt: new Date("2026-03-12T15:52:00Z") },
    { mood: 5, note: "We did a science experiment with volcanoes!! Mine was the best eruption. Everyone clapped. I want to be a scientist now.", createdAt: new Date("2026-03-13T17:47:00Z") },
    { mood: 1, note: "I don't want to go to school tomorrow. Nothing happened really, I just feel sad and I don't know why. Maybe I'm just tired.", createdAt: new Date("2026-03-16T13:11:00Z") },
    { mood: 4, note: "Had a really nice chat with Mr Davies after class. He asked how I was doing and actually listened. It made me feel better about stuff.", createdAt: new Date("2026-03-19T10:52:00Z") },
    { mood: 2, note: "Some kids were whispering about me at lunch. I don't know what they were saying but it made me feel weird. I pretended I didn't notice.", createdAt: new Date("2026-03-20T12:41:00Z") },
    { mood: 4, note: "Art class was so fun today! We got to paint whatever we wanted and I did a sunset over the sea. Miss Torres said it was really good.", createdAt: new Date("2026-03-23T13:31:00Z") },
  ];

  for (const entry of bobDiary) {
    await db.insert(pupilDiaryTable).values({
      pupilId: BOB_ID,
      schoolId: SCHOOL_ID,
      mood: entry.mood,
      note: entry.note,
      createdAt: entry.createdAt,
    });
  }

  const otherDiary = [
    { pupilId: "15e8d239-8e9d-469f-8446-58eec913914c", mood: 5, note: "Great day! I love school.", createdAt: new Date("2025-09-26") },
    { pupilId: "5740c05c-4530-4a1f-b942-48436d28e62b", mood: 4, note: "Good day today, played with friends at break.", createdAt: new Date("2025-09-28") },
    { pupilId: "15e8d239-8e9d-469f-8446-58eec913914c", mood: 4, note: "OK day. Some people were a bit mean at break.", createdAt: new Date("2025-10-02") },
    { pupilId: "5740c05c-4530-4a1f-b942-48436d28e62b", mood: 3, note: "Boy A was mean to me but I tried to ignore it.", createdAt: new Date("2025-10-02T12:00:00Z") },
    { pupilId: "15e8d239-8e9d-469f-8446-58eec913914c", mood: 4, note: "Answered a question in class and felt good about it.", createdAt: new Date("2025-10-05") },
    { pupilId: "17e8253f-e234-4981-bd31-ce909b7638cd", mood: 4, note: "Told my teacher what happened. Glad I did.", createdAt: new Date("2025-10-06") },
    { pupilId: "15e8d239-8e9d-469f-8446-58eec913914c", mood: 3, note: "No one wanted me on their team today.", createdAt: new Date("2025-10-08") },
    { pupilId: "5740c05c-4530-4a1f-b942-48436d28e62b", mood: 2, note: "They won't let me join in. I sat alone at lunch.", createdAt: new Date("2025-10-09") },
    { pupilId: "15e8d239-8e9d-469f-8446-58eec913914c", mood: 3, note: "Charlotte said my answer was stupid. I don't want to put my hand up any more.", createdAt: new Date("2025-10-11") },
    { pupilId: "15e8d239-8e9d-469f-8446-58eec913914c", mood: 2, note: "They laughed when I spoke. I just want to be invisible.", createdAt: new Date("2025-10-14") },
    { pupilId: "17e8253f-e234-4981-bd31-ce909b7638cd", mood: 2, note: "Everyone calls me a snitch now. I wish I hadn't said anything.", createdAt: new Date("2025-10-14T12:00:00Z") },
    { pupilId: "5740c05c-4530-4a1f-b942-48436d28e62b", mood: 1, note: "Three of them surrounded me. I don't want to go to school.", createdAt: new Date("2025-10-16") },
    { pupilId: "15e8d239-8e9d-469f-8446-58eec913914c", mood: 2, note: "Sat alone at lunch. Nobody came to sit with me.", createdAt: new Date("2025-10-17") },
    { pupilId: "ca1bfeb5-4d76-47f8-854e-7bc90d47d7b0", mood: 3, note: "I want to be Luna's friend but Ethan says bad things will happen if I do.", createdAt: new Date("2025-10-17T12:00:00Z") },
    { pupilId: "17e8253f-e234-4981-bd31-ce909b7638cd", mood: 1, note: "Even my friends are scared to talk to me. I feel so alone.", createdAt: new Date("2025-10-19") },
    { pupilId: "15e8d239-8e9d-469f-8446-58eec913914c", mood: 1, note: "I don't want to go to school any more. Everything is horrible.", createdAt: new Date("2025-10-21") },
    { pupilId: "17e8253f-e234-4981-bd31-ce909b7638cd", mood: 1, note: "I'll never report anything again. It just makes everything worse.", createdAt: new Date("2025-10-22") },
    { pupilId: "5740c05c-4530-4a1f-b942-48436d28e62b", mood: 1, note: "They blocked the door. I'm scared every day now.", createdAt: new Date("2025-10-23") },
    { pupilId: "15e8d239-8e9d-469f-8446-58eec913914c", mood: 1, note: "I told Mum I felt sick so I didn't have to go in. I'm not really sick. I just can't face it.", createdAt: new Date("2025-10-24") },
  ];

  for (const entry of otherDiary) {
    await db.insert(pupilDiaryTable).values({
      pupilId: entry.pupilId,
      schoolId: SCHOOL_ID,
      mood: entry.mood,
      note: entry.note,
      createdAt: entry.createdAt,
    });
  }

  console.log("[seed] Demo data seeded successfully");
}
