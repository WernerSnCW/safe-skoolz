import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetIncident, useUpdateIncidentStatus, useAssessIncident } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { formatDateTime, formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, MapPin, Calendar, User, ShieldAlert, CheckCircle, Clock, AlertTriangle, Users, FileText, Eye, EyeOff, Save, ClipboardList } from "lucide-react";

const STAFF_ROLES = ["teacher", "head_of_year", "coordinator", "head_teacher", "senco", "support_staff"];

export default function IncidentDetail() {
  const [, params] = useRoute("/incidents/:id");
  const id = params?.id || "";
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userRole = user?.role || "";
  const isStaff = STAFF_ROLES.includes(userRole);
  const canAssess = ["teacher", "head_of_year", "coordinator", "head_teacher", "senco"].includes(userRole);
  const canChangeStatus = ["coordinator", "head_teacher", "senco"].includes(userRole);
  
  const { data: inc, isLoading } = useGetIncident(id);
  const updateStatus = useUpdateIncidentStatus();
  const assessMutation = useAssessIncident();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessForm, setAssessForm] = useState({
    addedToFile: false,
    parentVisible: false,
    staffNotes: "",
    witnessStatements: "",
    parentSummary: "",
  });
  const [assessmentSaved, setAssessmentSaved] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      await updateStatus.mutateAsync({
        id,
        data: { status: newStatus }
      });
      queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${id}`] });
    } finally {
      setIsUpdating(false);
    }
  };

  const openAssessmentPanel = () => {
    const i = inc as any;
    setAssessForm({
      addedToFile: i?.addedToFile || false,
      parentVisible: i?.parentVisible || false,
      staffNotes: i?.staffNotes || "",
      witnessStatements: i?.witnessStatements || "",
      parentSummary: i?.parentSummary || "",
    });
    setAssessmentSaved(false);
    setShowAssessment(true);
  };

  const handleSaveAssessment = async () => {
    try {
      setIsUpdating(true);
      await assessMutation.mutateAsync({
        id,
        data: assessForm,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${id}`] });
      setAssessmentSaved(true);
      setTimeout(() => setAssessmentSaved(false), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="animate-pulse h-96 bg-muted rounded-2xl m-8"></div>;
  if (!inc) return <div className="p-8 text-center text-destructive">Incident not found</div>;

  const unknownDescs: any[] = (inc as any).unknownPersonDescriptions || [];
  const incAny = inc as any;

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
            {incAny.addedToFile && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                On File
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Reported on {formatDateTime(inc.createdAt)}
            {incAny.assessedByName && (
              <span className="ml-2 text-xs">
                — Assessed by {incAny.assessedByName} on {formatDate(incAny.assessedAt)}
              </span>
            )}
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

            {isStaff && (
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-border p-4 rounded-xl">
                  <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">Reporter</h4>
                  <div className="flex items-center gap-2 font-semibold">
                    <User size={16} className="text-muted-foreground"/>
                    {inc.anonymous ? 'Anonymous' : ((inc as any).reporterName || 'Unknown')}
                    <span className="text-xs font-normal text-muted-foreground">({(inc as any).reporterRole})</span>
                  </div>
                </div>
                <div className="border border-border p-4 rounded-xl">
                  <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">Victims</h4>
                  <div className="font-semibold">
                    {inc.victimNames && inc.victimNames.length > 0 ? inc.victimNames.join(', ') : 'Not specified'}
                  </div>
                </div>
              </div>
            )}

            {userRole === "parent" && inc.victimNames && inc.victimNames.length > 0 && (
              <div className="border border-border p-4 rounded-xl">
                <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">Involved</h4>
                <div className="font-semibold">{inc.victimNames.join(', ')}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {canChangeStatus && (
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
          )}

          {canAssess && (
            <Card className="border-primary/30">
              <CardHeader className="border-b border-border/50 bg-primary/5">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList size={18} /> Teacher Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {!showAssessment ? (
                  <Button onClick={openAssessmentPanel} className="w-full" variant="outline">
                    <FileText className="mr-2" size={16} />
                    {incAny.assessedAt ? 'Edit Assessment' : 'Start Assessment'}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assessForm.addedToFile}
                          onChange={(e) => setAssessForm(f => ({ ...f, addedToFile: e.target.checked }))}
                          className="rounded border-border"
                        />
                        <FileText size={14} />
                        Added to pupil file
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assessForm.parentVisible}
                          onChange={(e) => setAssessForm(f => ({ ...f, parentVisible: e.target.checked }))}
                          className="rounded border-border"
                        />
                        {assessForm.parentVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                        Share with parents
                      </label>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        Staff Notes
                      </label>
                      <textarea
                        value={assessForm.staffNotes}
                        onChange={(e) => setAssessForm(f => ({ ...f, staffNotes: e.target.value }))}
                        rows={3}
                        placeholder="Internal notes for staff only..."
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        Witness Statements
                      </label>
                      <textarea
                        value={assessForm.witnessStatements}
                        onChange={(e) => setAssessForm(f => ({ ...f, witnessStatements: e.target.value }))}
                        rows={3}
                        placeholder="Record what witnesses said..."
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        Summary for Parents
                      </label>
                      <textarea
                        value={assessForm.parentSummary}
                        onChange={(e) => setAssessForm(f => ({ ...f, parentSummary: e.target.value }))}
                        rows={3}
                        placeholder="What parents will see (no other children's names)..."
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This summary is what parents see. Never include other children's names.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSaveAssessment} 
                        disabled={isUpdating}
                        className="flex-1"
                      >
                        <Save className="mr-2" size={14} />
                        {isUpdating ? "Saving..." : "Save Assessment"}
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => setShowAssessment(false)}
                        className="text-muted-foreground"
                      >
                        Cancel
                      </Button>
                    </div>

                    {assessmentSaved && (
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium text-center">
                        Assessment saved successfully
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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

      {isStaff && incAny.staffNotes && !showAssessment && (
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText size={18} /> Staff Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="whitespace-pre-wrap text-sm">{incAny.staffNotes}</p>
          </CardContent>
        </Card>
      )}

      {isStaff && incAny.witnessStatements && !showAssessment && (
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users size={18} /> Witness Statements
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="whitespace-pre-wrap text-sm">{incAny.witnessStatements}</p>
          </CardContent>
        </Card>
      )}

      {isStaff && incAny.parentSummary && !showAssessment && (
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-lg flex items-center gap-2">
              {incAny.parentVisible ? <Eye size={18} /> : <EyeOff size={18} />}
              Parent Summary
              {incAny.parentVisible && (
                <span className="text-xs font-normal text-green-600 dark:text-green-400">(Shared with parents)</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="whitespace-pre-wrap text-sm">{incAny.parentSummary}</p>
          </CardContent>
        </Card>
      )}

      {unknownDescs.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users size={18} />
              Person Descriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unknownDescs.map((desc: any, i: number) => (
                <div key={i} className="border border-border rounded-xl p-4 space-y-3 bg-muted/10">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-muted-foreground">Person {i + 1}</p>
                    {desc.roleInIncident && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        desc.roleInIncident === "victim" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" :
                        desc.roleInIncident === "perpetrator" ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {desc.roleInIncident === "perpetrator" ? "involved" : desc.roleInIncident}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {desc.gender && (
                      <div>
                        <span className="text-muted-foreground text-xs block">Gender</span>
                        <span className="font-medium capitalize">{desc.gender}</span>
                      </div>
                    )}
                    {desc.staffOrPupil && (
                      <div>
                        <span className="text-muted-foreground text-xs block">Type</span>
                        <span className="font-medium capitalize">{desc.staffOrPupil}</span>
                      </div>
                    )}
                    {desc.ageRelation && (
                      <div>
                        <span className="text-muted-foreground text-xs block">Age</span>
                        <span className="font-medium capitalize">{desc.ageRelation}</span>
                      </div>
                    )}
                    {desc.yearGroup && (
                      <div>
                        <span className="text-muted-foreground text-xs block">Year group</span>
                        <span className="font-medium">{desc.yearGroup}</span>
                      </div>
                    )}
                    {desc.howMany > 1 && (
                      <div>
                        <span className="text-muted-foreground text-xs block">How many</span>
                        <span className="font-medium">{desc.howMany}</span>
                      </div>
                    )}
                  </div>
                  {desc.physicalDescription && (
                    <div>
                      <span className="text-muted-foreground text-xs block">Physical description</span>
                      <p className="text-sm font-medium mt-0.5">{desc.physicalDescription}</p>
                    </div>
                  )}
                  {desc.friendsWith && (
                    <div>
                      <span className="text-muted-foreground text-xs block">Friends with</span>
                      <p className="text-sm font-medium mt-0.5">{desc.friendsWith}</p>
                    </div>
                  )}
                  {desc.whereSeenThem && (
                    <div>
                      <span className="text-muted-foreground text-xs block">Where seen</span>
                      <p className="text-sm font-medium mt-0.5">{desc.whereSeenThem}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
