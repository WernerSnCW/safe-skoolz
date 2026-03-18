import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, Button } from "@/components/ui-polished";
import { Users, GraduationCap, School, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Pupil {
  id: string;
  firstName: string;
  lastName: string;
  yearGroup: string | null;
  className: string | null;
  avatarType: string | null;
  avatarValue: string | null;
}

interface MyPupilsResponse {
  scope: string;
  scopeLabel: string;
  classes: Record<string, Pupil[]>;
}

function ScopeIcon({ scope }: { scope: string }) {
  if (scope === "class") return <Users size={48} />;
  if (scope === "year") return <GraduationCap size={48} />;
  return <School size={48} />;
}

function roleScopeDescription(role: string, scope: string, scopeLabel: string): string {
  if (role === "teacher") return `You are the class teacher for ${scopeLabel}`;
  if (role === "head_of_year") return `You are the Head of Year for ${scopeLabel}`;
  if (role === "head_teacher") return `You oversee all pupils at this school`;
  if (role === "coordinator") return `You oversee all pupils at this school`;
  if (role === "senco") return `You have access to all pupils for SEND monitoring`;
  if (role === "support_staff") return `Your assigned scope: ${scopeLabel}`;
  return `Viewing: ${scopeLabel}`;
}

export default function MyClass() {
  const { user } = useAuth();
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<MyPupilsResponse>({
    queryKey: ["/api/my-pupils"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/my-pupils", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load pupils");
      return res.json();
    },
  });

  if (!user) return null;

  const pageTitle =
    user.role === "head_of_year" ? "My Year Group" :
    user.role === "teacher" ? "My Class" :
    user.role === "support_staff" ? "My Pupils" :
    "All Pupils";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <p className="text-destructive">Failed to load pupil data.</p>
      </div>
    );
  }

  const classNames = Object.keys(data.classes).sort();
  const totalPupils = classNames.reduce((sum, c) => sum + data.classes[c].length, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center py-6">
        <div className="w-20 h-20 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
          <ScopeIcon scope={data.scope} />
        </div>
        <h1 className="text-3xl font-display font-bold">{pageTitle}</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          {roleScopeDescription(user.role, data.scope, data.scopeLabel)}
        </p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-bold">
            <Users size={16} /> {totalPupils} {totalPupils === 1 ? "pupil" : "pupils"}
          </span>
          <span className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full text-sm font-bold">
            <GraduationCap size={16} /> {classNames.length} {classNames.length === 1 ? "class" : "classes"}
          </span>
        </div>
      </div>

      {classNames.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No pupils found in your assigned scope.
          </CardContent>
        </Card>
      ) : classNames.length === 1 ? (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <GraduationCap size={20} className="text-primary" />
            Class {classNames[0]}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {data.classes[classNames[0]].map((pupil) => (
              <PupilCard key={pupil.id} pupil={pupil} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {classNames.map((className) => {
            const pupils = data.classes[className];
            const isExpanded = expandedClass === className || expandedClass === null;
            return (
              <Card key={className} className="overflow-hidden">
                <button
                  onClick={() => setExpandedClass(expandedClass === className ? null : className)}
                  className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold">
                      {className}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Class {className}</h3>
                      <p className="text-sm text-muted-foreground">{pupils.length} {pupils.length === 1 ? "pupil" : "pupils"}</p>
                    </div>
                  </div>
                  {expandedClass === className ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-0 pb-5">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {pupils.map((pupil) => (
                            <PupilCard key={pupil.id} pupil={pupil} />
                          ))}
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PupilCard({ pupil }: { pupil: Pupil }) {
  return (
    <div className="flex flex-col items-center p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl mb-2">
        {pupil.avatarValue || pupil.firstName.charAt(0)}
      </div>
      <p className="font-bold text-sm text-center">{pupil.firstName} {pupil.lastName}</p>
      <p className="text-xs text-muted-foreground">{pupil.yearGroup} · {pupil.className}</p>
    </div>
  );
}
