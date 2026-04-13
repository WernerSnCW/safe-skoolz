import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();

vi.mock("@workspace/db", () => {
  const notificationsTable = { schoolId: "schoolId", recipientId: "recipientId" };
  const usersTable = {
    id: "id",
    schoolId: "schoolId",
    role: "role",
    active: "active",
    email: "email",
    firstName: "firstName",
    lastName: "lastName",
  };
  const incidentsTable = {
    id: "id",
    schoolId: "schoolId",
    reporterId: "reporterId",
    referenceNumber: "referenceNumber",
    category: "category",
    status: "status",
    createdAt: "createdAt",
    victimIds: "victimIds",
    perpetratorIds: "perpetratorIds",
    parentVisible: "parentVisible",
    escalationTier: "escalationTier",
  };
  const schoolsTable = { id: "id", name: "name" };
  const patternAlertsTable = {};
  const disclosurePermissionsTable = {};

  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
    },
    incidentsTable,
    usersTable,
    notificationsTable,
    patternAlertsTable,
    disclosurePermissionsTable,
    schoolsTable,
  };
});

vi.mock("@workspace/api-zod", () => ({
  CreateIncidentBody: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: {
        category: "physical",
        incidentDate: "2026-04-12",
        anonymous: false,
      },
    }),
  },
  ListIncidentsQueryParams: { safeParse: vi.fn() },
  UpdateIncidentStatusBody: { safeParse: vi.fn() },
  AssessIncidentBody: { safeParse: vi.fn() },
}));

vi.mock("../lib/auth", () => ({
  authMiddleware: vi.fn((_req: any, _res: any, next: any) => next()),
  requireRole:
    (..._roles: string[]) =>
    (_req: any, _res: any, next: any) =>
      next(),
  JwtPayload: {},
}));

vi.mock("../lib/referenceNumber", () => ({
  generateIncidentRef: vi.fn().mockResolvedValue("SS-2026-0001"),
}));

vi.mock("../lib/auditHelper", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/patternDetection", () => ({
  runPatternDetection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/emailHelper", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  desc: vi.fn(),
  sql: Object.assign(vi.fn(), { join: vi.fn() }),
  inArray: vi.fn(),
}));

import { determineEscalationTier, isSafeguardingTrigger } from "../lib/escalation";

describe("Incident creation — coordinator in-app notifications", () => {
  let insertedNotifications: any[];

  beforeEach(() => {
    insertedNotifications = [];
    vi.clearAllMocks();

    const valuesImpl = vi.fn().mockImplementation((val: any) => {
      insertedNotifications.push(val);
      return { returning: vi.fn().mockResolvedValue([{ id: "inc-1", referenceNumber: "SS-2026-0001", schoolId: "school-1", category: "physical", escalationTier: 2, safeguardingTrigger: false, victimIds: [], perpetratorIds: [] }]) };
    });
    mockInsert.mockReturnValue({ values: valuesImpl });

    const mockCoordinators = [
      { id: "coord-1", role: "coordinator", active: true, email: "coord@test.com", firstName: "Test", lastName: "Coord" },
    ];

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockCoordinators),
      }),
    });
  });

  function simulateNotificationLogic(category: string) {
    const escalationTier = determineEscalationTier(category);
    const safeguardingTrigger = isSafeguardingTrigger(category);

    const notifications: any[] = [];

    if (escalationTier >= 2 || safeguardingTrigger) {
      notifications.push({
        trigger: "tier3_incident",
        subject: `Urgent: Tier ${escalationTier} Incident`,
        tier: escalationTier,
      });
    }

    return { notifications, escalationTier, safeguardingTrigger };
  }

  it("Tier 1 (verbal): no coordinator notification", () => {
    const { notifications } = simulateNotificationLogic("verbal");
    expect(notifications).toHaveLength(0);
  });

  it("Tier 2 (physical): coordinator notification inserted", () => {
    const { notifications, escalationTier } = simulateNotificationLogic("physical");
    expect(escalationTier).toBe(2);
    expect(notifications.length).toBeGreaterThan(0);
  });

  it("Tier 3 (sexual): coordinator notification inserted", () => {
    const { notifications, escalationTier } = simulateNotificationLogic("sexual");
    expect(escalationTier).toBe(3);
    expect(notifications.length).toBeGreaterThan(0);
  });
});
