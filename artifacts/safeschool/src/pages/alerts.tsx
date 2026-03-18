import { useListAlerts } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { formatDate } from "@/lib/utils";
import { Activity, AlertTriangle, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function AlertsList() {
  const { data, isLoading } = useListAlerts({ limit: 50 });
  const alerts = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <Activity className="text-primary" size={32} /> Pattern Alerts
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Automated alerts triggered by the system detecting concerning patterns across multiple incidents (e.g., escalating behaviors, repeat victims).
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl"></div>)}
        </div>
      ) : (
        <div className="grid gap-4">
          {alerts.map((alert, idx) => (
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
                        {alert.alertLevel} Alert
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDate(alert.triggeredAt)}</span>
                    </div>
                    <h3 className="font-bold text-lg text-foreground">{alert.ruleLabel || 'Behavior Pattern Detected'}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      System identified a pattern involving <strong>{alert.victimName || 'multiple students'}</strong>. 
                      Linked to {alert.linkedIncidentIds?.length || 0} recent incidents.
                    </p>
                  </div>

                  <div className="sm:text-right mt-2 sm:mt-0">
                    <span className={`text-xs font-bold uppercase px-3 py-1.5 rounded-full ${
                      alert.status === 'open' ? 'bg-background border border-border shadow-sm text-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {alert.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {alerts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No active pattern alerts.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
