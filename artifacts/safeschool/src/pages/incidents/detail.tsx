import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetIncident, useUpdateIncidentStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { formatDateTime, formatDate } from "@/lib/utils";
import { ArrowLeft, MapPin, Calendar, User, ShieldAlert, CheckCircle, Clock, AlertTriangle } from "lucide-react";

export default function IncidentDetail() {
  const [, params] = useRoute("/incidents/:id");
  const id = params?.id || "";
  const queryClient = useQueryClient();
  
  const { data: inc, isLoading } = useGetIncident(id);
  const updateStatus = useUpdateIncidentStatus();
  
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      await updateStatus.mutateAsync({
        id,
        data: { status: newStatus }
      });
      // Invalidate queries correctly
      queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${id}`] });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="animate-pulse h-96 bg-muted rounded-2xl m-8"></div>;
  if (!inc) return <div className="p-8 text-center text-destructive">Incident not found</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/incidents">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold">Incident {inc.referenceNumber}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              inc.status === 'open' ? 'bg-warning/20 text-warning' : 
              inc.status === 'under_review' ? 'bg-primary/20 text-primary' : 
              'bg-muted text-muted-foreground'
            }`}>
              {inc.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Reported on {formatDateTime(inc.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-wrap gap-4">
              <div className="bg-background border border-border p-3 rounded-xl flex items-center gap-3 flex-1 min-w-[200px]">
                <ShieldAlert className="text-primary" size={20}/>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Category</p>
                  <p className="font-semibold capitalize">{inc.category.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="bg-background border border-border p-3 rounded-xl flex items-center gap-3 flex-1 min-w-[200px]">
                <Calendar className="text-primary" size={20}/>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Date of Incident</p>
                  <p className="font-semibold">{formatDate(inc.incidentDate)}</p>
                </div>
              </div>
              <div className="bg-background border border-border p-3 rounded-xl flex items-center gap-3 flex-1 min-w-[200px]">
                <MapPin className="text-primary" size={20}/>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Location</p>
                  <p className="font-semibold capitalize">{inc.location || 'Not specified'}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
              <p className="bg-muted/30 p-4 rounded-xl text-foreground leading-relaxed whitespace-pre-wrap">
                {inc.description || 'No description provided.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-border p-4 rounded-xl">
                <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">Reporter</h4>
                <div className="flex items-center gap-2 font-semibold">
                  <User size={16} className="text-muted-foreground"/>
                  {inc.anonymous ? 'Anonymous' : (inc.reporterName || 'Unknown')}
                  <span className="text-xs font-normal text-muted-foreground">({inc.reporterRole})</span>
                </div>
              </div>
              <div className="border border-border p-4 rounded-xl">
                <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">Victims</h4>
                <div className="font-semibold">
                  {inc.victimNames && inc.victimNames.length > 0 ? inc.victimNames.join(', ') : 'Not specified'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-border/50 bg-muted/10">
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <Button 
                className="w-full justify-start" 
                variant={inc.status === 'open' ? 'default' : 'outline'}
                disabled={isUpdating || inc.status === 'open'}
                onClick={() => handleStatusChange('open')}
              >
                <AlertTriangle className="mr-2" size={18}/> Mark as Open
              </Button>
              <Button 
                className="w-full justify-start" 
                variant={inc.status === 'under_review' ? 'default' : 'outline'}
                disabled={isUpdating || inc.status === 'under_review'}
                onClick={() => handleStatusChange('under_review')}
              >
                <Clock className="mr-2" size={18}/> Mark Under Review
              </Button>
              <Button 
                className="w-full justify-start" 
                variant={inc.status === 'closed' ? 'secondary' : 'outline'}
                disabled={isUpdating || inc.status === 'closed'}
                onClick={() => handleStatusChange('closed')}
              >
                <CheckCircle className="mr-2" size={18}/> Close Incident
              </Button>

              <hr className="my-4 border-border" />
              
              {!inc.protocolId && (
                <Link href={`/protocols/new?incidentId=${inc.id}`}>
                  <Button className="w-full bg-slate-900 text-white hover:bg-slate-800">
                    Open Formal Protocol
                  </Button>
                </Link>
              )}
              {inc.protocolId && (
                <Link href={`/protocols/${inc.protocolId}`}>
                  <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/5">
                    View Linked Protocol
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-4">
              <h4 className="font-bold text-destructive flex items-center gap-2">
                <ShieldAlert size={18}/> Escalation Tier {inc.escalationTier}
              </h4>
              <p className="text-sm text-destructive/80 mt-2">
                {inc.escalationTier === 3 
                  ? "Immediate response required. High severity safeguarding risk." 
                  : inc.escalationTier === 2 
                  ? "Review required within 24 hours. Moderate risk."
                  : "Monitor and record. Low severity."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
