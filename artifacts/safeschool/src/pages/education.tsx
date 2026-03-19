import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-polished";
import { BookOpen, Shield, Heart, Users, AlertTriangle, CheckCircle2, HelpCircle, HandHeart, Eye, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "pupils" | "staff" | "parents";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "pupils", label: "For Pupils", icon: Users },
  { id: "staff", label: "For Staff", icon: Shield },
  { id: "parents", label: "For Parents", icon: Heart },
];

function AccordionItem({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <Icon size={20} className="text-primary shrink-0" />
          <span className="font-bold text-sm">{title}</span>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-muted-foreground">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 pt-1 text-sm text-foreground leading-relaxed space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PupilContent() {
  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <h2 className="text-xl font-display font-bold mb-2">You deserve to feel safe</h2>
          <p className="text-muted-foreground">
            Everyone has the right to feel safe, happy, and respected at school. If something doesn't feel right, it's always okay to tell someone. You are never alone.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <AccordionItem title="What is bullying?" icon={HelpCircle}>
          <p>Bullying is when someone keeps being unkind to you <strong>on purpose</strong>, and it happens <strong>more than once</strong>. It's not just falling out with a friend or having a bad day — it's a pattern of behaviour that makes you feel scared, sad, or alone.</p>
          <p>Bullying can look like:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Physical</strong> — hitting, pushing, kicking, or taking your things</li>
            <li><strong>Verbal</strong> — name-calling, shouting, or saying mean things</li>
            <li><strong>Leaving out</strong> — deliberately not including someone, spreading rumours, or turning friends against someone</li>
            <li><strong>Online</strong> — sending mean messages, sharing embarrassing photos, or being cruel on social media</li>
            <li><strong>Pressure / control</strong> — forcing someone to do things they don't want to, or threatening them</li>
          </ul>
          <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20 mt-2">
            <p className="font-bold text-secondary">Remember: if it happens once it might be unkind. If it keeps happening, it's bullying — and you should tell someone.</p>
          </div>
        </AccordionItem>

        <AccordionItem title="What is NOT bullying?" icon={CheckCircle2}>
          <p>Not everything that feels bad is bullying. These things can still be upsetting, but they are different:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>A one-off argument with a friend</li>
            <li>Someone accidentally bumping into you</li>
            <li>Not being picked for a team</li>
            <li>A teacher telling you off for breaking a rule</li>
            <li>Friends having a disagreement and then making up</li>
          </ul>
          <p>If any of these things keep happening on purpose, then it might become bullying — and you should still tell someone.</p>
        </AccordionItem>

        <AccordionItem title="What should I do if I'm being bullied?" icon={Shield}>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <span className="bg-primary text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <div>
                <p className="font-bold">Tell a trusted adult</p>
                <p className="text-muted-foreground">Talk to a teacher, parent, school counsellor, or any grown-up you trust. You can also use SafeSchool to report it — even anonymously.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="bg-primary text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <div>
                <p className="font-bold">Stay with friends</p>
                <p className="text-muted-foreground">Try to stay near people you feel safe with. Bullies often pick on people who are on their own.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="bg-primary text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <div>
                <p className="font-bold">Walk away if you can</p>
                <p className="text-muted-foreground">If it feels safe, walking away and telling an adult is a really brave thing to do. You don't have to argue or get pulled into a fight.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="bg-primary text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <div>
                <p className="font-bold">It's okay to protect yourself</p>
                <p className="text-muted-foreground">If someone is physically hurting you and you can't walk away or get help, you have the right to protect yourself. Self-defence means doing what you need to stay safe — not to hurt someone back, but to stop yourself from being hurt. Always tell a trusted adult afterwards.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="bg-primary text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">5</span>
              <div>
                <p className="font-bold">Keep evidence of online bullying</p>
                <p className="text-muted-foreground">If someone is being mean online, take screenshots before blocking them. Show these to an adult.</p>
              </div>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem title="What if I see someone else being bullied?" icon={Eye}>
          <p>If you see bullying happening to someone else, you can help:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Don't join in</strong> — even laughing can make the person being bullied feel worse</li>
            <li><strong>Tell an adult</strong> — this isn't "snitching" or "telling tales", it's looking out for someone</li>
            <li><strong>Be kind afterwards</strong> — check on the person. Ask if they're okay. Include them.</li>
            <li><strong>Use SafeSchool</strong> — you can report what you saw, even if it didn't happen to you</li>
          </ul>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mt-2">
            <p className="font-bold text-primary">Being a good friend means speaking up when something isn't right.</p>
          </div>
        </AccordionItem>

        <AccordionItem title="Your body, your rules" icon={Heart}>
          <p>Your body belongs to you. Nobody has the right to touch you in a way that makes you feel uncomfortable — not another child, not a teenager, not an adult.</p>
          <p>If someone:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Touches you in a way you don't like</li>
            <li>Shows you pictures or videos that make you feel uncomfortable</li>
            <li>Asks you to keep a secret that feels wrong</li>
            <li>Makes you do something that doesn't feel right</li>
          </ul>
          <p><strong>Tell a trusted adult straight away.</strong> It is never your fault. You will not get in trouble.</p>
        </AccordionItem>

        <AccordionItem title="Feelings are okay" icon={MessageCircle}>
          <p>When something bad happens, you might feel:</p>
          <div className="flex flex-wrap gap-2 my-2">
            {[
              { emoji: "\u{1F628}", label: "Scared" },
              { emoji: "\u{1F622}", label: "Sad" },
              { emoji: "\u{1F620}", label: "Angry" },
              { emoji: "\u{1F61F}", label: "Worried" },
              { emoji: "\u{1F615}", label: "Confused" },
              { emoji: "\u{1F614}", label: "Embarrassed" },
              { emoji: "\u{1F614}", label: "Lonely" },
            ].map(f => (
              <span key={f.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm">
                <span className="text-lg">{f.emoji}</span> {f.label}
              </span>
            ))}
          </div>
          <p><strong>All of these feelings are completely normal.</strong> You don't have to deal with them alone. Talking about how you feel is one of the bravest things you can do.</p>
        </AccordionItem>
      </div>
    </div>
  );
}

function StaffContent() {
  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <h2 className="text-xl font-display font-bold mb-2">Your role in safeguarding</h2>
          <p className="text-muted-foreground">
            Every member of staff has a duty of care. Knowing how to recognise, respond to, and report safeguarding concerns is essential. This guide covers the key frameworks and your responsibilities under LOPIVI, Convivèxit, and Machista Violence protocols.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <AccordionItem title="Recognising signs of bullying" icon={Eye}>
          <p>Children may not always tell you directly. Watch for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Sudden changes in behaviour or mood</li>
            <li>Reluctance to come to school or participate</li>
            <li>Unexplained injuries or damaged belongings</li>
            <li>Withdrawal from friends or social situations</li>
            <li>Decline in academic performance</li>
            <li>Frequent complaints of feeling unwell (headaches, stomach aches)</li>
            <li>Changes in eating or sleeping patterns</li>
            <li>Becoming aggressive or disruptive (sometimes victims act out)</li>
          </ul>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mt-2 dark:bg-amber-950/20 dark:border-amber-800">
            <p className="font-bold text-amber-700 dark:text-amber-400">Trust your instinct. If something feels wrong, record it and report it. It's better to raise a concern that turns out to be nothing than to miss something serious.</p>
          </div>
        </AccordionItem>

        <AccordionItem title="How to respond when a child discloses" icon={MessageCircle}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
                <p className="font-bold text-green-700 dark:text-green-400 text-xs uppercase tracking-wider mb-2">Do</p>
                <ul className="list-disc pl-4 space-y-1 text-sm">
                  <li>Listen calmly and take them seriously</li>
                  <li>Reassure them: "You did the right thing telling me"</li>
                  <li>Use their own words — don't suggest or lead</li>
                  <li>Explain what will happen next (in age-appropriate terms)</li>
                  <li>Record exactly what was said as soon as possible</li>
                  <li>Report to the Safeguarding Coordinator immediately</li>
                </ul>
              </div>
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800">
                <p className="font-bold text-red-700 dark:text-red-400 text-xs uppercase tracking-wider mb-2">Don't</p>
                <ul className="list-disc pl-4 space-y-1 text-sm">
                  <li>Promise confidentiality — you may need to share the information</li>
                  <li>Ask leading questions or investigate yourself</li>
                  <li>Show shock, disgust, or disbelief</li>
                  <li>Confront the alleged perpetrator</li>
                  <li>Share with colleagues who don't need to know</li>
                  <li>Delay — report concerns the same day</li>
                </ul>
              </div>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem title="Convivèxit protocol (anti-bullying)" icon={Shield}>
          <p>The Convivèxit 2024 protocol applies to all forms of peer-on-peer bullying. Key steps:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Immediate action:</strong> Separate the children involved and ensure safety</li>
            <li><strong>Record:</strong> Log the incident on SafeSchool with full details</li>
            <li><strong>Notify:</strong> Inform the Safeguarding Coordinator same day</li>
            <li><strong>Risk assessment:</strong> Complete the structured risk assessment (low/medium/high/critical) with risk and protective factors</li>
            <li><strong>Formal protocol:</strong> If escalation is needed, open a formal protocol linking to the incident</li>
            <li><strong>Parent notification:</strong> Inform parents of both victim and perpetrator as appropriate</li>
            <li><strong>Follow-up:</strong> Monitor through case tasks and review at agreed intervals</li>
          </ol>
        </AccordionItem>

        <AccordionItem title="LOPIVI protocol (safeguarding)" icon={AlertTriangle}>
          <p>LOPIVI (Ley Orgánica de Protección Integral a la Infancia y la Adolescencia frente a la Violencia) covers broader safeguarding concerns including neglect, abuse, and welfare.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Duty to report:</strong> All staff have a legal obligation to report suspected abuse or neglect</li>
            <li><strong>LOPIVI delegates:</strong> Your school has appointed LOPIVI protection delegates — know who they are</li>
            <li><strong>Escalation:</strong> Tier 3 incidents (sexual, coercive) require immediate Coordinator notification</li>
            <li><strong>External referral:</strong> May need to refer to Servicios Sociales, Fiscalía de Menores, or Policía Nacional</li>
            <li><strong>Record keeping:</strong> All actions must be documented in the protocol audit trail</li>
          </ul>
        </AccordionItem>

        <AccordionItem title="Machista Violence protocol (gender-based)" icon={AlertTriangle}>
          <p>The CAIB (Govern de les Illes Balears) Machista Violence protocol applies when incidents involve gender-based violence or coercive control. This includes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Sexual harassment or assault</li>
            <li>Coercive or controlling behaviour based on gender</li>
            <li>Digital sexual violence (sharing intimate images, sexting pressure)</li>
          </ul>
          <p className="mt-2"><strong>Key actions:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Flag the protocol as "Gender-based violence" when opening</li>
            <li>The system auto-selects Machista Violence protocol type for sexual/coercive categories</li>
            <li>External referral to IB-Dona or relevant body may be required</li>
            <li>Specific risk and protective factors apply — complete the structured assessment</li>
          </ul>
        </AccordionItem>

        <AccordionItem title="Using SafeSchool effectively" icon={BookOpen}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Report promptly:</strong> Log incidents the same day they are observed or disclosed</li>
            <li><strong>Be specific:</strong> Use exact words the child used, note times, locations, and witnesses</li>
            <li><strong>Use structured fields:</strong> Select the correct category, location from the dropdown, and identify people by name using the search</li>
            <li><strong>Risk assessment:</strong> When opening a protocol, complete all risk and protective factors — this drives the escalation and review process</li>
            <li><strong>Case tasks:</strong> Use protocol tasks to track follow-up actions (interviews, parent meetings, reviews)</li>
            <li><strong>Pattern alerts:</strong> The system automatically flags patterns — review these in the Alerts section</li>
          </ul>
        </AccordionItem>
      </div>
    </div>
  );
}

function ParentContent() {
  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <h2 className="text-xl font-display font-bold mb-2">Supporting your child</h2>
          <p className="text-muted-foreground">
            As a parent, you play a vital role in helping your child feel safe and supported. This guide will help you recognise the signs, know what to do, and understand how the school handles concerns.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <AccordionItem title="Signs your child might be experiencing bullying" icon={Eye}>
          <p>Children don't always tell their parents what's happening at school. Look out for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Not wanting to go to school, or finding excuses to stay home</li>
            <li>Coming home upset, angry, or withdrawn</li>
            <li>Unexplained injuries, damaged clothes, or missing belongings</li>
            <li>Changes in appetite or difficulty sleeping</li>
            <li>Becoming anxious about using their phone or computer</li>
            <li>Asking for extra money (might be giving it to a bully)</li>
            <li>Changes in friendships — suddenly not seeing certain friends</li>
            <li>Saying things like "nobody likes me" or "I have no friends"</li>
          </ul>
        </AccordionItem>

        <AccordionItem title="How to talk to your child about bullying" icon={MessageCircle}>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <HandHeart size={20} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Create a safe space to talk</p>
                <p className="text-muted-foreground">Choose a calm, private moment. Don't force it — sometimes the best conversations happen during a car journey or at bedtime. Let them know you're always available to listen.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <HandHeart size={20} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Ask open questions</p>
                <p className="text-muted-foreground">Instead of "Are you being bullied?", try "How are things at school?", "Who did you play with today?", or "Is there anything worrying you?"</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <HandHeart size={20} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Listen without overreacting</p>
                <p className="text-muted-foreground">If your child does open up, stay calm. They need to feel that telling you was the right decision, not that it's going to make things worse. Validate their feelings: "That sounds really hard. I'm glad you told me."</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <HandHeart size={20} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Never blame them</p>
                <p className="text-muted-foreground">Avoid asking "What did you do?" or suggesting they should fight back. Make it clear that bullying is never their fault.</p>
              </div>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem title="What to do if your child is being bullied" icon={Shield}>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Reassure your child</strong> — tell them it's not their fault and that you will help sort it out together</li>
            <li><strong>Contact the school</strong> — speak to your child's class teacher or the Safeguarding Coordinator. You can also use SafeSchool to submit a formal concern</li>
            <li><strong>Keep records</strong> — note dates, times, what happened, and who was involved. Save screenshots of any online bullying</li>
            <li><strong>Agree a plan with the school</strong> — the school will follow the appropriate protocol (Convivèxit, LOPIVI, or Machista Violence) and keep you informed</li>
            <li><strong>Monitor and follow up</strong> — check in with your child regularly and contact the school again if the situation doesn't improve</li>
          </ol>
        </AccordionItem>

        <AccordionItem title="Supporting your child's wellbeing" icon={Heart}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Build confidence</strong> — encourage activities outside school where they can make friends and feel good about themselves</li>
            <li><strong>Practice responses</strong> — role-play scenarios so they feel more prepared (e.g. walking away, saying "stop, I don't like that")</li>
            <li><strong>Online safety</strong> — know which apps and platforms they use, set up parental controls, and talk about safe online behaviour</li>
            <li><strong>Encourage friendships</strong> — invite school friends over, support them in joining clubs or activities</li>
            <li><strong>Seek professional help if needed</strong> — if your child's emotional wellbeing is significantly affected, speak to your GP or ask the school about counselling support</li>
          </ul>
        </AccordionItem>

        <AccordionItem title="If your child is accused of bullying" icon={HelpCircle}>
          <p>This can be upsetting to hear, but try to stay calm and work with the school:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Listen to what the school tells you without being defensive</li>
            <li>Talk to your child privately — ask for their version, but make clear that bullying is not acceptable</li>
            <li>Help them understand how their actions affect others</li>
            <li>Work with the school on a behaviour plan</li>
            <li>Consider whether something is going on that might be causing your child to act this way (stress, problems at home, being bullied themselves)</li>
          </ul>
        </AccordionItem>

        <AccordionItem title="How SafeSchool keeps you informed" icon={BookOpen}>
          <ul className="list-disc pl-5 space-y-1">
            <li>You can log into SafeSchool with your parent account to view your children's reported incidents</li>
            <li>You will receive notifications when your child is involved in an incident</li>
            <li>You can submit concerns directly through the Report Incident form</li>
            <li>The school will contact you separately for formal protocol discussions</li>
            <li>All information is kept confidential and handled according to data protection regulations</li>
          </ul>
        </AccordionItem>
      </div>
    </div>
  );
}

export default function Education() {
  const { user } = useAuth();
  const role = user?.role || "pupil";

  const isPupil = role === "pupil";
  const isParent = role === "parent";
  const isStaff = !isPupil && !isParent;

  const availableTabs = isPupil
    ? TABS.filter(t => t.id === "pupils")
    : isParent
    ? TABS.filter(t => t.id === "pupils" || t.id === "parents")
    : TABS;

  const defaultTab: Tab = isPupil ? "pupils" : isParent ? "parents" : "staff";
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  const showTabs = availableTabs.length > 1;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <BookOpen size={28} className="text-primary" />
          {isPupil ? "Learn About Staying Safe" : "Education Centre"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isPupil
            ? "Everything you need to know about staying safe, being a good friend, and getting help."
            : "Learn about bullying, safeguarding, and how we all work together to keep everyone safe."
          }
        </p>
      </div>

      {showTabs && (
        <div className="flex gap-2 p-1 bg-muted/50 rounded-xl border border-border">
          {availableTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "pupils" && <PupilContent />}
          {activeTab === "staff" && isStaff && <StaffContent />}
          {activeTab === "parents" && (isParent || isStaff) && <ParentContent />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
