import { useState } from "react";
import { Link } from "wouter";
import { useListIncidents } from "@workspace/api-client-react";
import { Card, CardContent, Button, Input } from "@/components/ui-polished";
import { formatDate } from "@/lib/utils";
import { Search, Filter, ShieldAlert, ArrowRight } from "lucide-react";

export default function IncidentsList() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useListIncidents({ limit: 50 });

  const incidents = data?.data || [];
  const filtered = incidents.filter(i => 
    i.category.toLowerCase().includes(search.toLowerCase()) || 
    i.referenceNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Incidents Log</h1>
          <p className="text-muted-foreground mt-1">Review and manage reported safeguarding incidents.</p>
        </div>
        <Link href="/report">
          <Button>File New Report</Button>
        </Link>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search by ref or category..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="shrink-0"><Filter size={18} className="mr-2"/> Filters</Button>
      </div>

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
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-xs font-bold text-muted-foreground">{inc.referenceNumber}</span>
                      <span className="px-2 py-0.5 rounded-sm bg-muted text-[10px] font-bold uppercase tracking-wider">
                        Tier {inc.escalationTier}
                      </span>
                      {inc.anonymous && (
                        <span className="px-2 py-0.5 rounded-sm bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider">
                          Anonymous
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-lg capitalize truncate">{inc.category.replace('_', ' ')} Incident</h3>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {inc.description || "No description provided."}
                    </p>
                  </div>
                  
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 sm:gap-1 border-t sm:border-t-0 border-border/50 pt-3 sm:pt-0 mt-3 sm:mt-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatDate(inc.incidentDate)}</p>
                      <p className={`text-xs font-bold capitalize ${inc.status === 'open' ? 'text-primary' : 'text-muted-foreground'}`}>
                        {inc.status.replace('_', ' ')}
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
              No incidents found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
