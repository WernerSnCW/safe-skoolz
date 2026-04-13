import { useListAlerts } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { formatDate } from "@/lib/utils";
import { Activity, AlertTriangle, ShieldAlert, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function AlertsList() {
  const { t } = useTranslation("alerts");
  const { data, isLoading } = useListAlerts({ limit: 50 });
  const alerts = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <Activity className="text-primary" size={32} /> {t("patternAlerts")}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          {t("automatedAlerts")}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl"></div>)}
        </div>
      ) : (
        <div className="grid gap-4">
          {alerts.map((alert, idx) => {
            const incidentIds = (alert as any).linkedIncidentIds || [];
            const firstIncidentId = incidentIds[0];

            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: idx * 0.05 }}
                key={alert.id}
              >
                <Card className={`border-l-4 ${alert.alertLevel === 'red' ? 'border-l-destructive bg-destructive/5' : 'border-l-warning bg-warning/5'}`}>
                  <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center">
                    <div className={`p-3 rounded-full shrink-0 ${alert.alertLevel === 'red' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'}`}>
                      {alert.alertLevel === 'red' ? <ShieldAlert size={28}/> : <AlertTriangle size={28}/>}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${alert.alertLevel === 'red' ? 'bg-destructive text-white' : 'bg-warning text-warning-foreground'}`}>
                          {alert.alertLevel} {t("alert")}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(alert.triggeredAt)}</span>
                      </div>
                      <h3 className="font-bold text-lg text-foreground">{alert.ruleLabel || t("behaviourPatternDetected")}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("systemIdentifiedPattern")} <strong>{alert.victimName || ''}</strong>. 
                        {t("linkedToRecent")}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 mt-2 sm:mt-0">
                      <span className={`text-xs font-bold uppercase px-3 py-1.5 rounded-full ${
                        alert.status === 'open' ? 'bg-background border border-border shadow-sm text-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {alert.status}
                      </span>
                      {firstIncidentId && (
                        <Link
                          href={`/incidents/${firstIncidentId}`}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <ExternalLink size={14} />
                          {t("viewIncident")}
                        </Link>
                      )}
                      {incidentIds.length > 1 && (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {incidentIds.slice(1).map((id: string, i: number) => (
                            <Link
                              key={id}
                              href={`/incidents/${id}`}
                              className="text-[10px] text-primary hover:underline px-2 py-0.5 rounded bg-primary/5 hover:bg-primary/10 transition-colors"
                            >
                              {t("incident")} {i + 2}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {alerts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {t("noActiveAlerts")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
