import { useState } from "react";
import {
  useListPtaMembers,
  useListPtaOfficers,
  useListPtaMemberCandidates,
  useAddPtaMember,
  useUpdatePtaMember,
  useRemovePtaMember,
  useAppointPtaOfficer,
  useEndPtaOfficer,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { Users, UserPlus, ShieldCheck, X, Trash2, Crown } from "lucide-react";

const TIERS = [
  { value: "executive_board", label: "Executive Board" },
  { value: "senior_group", label: "Senior Group" },
  { value: "general_membership", label: "General Membership" },
];
const STATUSES = [
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "lapsed", label: "Lapsed" },
];
const OFFICER_ROLES = [
  { value: "president", label: "President" },
  { value: "vice_president", label: "Vice President" },
  { value: "chair", label: "Chair" },
  { value: "vice_chair", label: "Vice Chair" },
  { value: "secretary", label: "Secretary" },
  { value: "treasurer", label: "Treasurer" },
  { value: "domain_lead", label: "Domain Lead" },
];
const labelOf = (list: { value: string; label: string }[], v: string) =>
  list.find((x) => x.value === v)?.label ?? v;

const selectCls =
  "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function PtaGovernance() {
  const membersQ = useListPtaMembers();
  const officersQ = useListPtaOfficers();
  const candidatesQ = useListPtaMemberCandidates();
  const addMember = useAddPtaMember();
  const updateMember = useUpdatePtaMember();
  const removeMember = useRemovePtaMember();
  const appointOfficer = useAppointPtaOfficer();
  const endOfficer = useEndPtaOfficer();

  const [newUserId, setNewUserId] = useState("");
  const [newTier, setNewTier] = useState("general_membership");
  const [appointFor, setAppointFor] = useState<string | null>(null);
  const [appointRole, setAppointRole] = useState("chair");
  const [appointDomain, setAppointDomain] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const members = (membersQ.data as any)?.members ?? [];
  const officers = (officersQ.data as any)?.officers ?? [];
  const candidates = (candidatesQ.data as any)?.candidates ?? [];

  const refresh = () => { membersQ.refetch(); officersQ.refetch(); candidatesQ.refetch(); };
  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try { await fn(); refresh(); }
    catch (e: any) { setErr(e?.message || "Something went wrong"); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 pb-24">
      <header>
        <p className="text-xs font-mono uppercase tracking-widest text-primary/70 flex items-center gap-2">
          <Users className="w-3.5 h-3.5" /> PTA · Governance
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-1">Members &amp; Officers</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Your membership roster and officer appointments. Tiers record responsibility taken on — not authority.
          Equal standing throughout.
        </p>
      </header>

      {err && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      {/* Officers */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Crown className="w-4 h-4 text-primary" /> Officers</CardTitle></CardHeader>
        <CardContent>
          {officers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No officers appointed yet. Appoint one from a member below.</p>
          ) : (
            <ul className="divide-y divide-border">
              {officers.map((o: any) => (
                <li key={o.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="font-medium text-foreground">{labelOf(OFFICER_ROLES, o.role)}</span>
                    {o.domain && <span className="text-muted-foreground"> · {o.domain}</span>}
                    <span className="text-muted-foreground"> — {o.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => run(() => endOfficer.mutateAsync({ id: o.id }))}>
                    <X className="w-4 h-4 mr-1" /> End
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Add member */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> Add a member</CardTitle></CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No eligible community members to add.</p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Person</span>
                <select className={selectCls} value={newUserId} onChange={(e) => setNewUserId(e.target.value)}>
                  <option value="">Choose…</option>
                  {candidates.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.role})</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Tier</span>
                <select className={selectCls} value={newTier} onChange={(e) => setNewTier(e.target.value)}>
                  {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <Button
                disabled={!newUserId || addMember.isPending}
                onClick={() => run(async () => { await addMember.mutateAsync({ data: { userId: newUserId, tier: newTier } }); setNewUserId(""); setNewTier("general_membership"); })}
              >
                Add member
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roster */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Roster ({members.length})</CardTitle></CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-mono uppercase tracking-wide text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Member</th>
                    <th className="py-2 pr-3">Tier</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Offices</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m: any) => (
                    <tr key={m.id} className="border-b border-border/50">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-foreground">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <select className={selectCls} value={m.tier}
                          onChange={(e) => run(() => updateMember.mutateAsync({ id: m.id, data: { tier: e.target.value } }))}>
                          {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </td>
                      <td className="py-2.5 pr-3">
                        <select className={selectCls} value={m.status}
                          onChange={(e) => run(() => updateMember.mutateAsync({ id: m.id, data: { status: e.target.value } }))}>
                          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </td>
                      <td className="py-2.5 pr-3">
                        {m.offices?.length
                          ? m.offices.map((o: any, i: number) => (
                              <span key={i} className="inline-flex items-center gap-1 mr-1 mb-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                                <ShieldCheck className="w-3 h-3" />{labelOf(OFFICER_ROLES, o.role)}{o.domain ? `: ${o.domain}` : ""}
                              </span>
                            ))
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center justify-end gap-2">
                          {appointFor === m.id ? (
                            <div className="flex items-center gap-1.5">
                              <select className={selectCls} value={appointRole} onChange={(e) => setAppointRole(e.target.value)}>
                                {OFFICER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                              </select>
                              {appointRole === "domain_lead" && (
                                <input className={selectCls + " w-28"} placeholder="Domain" value={appointDomain} onChange={(e) => setAppointDomain(e.target.value)} />
                              )}
                              <Button size="sm" onClick={() => run(async () => {
                                await appointOfficer.mutateAsync({ data: { memberId: m.id, role: appointRole, ...(appointRole === "domain_lead" ? { domain: appointDomain } : {}) } });
                                setAppointFor(null); setAppointRole("chair"); setAppointDomain("");
                              })}>Confirm</Button>
                              <Button size="sm" variant="ghost" onClick={() => setAppointFor(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => { setAppointFor(m.id); setErr(null); }}>
                                <Crown className="w-3.5 h-3.5 mr-1" /> Appoint
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => run(() => removeMember.mutateAsync({ id: m.id }))}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
