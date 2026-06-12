// The single source of the membership anonymity rule (spec §4.1).
// Anonymous members render as "A parent" to other parents; execs (and admins)
// always see the real name. One helper so the rule can never drift between
// the VOICE surfaces, the member lists, and any future member-facing list.

const EXEC_ROLES = new Set(["pta", "coordinator", "head_teacher"]);

/** True when the role is an exec/admin role that always sees real names. */
export function isExecRole(role: string | null | undefined): boolean {
  return role != null && EXEC_ROLES.has(role);
}

/** Resolve the name to show for a member given who is looking. */
export function memberDisplayName(
  member: { firstName?: string | null; lastName?: string | null; displayMode?: string | null },
  viewerIsExec: boolean,
): string {
  if (!viewerIsExec && member.displayMode === "anonymous") return "A parent";
  const real = `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim();
  return real || "A parent";
}
