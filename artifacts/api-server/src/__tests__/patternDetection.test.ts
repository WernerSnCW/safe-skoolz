import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendEmail = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@workspace/db", () => {
  const mockInsertValues = vi.fn().mockResolvedValue(undefined);
  const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
  const mockSelect = vi.fn();

  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
    },
    patternAlertsTable: {
      id: "id",
      schoolId: "schoolId",
      ruleId: "ruleId",
      ruleLabel: "ruleLabel",
      alertLevel: "alertLevel",
      victimId: "victimId",
      perpetratorIds: "perpetratorIds",
      linkedIncidentIds: "linkedIncidentIds",
      status: "status",
    },
    incidentsTable: {},
    notificationsTable: {},
    usersTable: {
      id: "id",
      schoolId: "schoolId",
      role: "role",
      active: "active",
      email: "email",
      firstName: "firstName",
      lastName: "lastName",
    },
    schoolsTable: { id: "id", name: "name" },
    pupilDiaryTable: {},
  };
});

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  sql: vi.fn(),
  inArray: vi.fn(),
  lte: vi.fn(),
}));

vi.mock("../lib/emailHelper", () => ({
  sendEmail: mockSendEmail,
}));

import { db } from "@workspace/db";
import { createAlert } from "../lib/patternDetection";

const baseAlertData = {
  schoolId: "school-1",
  ruleId: "test_rule",
  ruleLabel: "Test alert",
  alertLevel: "amber",
  victimId: "victim-1",
  perpetratorIds: [] as string[],
  linkedIncidentIds: ["inc-1"],
};

function setupSelectMock(existingAlerts: any[], schoolRows?: any[], emailRecipients?: any[]) {
  const mockDb = db as any;
  let callCount = 0;

  mockDb.select.mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(existingAlerts),
          }),
        }),
      };
    }
    if (callCount === 2) {
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(schoolRows || [{ name: "Test School" }]),
        }),
      };
    }
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(emailRecipients || []),
      }),
    };
  });
}

describe("createAlert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("first call with unique ruleId + victimId + schoolId → db.insert called, returns true", async () => {
    setupSelectMock([]);
    const result = await createAlert(baseAlertData);
    expect(result).toBe(true);
    expect((db as any).insert).toHaveBeenCalled();
  });

  it("duplicate alert (same ruleId + victimId + schoolId, status open) → db.insert NOT called, returns false", async () => {
    setupSelectMock([{ id: "existing-alert-1" }]);
    const result = await createAlert(baseAlertData);
    expect(result).toBe(false);
    expect((db as any).insert).not.toHaveBeenCalled();
  });

  it("alertLevel 'red' → sendEmail called", async () => {
    setupSelectMock(
      [],
      [{ name: "Test School" }],
      [{ id: "coord-1", email: "coord@test.com", firstName: "Test", lastName: "Coord", role: "coordinator" }]
    );

    await createAlert({ ...baseAlertData, alertLevel: "red" });
    await new Promise((r) => setTimeout(r, 100));

    expect(mockSendEmail).toHaveBeenCalled();
  });

  it("alertLevel 'amber' → sendEmail called", async () => {
    setupSelectMock(
      [],
      [{ name: "Test School" }],
      [{ id: "coord-1", email: "coord@test.com", firstName: "Test", lastName: "Coord", role: "coordinator" }]
    );

    await createAlert({ ...baseAlertData, alertLevel: "amber" });
    await new Promise((r) => setTimeout(r, 100));

    expect(mockSendEmail).toHaveBeenCalled();
  });
});
