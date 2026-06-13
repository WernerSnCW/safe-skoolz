import type { User } from "@workspace/api-client-react";

export type MembershipState = "anon" | "pending" | "approved" | "exec";

const EXEC_ROLES = new Set(["pta", "coordinator", "head_teacher"]);

/** Mirror of the server isExecRole (memberDisplay.ts). 3 lines — duplicated by
 *  design; the canonical capability *values* come resolved from the server. */
export function isExecRole(role: string | null | undefined): boolean {
  return role != null && EXEC_ROLES.has(role);
}

/** The membership state that drives the unified nav (spec §6.1).
 *  Precedence: no user => anon; exec role => exec; else membershipStatus. */
export function getMembershipState(user: User | null | undefined): MembershipState {
  if (!user) return "anon";
  if (isExecRole(user.role)) return "exec";
  return user.membershipStatus === "pending" ? "pending" : "approved";
}
