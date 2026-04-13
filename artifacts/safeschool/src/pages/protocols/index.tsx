import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useListProtocols } from "@workspace/api-client-react";
import { Card, CardContent, Button } from "@/components/ui-polished";
import { formatDate } from "@/lib/utils";
import { FileText, Shield, ArrowRight } from "lucide-react";

export default function ProtocolsList() {
  const { t } = useTranslation("protocols");
  const { data, isLoading } = useListProtocols({ limit: 50 });
  const protocols = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-bold">{t("safeguardingProtocols")}</h1>
          <p className="text-muted-foreground mt-1">{t("manageActive")}</p>
        </div>
        <Link href="/protocols/new">
          <Button><Shield className="mr-2" size={18}/> {t("openProtocol")}</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl"></div>)}
        </div>
      ) : (
        <div className="grid gap-4">
          {protocols.map(prot => (
            <Link key={prot.id} href={`/protocols/${prot.id}`}>
              <Card className="hover:border-primary/50 transition-all hover:shadow-md cursor-pointer group">
                <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="p-4 rounded-xl bg-slate-900 text-white shadow-inner shrink-0">
                    <FileText size={28} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm font-bold text-muted-foreground">{prot.referenceNumber}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        prot.status === 'open' ? 'bg-primary text-white' : 
                        prot.status === 'closed' ? 'bg-muted text-muted-foreground' : 
                        'bg-warning text-warning-foreground'
                      }`}>
                        {prot.status.replace('_', ' ')}
                      </span>
                      {prot.genderBasedViolence && (
                        <span className="px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-wider">
                          GBV
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-xl capitalize text-foreground">{prot.protocolType.replace(/_/g, ' ')}</h3>
                    <p className="text-sm text-muted-foreground mt-1 flex gap-4">
                      <span>{t("common:victims")}: <strong>{prot.victimName || t("common:unknown")}</strong></span>
                      <span>{t("opened")} {formatDate(prot.openedAt)}</span>
                    </p>
                  </div>
                  
                  <div className="hidden sm:block">
                    <Button variant="ghost" size="icon" className="group-hover:bg-primary/10 group-hover:text-primary">
                      <ArrowRight />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {protocols.length === 0 && (
            <div className="text-center py-16 px-4 bg-muted/30 rounded-3xl border border-border border-dashed">
              <Shield className="mx-auto text-muted-foreground/50 mb-4" size={48}/>
              <h3 className="text-lg font-bold text-foreground">{t("noActiveProtocols")}</h3>
              <p className="text-muted-foreground mt-1">{t("formalProtocolsAppear")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
