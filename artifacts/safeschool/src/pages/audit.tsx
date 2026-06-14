import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Loader2, Filter, X, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui-polished";
import { Button } from "@/components/ui-polished";

interface AuditRow {
  id: string;
  schoolId: string;
  eventType: string;
  actorRole: string | null;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditResponse {
  data: AuditRow[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface RetentionStatusCategory {
  category: string;
  retentionDays: number;
  lastRunAt: string | null;
  lastRunId: string | null;
  deletedCount: number | null;
  thresholdAt: string | null;
  ageMs: number | null;
  stale: boolean;
}

interface RetentionStatusResponse {
  staleThresholdMs: number;
  anyStale: boolean;
  categories: RetentionStatusCategory[];
  generatedAt: string;
}

const formatAge = (ms: number | null): string => {
  if (ms === null) return "never";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) {
    const mins = Math.max(1, Math.floor(ms / 60_000));
    return `${mins} min ago`;
  }
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatEventType = (et: string) =>
  et.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-GB", { month: "short" });
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hh}:${mm}`;
};

const shortId = (id: string | null) => (id ? id.slice(0, 8) : null);

const apiBase = (() => {
  const baseUrl = (import.meta as any).env?.BASE_URL || "/";
  return baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
})();

const authHeaders = () => {
  const token = localStorage.getItem("safeschool_token");
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

export default function AuditPage() {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [allRows, setAllRows] = useState<AuditRow[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data: retentionStatus, isLoading: retentionLoading } = useQuery<RetentionStatusResponse>({
    queryKey: ["/api/audit/retention-status"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}api/audit/retention-status`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load retention status");
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: eventTypesData } = useQuery<{ eventTypes: string[] }>({
    queryKey: ["/api/audit/event-types"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}api/audit/event-types`, { headers: authHeaders() });
      if (!res.ok) return { eventTypes: [] };
      return res.json();
    },
  });

  const { data, isLoading, isFetching } = useQuery<AuditResponse>({
    queryKey: ["/api/audit", eventTypeFilter, cursor],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (eventTypeFilter) params.set("eventType", eventTypeFilter);
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`${apiBase}api/audit?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load audit log");
      return res.json();
    },
  });

  useEffect(() => {
    if (!data?.data) return;
    if (!cursor) {
      setAllRows(data.data);
    } else {
      setAllRows((prev) => [...prev, ...data.data]);
      setLoadingMore(false);
    }
  }, [data, cursor]);

  const handleEventTypeChange = (value: string) => {
    setEventTypeFilter(value);
    setCursor(null);
    setAllRows([]);
  };

  const handleClearFilters = () => {
    if (!eventTypeFilter) return;
    setEventTypeFilter("");
    setCursor(null);
    setAllRows([]);
  };

  const handleLoadMore = () => {
    if (!data?.nextCursor) return;
    setLoadingMore(true);
    setCursor(data.nextCursor);
  };

  const eventTypes = useMemo(() => eventTypesData?.eventTypes ?? [], [eventTypesData]);
  const hasMore = !!data?.hasMore;
  const showInitialLoading = isLoading && allRows.length === 0;
  const filterActive = !!eventTypeFilter;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-muted text-muted-foreground">
          <ScrollText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            Complete record of all actions in this school
          </p>
        </div>
      </div>

      <Card
        data-testid="card-retention-status"
        className={
          retentionStatus?.anyStale
            ? "border-warning/40"
            : undefined
        }
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={
                "p-2 rounded-xl shrink-0 " +
                (retentionStatus?.anyStale
                  ? "bg-warning/15 text-warning"
                  : "bg-success/15 text-success")
              }
            >
              {retentionStatus?.anyStale ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold">Retention sweep status</h2>
                {retentionLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : retentionStatus?.anyStale ? (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                    Action needed
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/15 text-success">
                    Healthy
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Automated deletion of expired records. Alerts if any category
                hasn't run in the last 36 hours.
              </p>
              {retentionStatus && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {retentionStatus.categories.map((cat) => (
                    <div
                      key={cat.category}
                      data-testid={`retention-category-${cat.category}`}
                      className={
                        "rounded-lg border p-3 text-sm " +
                        (cat.stale
                          ? "border-warning/40 bg-warning/10"
                          : "border-border bg-muted/30")
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {formatEventType(cat.category)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {cat.retentionDays}d window
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Last run:{" "}
                        <span
                          className={
                            cat.stale
                              ? "font-semibold text-warning"
                              : "font-medium text-foreground"
                          }
                        >
                          {cat.lastRunAt ? formatAge(cat.ageMs) : "never"}
                        </span>
                        {cat.lastRunAt && (
                          <span className="ml-1">
                            ({formatDateTime(cat.lastRunAt)})
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Deleted last run:{" "}
                        <span className="font-medium text-foreground">
                          {cat.deletedCount ?? "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEventTypeChange("retention_sweep_completed")}
                  data-testid="button-view-retention-events"
                >
                  View all sweep events in log →
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </div>
            <select
              value={eventTypeFilter}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="select-event-type-filter"
            >
              <option value="">All events</option>
              {eventTypes.map((et) => (
                <option key={et} value={et}>{formatEventType(et)}</option>
              ))}
            </select>
            {filterActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-1" /> Clear filters
              </Button>
            )}
            <div className="ml-auto text-xs text-muted-foreground">
              {allRows.length > 0 && `${allRows.length} entr${allRows.length === 1 ? "y" : "ies"} loaded`}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {showInitialLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : allRows.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {filterActive
                ? "No entries match this filter."
                : "No audit log entries found."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date / Time</th>
                    <th className="px-4 py-3 font-semibold">Event</th>
                    <th className="px-4 py-3 font-semibold">Actor</th>
                    <th className="px-4 py-3 font-semibold">Target</th>
                    <th className="px-4 py-3 font-semibold">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allRows.map((row) => {
                    const actorIdShort = shortId(row.actorId);
                    const targetIdShort = shortId(row.targetId);
                    return (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-audit-${row.id}`}>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                          {formatDateTime(row.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium">
                            {formatEventType(row.eventType)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.actorId ? (
                            <div>
                              <div className="font-medium">{row.actorRole || "Unknown"}</div>
                              <div className="text-xs text-muted-foreground font-mono">{actorIdShort}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">System</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.targetType ? (
                            <div>
                              <div className="font-medium">{row.targetType}</div>
                              <div className="text-xs text-muted-foreground font-mono">{targetIdShort || "—"}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {row.ipAddress || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            onClick={handleLoadMore}
            disabled={loadingMore || isFetching}
            data-testid="button-load-more"
          >
            {loadingMore || isFetching ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…</>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
