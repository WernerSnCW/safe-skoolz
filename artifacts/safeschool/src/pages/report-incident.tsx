import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCreateIncident } from "@workspace/api-client-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from "@/components/ui-polished";
import { AlertTriangle, CheckCircle2, ShieldCheck, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EMOTIONS = [
  { id: "scared", emoji: "😨", label: "Scared" },
  { id: "sad", emoji: "😢", label: "Sad" },
  { id: "angry", emoji: "😠", label: "Angry" },
  { id: "worried", emoji: "😟", label: "Worried" },
  { id: "confused", emoji: "😕", label: "Confused" },
  { id: "okay", emoji: "😐", label: "Okay" }
];

const CATEGORIES: { id: string; label: string; pupilLabel: string; hint: string }[] = [
  {
    id: "physical",
    label: "Physical",
    pupilLabel: "Physical",
    hint: "Hitting, pushing, kicking, throwing things at someone, or hurting someone's body."
  },
  {
    id: "verbal",
    label: "Verbal",
    pupilLabel: "Verbal",
    hint: "Name-calling, shouting, saying mean or hurtful things to someone."
  },
  {
    id: "psychological",
    label: "Psychological",
    pupilLabel: "Mind games",
    hint: "Making someone feel scared, worthless, or confused on purpose \u2014 like threatening, ignoring, or playing mind games."
  },
  {
    id: "sexual",
    label: "Sexual",
    pupilLabel: "Uncomfortable touching",
    hint: "Someone touching you in a way that feels wrong, showing you things that make you uncomfortable, or asking you to do something that doesn\u2019t feel right."
  },
  {
    id: "relational",
    label: "Relational",
    pupilLabel: "Leaving out",
    hint: "Deliberately leaving someone out, spreading rumours, or turning friends against someone."
  },
  {
    id: "coercive",
    label: "Coercive",
    pupilLabel: "Pressure / control",
    hint: "Forcing or pressuring someone to do things they don\u2019t want to, controlling who they can talk to, or making threats."
  },
  {
    id: "property",
    label: "Property",
    pupilLabel: "Property",
    hint: "Breaking, stealing, hiding or damaging someone\u2019s belongings on purpose."
  },
  {
    id: "online",
    label: "Online",
    pupilLabel: "Online",
    hint: "Cyberbullying, mean messages, sharing private photos, or being cruel on social media or chat."
  }
];

// Reusing the OpenAPI schema rules loosely
const formSchema = z.object({
  category: z.string().min(1, "Please select what happened"),
  incidentDate: z.string().min(1, "Date is required"),
  location: z.string().optional(),
  personInvolvedText: z.string().optional(),
  witnessText: z.string().optional(),
  description: z.string().optional(),
  emotionalState: z.string().optional(),
  happeningToMe: z.boolean().default(true),
  anonymous: z.boolean().default(false),
  childrenSeparated: z.boolean().optional(),
  coordinatorNotified: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ReportIncident() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const createMutation = useCreateIncident();
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      happeningToMe: true,
      anonymous: false,
      incidentDate: new Date().toISOString().split('T')[0]
    }
  });

  const isPupil = user?.role === "pupil";
  const watchCategory = watch("category");
  const watchEmotion = watch("emotionalState");
  const [openHint, setOpenHint] = useState<string | null>(null);

  const onSubmit = async (data: FormData) => {
    try {
      await createMutation.mutateAsync({
        data: {
          category: data.category,
          incidentDate: new Date(data.incidentDate).toISOString(),
          location: data.location,
          personInvolvedText: data.personInvolvedText || null,
          witnessText: data.witnessText || null,
          description: data.description,
          emotionalState: data.emotionalState,
          happeningToMe: data.happeningToMe,
          anonymous: data.anonymous,
          childrenSeparated: data.childrenSeparated,
          coordinatorNotified: data.coordinatorNotified,
        }
      });
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="text-center p-12 bg-primary/5 border-primary/20">
          <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/30">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4">Report Submitted</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Thank you for speaking up. We take every report seriously and will review it immediately.
            You are safe.
          </p>
          <Button size="lg" onClick={() => setLocation("/")}>Return to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Report an Incident</h1>
        <p className="text-muted-foreground mt-2">
          {isPupil 
            ? "Tell us what happened. You don't have to share your name if you don't want to." 
            : "Complete the safeguarding incident report. Ensure all immediate risks are handled."}
        </p>
      </div>

      <Card>
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Step 1: Category & Basic Info */}
            <div className="space-y-6">
              <div>
                <Label className="text-base mb-3">What kind of incident is this?</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {CATEGORIES.map(cat => (
                    <div key={cat.id} className="relative">
                      <button
                        type="button"
                        onClick={() => setValue("category", cat.id, { shouldValidate: true })}
                        className={`w-full p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                          watchCategory === cat.id 
                            ? "border-primary bg-primary/10 text-primary" 
                            : "border-border hover:border-primary/30 text-muted-foreground"
                        }`}
                      >
                        {isPupil ? cat.pupilLabel : cat.label}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setOpenHint(openHint === cat.id ? null : cat.id); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-colors"
                        aria-label={`What does ${isPupil ? cat.pupilLabel : cat.label} mean?`}
                      >
                        <Info size={12} />
                      </button>
                      <AnimatePresence>
                        {openHint === cat.id && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute z-10 top-full mt-2 left-0 right-0 p-3 rounded-xl bg-white border border-border shadow-lg text-xs text-foreground leading-relaxed"
                          >
                            {cat.hint}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
                {openHint && (
                  <div className="fixed inset-0 z-[5]" onClick={() => setOpenHint(null)} />
                )}
                {errors.category && <p className="text-destructive text-sm mt-2">{errors.category.message}</p>}
              </div>

              {isPupil && (
                <div>
                  <Label className="text-base mb-3">How are you feeling about it?</Label>
                  <div className="flex flex-wrap gap-3">
                    {EMOTIONS.map(emo => (
                      <button
                        key={emo.id}
                        type="button"
                        onClick={() => setValue("emotionalState", emo.id)}
                        className={`flex flex-col items-center p-3 rounded-xl border-2 min-w-[80px] transition-all ${
                          watchEmotion === emo.id
                            ? "border-secondary bg-secondary/10"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <span className="text-3xl mb-1">{emo.emoji}</span>
                        <span className="text-xs font-bold text-foreground">{emo.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="date">When did it happen?</Label>
                  <Input id="date" type="date" {...register("incidentDate")} />
                  {errors.incidentDate && <p className="text-destructive text-sm mt-1">{errors.incidentDate.message}</p>}
                </div>
                <div>
                  <Label htmlFor="location">Where did it happen? (optional)</Label>
                  <Input id="location" placeholder="e.g. Playground, Online..." {...register("location")} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="personInvolved">
                    {isPupil ? "Who was involved? (optional)" : "Person involved (optional)"}
                  </Label>
                  <Input
                    id="personInvolved"
                    placeholder={isPupil ? "Their name or nickname..." : "Name of person involved..."}
                    {...register("personInvolvedText")}
                  />
                </div>
                <div>
                  <Label htmlFor="witnesses">
                    {isPupil ? "Did anyone else see it? (optional)" : "Witnesses (optional)"}
                  </Label>
                  <Input
                    id="witnesses"
                    placeholder={isPupil ? "Names of anyone who saw..." : "Witness names..."}
                    {...register("witnessText")}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="desc">Can you tell us what happened?</Label>
                <textarea 
                  id="desc"
                  {...register("description")}
                  rows={4}
                  className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all resize-none"
                  placeholder="Type your message here..."
                ></textarea>
              </div>

              {isPupil && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                  <input 
                    type="checkbox" 
                    id="anon" 
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    {...register("anonymous")} 
                  />
                  <Label htmlFor="anon" className="mb-0 cursor-pointer font-bold">Keep this report anonymous</Label>
                </div>
              )}

              {/* Adult specific fields */}
              {!isPupil && (
                <div className="p-5 rounded-xl bg-muted/30 border border-border space-y-4">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck size={18} className="text-primary"/>
                    Staff Safeguarding Checks
                  </h4>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sep" className="mb-0 cursor-pointer">Were the children separated immediately?</Label>
                    <input type="checkbox" id="sep" className="w-5 h-5 rounded" {...register("childrenSeparated")} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="coord" className="mb-0 cursor-pointer">Has the Safeguarding Coordinator been notified?</Label>
                    <input type="checkbox" id="coord" className="w-5 h-5 rounded" {...register("coordinatorNotified")} />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" size="lg" isLoading={createMutation.isPending} className="w-full md:w-auto">
                Submit Report securely
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
