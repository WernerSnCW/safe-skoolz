import { useListNotifications, useAcknowledgeNotification } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, Button } from "@/components/ui-polished";
import { formatDate } from "@/lib/utils";
import { Bell, Check, Info } from "lucide-react";
import { motion } from "framer-motion";

export default function NotificationsList() {
  const { data, isLoading } = useListNotifications({ limit: 50 });
  const ackMutation = useAcknowledgeNotification();
  const queryClient = useQueryClient();
  const notifications = data?.data || [];

  const handleAck = async (id: string) => {
    await ackMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary/10 text-primary p-3 rounded-xl">
          <Bell size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Notifications</h1>
          <p className="text-muted-foreground">Stay updated on important safeguarding alerts.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl"></div>)}
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif, i) => (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={notif.id}>
              <Card className={`transition-colors ${!notif.acknowledgedAt ? 'border-primary/30 shadow-md bg-primary/[0.02]' : 'opacity-70 bg-muted/20'}`}>
                <CardContent className="p-4 sm:p-5 flex items-start gap-4">
                  <div className={`p-2 rounded-full shrink-0 mt-1 ${!notif.acknowledgedAt ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Info size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-bold ${!notif.acknowledgedAt ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notif.subject || 'System Alert'}
                      </h4>
                      <span className="text-xs text-muted-foreground shrink-0 ml-4">
                        {formatDate(notif.sentAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {notif.body}
                    </p>
                  </div>
                  {!notif.acknowledgedAt && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="shrink-0 text-primary border-primary hover:bg-primary/10"
                      onClick={() => handleAck(notif.id)}
                      isLoading={ackMutation.isPending}
                    >
                      <Check size={16} className="mr-1"/> Ack
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
              <Bell size={40} className="mx-auto mb-4 opacity-20" />
              <p className="font-semibold">All caught up!</p>
              <p className="text-sm mt-1">You have no pending notifications.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
