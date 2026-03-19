import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, Button, Input } from "@/components/ui-polished";
import { formatDate } from "@/lib/utils";
import { Search, ShieldAlert, ArrowRight, Users, GraduationCap, X, Filter } from "lucide-react";

const CATEGORIES = [
  "verbal", "physical", "psychological", "online", "sexual",
  "exclusion", "neglect", "coercive",
];

const STATUSES = ["submitted", "open", "investigating", "escalated", "resolved", "closed"];

const YEAR_GROUPS = ["Y3", "Y4", "Y5", "Y6"];
const CLASSES = ["3A", "4A", "5B", "6A"];

interface Incident {
  id: string;
  referenceNumber: string;
  category: string;
  escalationTier: number;
  safeguardingTrigger: boolean;
  incidentDate: string;
  description: string | null;
  status: string;
  anonymous: boolean;
  reporterName?: string | null;
  victimNames?: string[];
  perpetratorNames?: string[];
}

export default function IncidentsList() {
  const { user } = useAuth();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState(urlParams.get("category") || "");
  const [filterStatus, setFilterStatus] = useState(urlParams.get("status") || "");
  const [filterYearGroup, setFilterYearGroup] = useState(urlParams.get("yearGroup") || "");
  const [filterClass, setFilterClass] = useState(urlParams.get("className") || "");
  const [filterPupilId, setFilterPupilId] = useState(urlParams.get("pupilId") || "");
  const [filterPupilName, setFilterPupilName] = useState(urlParams.get("pupilName") || "");
  const [showFilters, setShowFilters] = useState(!!filterCategory || !!filterStatus || !!filterYearGroup || !!filterClass || !!filterPupilId);

  const queryParams = new URLSearchParams();
  queryParams.set("limit", "100");
  if (filterCategory) queryParams.set("category", filterCategory);
  if (filterStatus) queryParams.set("status", filterStatus);
  if (filterYearGroup) queryParams.set("yearGroup", filterYearGroup);
  if (filterClass) queryParams.set("className", filterClass);
  if (filterPupilId) queryParams.set("pupilId", filterPupilId);

  const { data, isLoading } = useQuery<{ data: Incident[]; total: number }>({
    queryKey: ["/api/incidents", filterCategory, filterStatus, filterYearGroup, filterClass, filterPupilId],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch(`/api/incidents?${queryParams.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load incidents");
      return res.json();
    },
  });

  const incidents = data?.data || [];
  const filtered = search
    ? incidents.filter(i =>
        i.category.toLowerCase().includes(search.toLowerCase()) ||
        i.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
        (i.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.victimNames || []).some(n => n.toLowerCase().includes(search.toLowerCase())) ||
        (i.perpetratorNames || []).some(n => n.toLowerCase().includes(search.toLowerCase()))
      )
    : incidents;

  const activeFilterCount = [filterCategory, filterStatus, filterYearGroup, filterClass, filterPupilId].filter(Boolean).length;

  const clearFilters = () => {
    setFilterCategory("");
    setFilterStatus("");
    setFilterYearGroup("");
    setFilterClass("");
    setFilterPupilId("");
    setFilterPupilName("");
  };

  const pageTitle = filterPupilName
    ? `Incidents involving ${filterPupilName}`
    : filterYearGroup
    ? `Incidents — Year ${filterYearGroup}`
    : filterClass
    ? `Incidents — Class ${filterClass}`
    : "Incidents Log";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">{pageTitle}</h1>
          <p className="text-muted-foreground mt-1">
            {data ? `${data.total} incident${data.total !== 1 ? "s" : ""} found` : "Loading..."}
          </p>
        </div>
        <Link href="/report">
          <Button>File New Report</Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Search by ref, category, child name..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          className="shrink-0 relative"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} className="mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {showFilters && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold">Filter Incidents</p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X size={12} /> Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">All statuses</option>
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Year Group</label>
                <select
                  value={filterYearGroup}
                  onChange={(e) => { setFilterYearGroup(e.target.value); setFilterClass(""); }}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">All years</option>
                  {YEAR_GROUPS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Class</label>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">All classes</option>
                  {CLASSES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {filterPupilName && (
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold">
                  <Users size={12} />
                  Filtered to: {filterPupilName}
                  <button onClick={() => { setFilterPupilId(""); setFilterPupilName(""); }} className="ml-1 hover:text-destructive">
                    <X size={12} />
                  </button>
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl"></div>)}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(inc => (
            <Link key={inc.id} href={`/incidents/${inc.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <div className={`p-3 rounded-xl shrink-0 ${
                    inc.escalationTier === 3 ? 'bg-destructive/10 text-destructive' :
                    inc.escalationTier === 2 ? 'bg-warning/10 text-warning' :
                    'bg-secondary/10 text-secondary'
                  }`}>
                    <ShieldAlert size={24} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-muted-foreground">{inc.referenceNumber}</span>
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${
                        inc.escalationTier === 3 ? "bg-destructive/10 text-destructive" :
                        inc.escalationTier === 2 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        Tier {inc.escalationTier}
                      </span>
                      {inc.safeguardingTrigger && (
                        <span className="px-2 py-0.5 rounded-sm bg-destructive text-white text-[10px] font-bold uppercase tracking-wider">
                          Safeguarding
                        </span>
                      )}
                      {inc.anonymous && (
                        <span className="px-2 py-0.5 rounded-sm bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider">
                          Anonymous
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-lg capitalize truncate">
                      {inc.category.split(",").map(c => c.trim()).join(", ")} Incident
                    </h3>
                    {(inc.victimNames?.length || inc.perpetratorNames?.length) ? (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {inc.victimNames?.map((name, i) => (
                          <span key={`v-${i}`} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                            Victim: {name}
                          </span>
                        ))}
                        {inc.perpetratorNames?.map((name, i) => (
                          <span key={`p-${i}`} className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
                            Involved: {name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {inc.description || "No description provided."}
                    </p>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 sm:gap-1 border-t sm:border-t-0 border-border/50 pt-3 sm:pt-0 mt-3 sm:mt-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatDate(inc.incidentDate)}</p>
                      <p className={`text-xs font-bold capitalize ${
                        inc.status === "escalated" ? "text-destructive" :
                        inc.status === "investigating" ? "text-amber-600" :
                        inc.status === "open" ? "text-primary" :
                        "text-muted-foreground"
                      }`}>
                        {inc.status.replace("_", " ")}
                      </p>
                    </div>
                    <ArrowRight size={20} className="text-muted-foreground group-hover:text-primary transition-colors transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldAlert size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-bold">No incidents found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search terms.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
