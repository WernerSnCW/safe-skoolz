import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-polished";
import { BookOpen, Shield, Heart, Users, AlertTriangle, CheckCircle2, HelpCircle, HandHeart, Eye, MessageCircle, Lightbulb, RefreshCw, Scale } from "lucide-react";
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

type QuizQuestion = {
  scenario: string;
  options: { label: string; value: string; emoji: string }[];
  correct: string;
  explanation: string;
  level: string;
  levelColor: string;
};

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    scenario: "Sam accidentally bumps into you in the corridor and says sorry.",
    options: [
      { label: "An accident — not bullying", value: "accident", emoji: "✅" },
      { label: "Unkind behaviour", value: "unkind", emoji: "😕" },
      { label: "Bullying", value: "bullying", emoji: "🚨" },
    ],
    correct: "accident",
    explanation: "This was an accident. Sam didn't mean to and said sorry. Everyone bumps into people sometimes — it's not unkind or bullying.",
    level: "Not bullying",
    levelColor: "text-green-600",
  },
  {
    scenario: "A group of children laugh at your drawing in art class and call it rubbish, but it only happens once.",
    options: [
      { label: "An accident — not bullying", value: "accident", emoji: "✅" },
      { label: "Unkind behaviour", value: "unkind", emoji: "😕" },
      { label: "Bullying", value: "bullying", emoji: "🚨" },
    ],
    correct: "unkind",
    explanation: "This is unkind. It would hurt your feelings and it wasn't nice — but if it only happens once, it's an unkind moment rather than bullying. If it keeps happening, it could become bullying.",
    level: "Unkind — but not bullying yet",
    levelColor: "text-amber-600",
  },
  {
    scenario: "Every day at lunch, the same person takes your seat on purpose and their friends block you from sitting down. It's been going on for two weeks.",
    options: [
      { label: "An accident — not bullying", value: "accident", emoji: "✅" },
      { label: "Unkind behaviour", value: "unkind", emoji: "😕" },
      { label: "Bullying", value: "bullying", emoji: "🚨" },
    ],
    correct: "bullying",
    explanation: "This is bullying. It's deliberate, it keeps happening, and a group is involved. Being purposely excluded every day is a pattern of bullying behaviour — you should tell a trusted adult.",
    level: "Bullying",
    levelColor: "text-red-600",
  },
  {
    scenario: "Your friend doesn't want to play the game you chose at break time. They want to play something else.",
    options: [
      { label: "A normal disagreement", value: "accident", emoji: "✅" },
      { label: "Unkind behaviour", value: "unkind", emoji: "😕" },
      { label: "Bullying", value: "bullying", emoji: "🚨" },
    ],
    correct: "accident",
    explanation: "This is totally normal! Friends don't always agree on everything. Disagreeing about what to play is just part of friendship — not bullying.",
    level: "Normal friendship",
    levelColor: "text-green-600",
  },
  {
    scenario: "Someone in your class keeps sending you mean messages on a group chat, calling you names. When you ask them to stop, they create a new group without you and share screenshots making fun of you.",
    options: [
      { label: "Just joking around", value: "accident", emoji: "✅" },
      { label: "Unkind behaviour", value: "unkind", emoji: "😕" },
      { label: "Cyberbullying", value: "bullying", emoji: "🚨" },
    ],
    correct: "bullying",
    explanation: "This is cyberbullying. Repeated name-calling, excluding you, and sharing embarrassing things online is serious. Screenshot the messages and tell a trusted adult straight away.",
    level: "Cyberbullying",
    levelColor: "text-red-600",
  },
  {
    scenario: "A classmate says something rude to you because they're having a really bad day. The next day they come and apologise.",
    options: [
      { label: "A bad moment — not bullying", value: "accident", emoji: "✅" },
      { label: "Unkind behaviour", value: "unkind", emoji: "😕" },
      { label: "Bullying", value: "bullying", emoji: "🚨" },
    ],
    correct: "unkind",
    explanation: "This was unkind, and it's okay to feel hurt by it. But they recognised it was wrong and apologised. Everyone has bad days — what matters is that they took responsibility.",
    level: "Unkind but resolved",
    levelColor: "text-amber-600",
  },
  {
    scenario: "An older pupil keeps pushing you in the corridor, takes your snack at break, and tells you not to say anything or 'it'll be worse'. This happens several times a week.",
    options: [
      { label: "Just messing around", value: "accident", emoji: "✅" },
      { label: "Unkind behaviour", value: "unkind", emoji: "😕" },
      { label: "Serious bullying", value: "bullying", emoji: "🚨" },
    ],
    correct: "bullying",
    explanation: "This is serious bullying with physical intimidation and threats. The person is using their size/age to scare you. You must tell a trusted adult — threats like 'don't tell anyone' are a sign you definitely should tell someone.",
    level: "Serious bullying — tell an adult now",
    levelColor: "text-red-600",
  },
];

function BullyingQuiz() {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = QUIZ_QUESTIONS[currentQ];

  const handleSelect = (value: string) => {
    if (answered) return;
    setSelected(value);
    setAnswered(true);
    if (value === q.correct) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (currentQ + 1 >= QUIZ_QUESTIONS.length) {
      setFinished(true);
    } else {
      setCurrentQ(c => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const handleRestart = () => {
    setCurrentQ(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    const allCorrect = score === QUIZ_QUESTIONS.length;
    const mostCorrect = score >= QUIZ_QUESTIONS.length - 1;
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardContent className="p-6 text-center space-y-4">
          <div className="text-4xl">{allCorrect ? "🌟" : mostCorrect ? "👏" : "💪"}</div>
          <h3 className="text-lg font-display font-bold">
            {allCorrect ? "Amazing! You got them all right!" : mostCorrect ? "Great job! Nearly perfect!" : `You scored ${score} out of ${QUIZ_QUESTIONS.length}`}
          </h3>
          <p className="text-sm text-muted-foreground">
            {allCorrect
              ? "You really understand the difference between accidents, unkind moments, and bullying. That knowledge will help you look out for yourself and others."
              : "Knowing the difference between an accident, something unkind, and bullying helps you decide what to do. Remember — if something keeps happening on purpose and it makes you feel bad, tell a trusted adult."}
          </p>
          <div className="pt-2">
            <button
              onClick={handleRestart}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              <RefreshCw size={14} /> Try Again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="border-b border-border/50 bg-primary/5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <HelpCircle size={18} className="text-primary" /> Can you tell the difference?
          </CardTitle>
          <span className="text-xs text-muted-foreground font-mono">{currentQ + 1} / {QUIZ_QUESTIONS.length}</span>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
          <p className="text-sm font-medium leading-relaxed">{q.scenario}</p>
        </div>

        <div className="space-y-2">
          {q.options.map(opt => {
            const isSelected = selected === opt.value;
            const isCorrect = opt.value === q.correct;
            let borderClass = "border-border hover:border-primary/50 hover:bg-primary/5";
            if (answered) {
              if (isCorrect) borderClass = "border-green-400 bg-green-50 dark:bg-green-950/30";
              else if (isSelected && !isCorrect) borderClass = "border-red-300 bg-red-50 dark:bg-red-950/30";
              else borderClass = "border-border opacity-60";
            }
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                disabled={answered}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${borderClass}`}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span className="text-sm font-medium">{opt.label}</span>
                {answered && isCorrect && <CheckCircle2 size={16} className="ml-auto text-green-600" />}
                {answered && isSelected && !isCorrect && <AlertTriangle size={16} className="ml-auto text-red-500" />}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className={`rounded-xl p-4 ${selected === q.correct ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800" : "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"}`}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${q.levelColor}`}>
                  {q.level}
                </p>
                <p className="text-sm leading-relaxed">{q.explanation}</p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleNext}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  {currentQ + 1 >= QUIZ_QUESTIONS.length ? "See my score" : "Next question →"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
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

      <Card className="border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20">
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-lg font-display font-bold mb-2 flex items-center gap-2">
            <Scale size={20} className="text-indigo-600 dark:text-indigo-400" />
            Your Rights
          </h2>
          <p className="text-sm text-foreground/70 mb-4">These are things every child is entitled to. They are part of the law and the school's duty of care.</p>
          <div className="grid grid-cols-1 gap-2.5">
            {[
              { emoji: "\uD83D\uDEE1\uFE0F", text: "You have the right to feel safe at school — nobody should hurt you, scare you, or make you feel bad about yourself" },
              { emoji: "\uD83D\uDDE3\uFE0F", text: "You have the right to be listened to — when you tell an adult something, they must take it seriously" },
              { emoji: "\uD83D\uDD12", text: "You have the right to privacy — your diary is private, and your personal information is protected" },
              { emoji: "\u2696\uFE0F", text: "You have the right to be treated fairly — no matter who you are, where you come from, or what language you speak" },
              { emoji: "\uD83D\uDCAC", text: "You have the right to say how you feel — your feelings and opinions matter and should be respected" },
              { emoji: "\uD83E\uDD1D", text: "You have the right to get help — if something is wrong, adults in school must help you, not ignore you" },
              { emoji: "\uD83D\uDCDA", text: "You have the right to understand what's happening — if a report involves you, the school should explain what they are doing and why" },
              { emoji: "\u2764\uFE0F", text: "You have the right to support — whether you are the person who was hurt or the person who did something wrong, you deserve help" },
            ].map((right, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-zinc-900/50 border border-indigo-100 dark:border-indigo-900/30">
                <span className="text-lg shrink-0 mt-0.5">{right.emoji}</span>
                <p className="text-sm leading-relaxed text-foreground/90">{right.text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-foreground/50 mt-4 italic">These rights come from the UN Convention on the Rights of the Child, Spanish LOPIVI law, and the Balearic Islands Convivèxit protocol.</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <AccordionItem title="What happens when you tell someone?" icon={Shield}>
          <p>When you report something or an adult notices something is wrong, here is exactly what happens — step by step.</p>

          <p className="font-bold mt-3">Step 1 — Someone listens</p>
          <p>A trusted adult (your teacher, the school counsellor, or the Safeguarding Coordinator) will listen carefully to what you say. They won't judge you, rush you, or tell you off. They will write down what you told them so they don't forget anything.</p>

          <p className="font-bold mt-3">Step 2 — They work out how serious it is</p>
          <p>Not every problem needs the same response. The school uses a system to decide what to do:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Green (low concern)</strong> — a one-off unkind moment. Your teacher will keep an eye on things and check in with you</li>
            <li><strong>Amber (medium concern)</strong> — something that keeps happening, or something that really upset you. The Safeguarding Coordinator gets involved</li>
            <li><strong>Red (serious concern)</strong> — bullying, someone hurting you, or anything that makes you feel unsafe. A formal plan is made to protect you</li>
          </ul>

          <p className="font-bold mt-3">Step 3 — A plan is made</p>
          <p>For serious situations, the school follows official rules called <strong>protocols</strong>. These are legal rules that the school must follow:</p>
          <div className="space-y-2 mt-2">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
              <p className="font-bold text-blue-700 dark:text-blue-400 text-xs uppercase tracking-wider mb-1">Convivèxit — Anti-Bullying Protocol</p>
              <p className="text-sm">Used when someone is being bullied. The school investigates, talks to everyone involved, tries to fix the problem, and checks on you afterwards to make sure it stopped.</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 dark:bg-purple-950/20 dark:border-purple-800">
              <p className="font-bold text-purple-700 dark:text-purple-400 text-xs uppercase tracking-wider mb-1">LOPIVI — Child Protection</p>
              <p className="text-sm">Used when a child might be in danger — at school or at home. The school gets help from outside professionals (like social workers) to make sure you are safe.</p>
            </div>
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-800">
              <p className="font-bold text-rose-700 dark:text-rose-400 text-xs uppercase tracking-wider mb-1">Machista Violence Protocol</p>
              <p className="text-sm">Used when someone is being treated badly because of their gender. There are special rules and extra support for these situations.</p>
            </div>
          </div>

          <p className="font-bold mt-3">Step 4 — You are kept safe</p>
          <p>While the adults sort things out, your safety comes first. This might mean:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Making sure you and the other person are kept apart</li>
            <li>A teacher checking in with you every day</li>
            <li>Changing seating plans or break-time arrangements</li>
            <li>Your parents being told what is happening</li>
          </ul>

          <p className="font-bold mt-3">Step 5 — Someone checks on you afterwards</p>
          <p>Even after things are sorted, the school will check on you again later to make sure the problem hasn't come back. If it does, they'll act again straight away.</p>

          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mt-3">
            <p className="font-bold text-primary">The most important thing: you will never get in trouble for asking for help. Telling someone is always the right thing to do.</p>
          </div>
        </AccordionItem>

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

        <BullyingQuiz />

        <AccordionItem title="What should I do if I'm being bullied?" icon={Shield}>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <span className="bg-primary text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <div>
                <p className="font-bold">Tell a trusted adult</p>
                <p className="text-muted-foreground">Talk to a teacher, parent, school counsellor, or any grown-up you trust. You can also use safeskoolz to report it — even anonymously.</p>
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
            <li><strong>Use safeskoolz</strong> — you can report what you saw, even if it didn't happen to you</li>
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
              { emoji: "😨", label: "Scared" },
              { emoji: "😢", label: "Sad" },
              { emoji: "😠", label: "Angry" },
              { emoji: "😟", label: "Worried" },
              { emoji: "😕", label: "Confused" },
              { emoji: "😳", label: "Embarrassed" },
              { emoji: "😔", label: "Lonely" },
            ].map(f => (
              <span key={f.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm">
                <span className="text-lg">{f.emoji}</span> {f.label}
              </span>
            ))}
          </div>
          <p><strong>All of these feelings are completely normal.</strong> You don't have to deal with them alone. Talking about how you feel is one of the bravest things you can do.</p>
        </AccordionItem>

        <AccordionItem title="Have you been unkind to someone?" icon={Lightbulb}>
          <p>If you have been mean to someone, pushed them around, left them out on purpose, or said hurtful things — the fact that you're reading this shows something important about you. <strong>It means you care.</strong></p>

          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/5 border border-primary/20 mt-2 mb-3">
            <p className="text-base font-bold text-primary">Doing something bad does not make you a bad person.</p>
            <p className="text-sm text-muted-foreground mt-1">Good people sometimes do unkind things. What makes the difference is what you do next. The fact that you're here, reading this, already proves you're not the person the unkind behaviour suggests you are.</p>
          </div>

          <p className="font-bold mt-3">You are not alone in this</p>
          <p>Research shows that most young people who are unkind to others are dealing with difficult things themselves. You might recognise some of these:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Things are hard at home</strong> — arguments, stress, or feeling like nobody notices how you feel. When you're hurting inside, it can come out as hurting others</li>
            <li><strong>Someone was unkind to you first</strong> — many children who bully have been bullied themselves. Hurt gets passed on like a chain — but you can be the one who breaks it</li>
            <li><strong>Peer pressure</strong> — you went along with something because your friends were doing it, or because you were scared of being left out. That doesn't make it right, but it's a reason adults understand</li>
            <li><strong>You feel angry a lot</strong> — and you don't know why or what to do with it. So it comes out at the wrong people</li>
            <li><strong>You wanted to feel powerful</strong> — because in other parts of your life you feel powerless. That's more common than you think</li>
            <li><strong>You didn't realise the impact</strong> — sometimes we genuinely don't see how much our words or actions affect someone until it's pointed out</li>
          </ul>
          <p className="mt-2">None of these reasons make it okay — but they do explain it. And understanding <em>why</em> is the first step to changing.</p>

          <p className="font-bold mt-3">What real strength looks like</p>
          <p>Picking on someone smaller, younger, or quieter might feel powerful in the moment — but it's not strength. Here's what real strength actually looks like:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Real strength</strong> is standing up for someone, not against them</li>
            <li><strong>Real strength</strong> is saying sorry and meaning it — even when it's embarrassing</li>
            <li><strong>Real strength</strong> is walking away from a group that's being mean, even when it means being on your own for a bit</li>
            <li><strong>Real strength</strong> is asking for help when you're struggling inside</li>
            <li><strong>Real strength</strong> is admitting you got it wrong and trying to make it right</li>
          </ul>

          <p className="font-bold mt-3">The truth about labels</p>
          <p>Nobody wants to be called "a bully." And here's the thing — <strong>you are not "a bully."</strong> You are a person who has done some unkind things. There's a massive difference.</p>
          <p className="mt-1">"A bully" sounds permanent, like that's who you are forever. But <strong>behaviour can change</strong>. You can learn different ways to handle your feelings. You can repair the harm you've done. You can become someone you're proud of.</p>

          <p className="font-bold mt-3">What can you do right now?</p>
          <div className="space-y-3 mt-2">
            <div className="flex gap-3 items-start">
              <span className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <div>
                <p className="font-bold">Stop the behaviour</p>
                <p className="text-muted-foreground">Even if your friends keep doing it, you can choose to stop. That's your decision and it matters more than you think.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <div>
                <p className="font-bold">Say sorry — and mean it</p>
                <p className="text-muted-foreground">A real apology isn't "sorry, but..." or "sorry you felt that way." It sounds like: <em>"I'm sorry I did that. It wasn't okay, and I won't do it again."</em> You don't need to make excuses. A genuine sorry is one of the most powerful things one person can say to another.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <div>
                <p className="font-bold">Try to understand how they felt</p>
                <p className="text-muted-foreground">Think about a time when someone made you feel small, scared, or left out. That's how the other person felt because of what you did. This isn't meant to make you feel terrible — it's meant to help you understand why it matters.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <div>
                <p className="font-bold">Talk to someone about what's going on with YOU</p>
                <p className="text-muted-foreground">If something is making you act this way — stress, anger, problems at home, feeling like you don't fit in — you deserve help with that too. Talk to a teacher, school counsellor, or parent. They won't just punish you. Good adults want to understand and help.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">5</span>
              <div>
                <p className="font-bold">Make a different choice tomorrow</p>
                <p className="text-muted-foreground">You can't change what you did yesterday. But you can choose what you do tomorrow. Even small things count — being kind to the person you were mean to, including someone who's sitting alone, or refusing to join in when others are being cruel.</p>
              </div>
            </div>
          </div>

          <p className="font-bold mt-4">If your friends pressure you to be unkind</p>
          <p>This is one of the hardest situations. Your friends are being mean and you feel like you have to join in or you'll be next. Here are some things that can help:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>You don't have to laugh.</strong> Not laughing is not the same as being against your friends — it just means you're not joining in</li>
            <li><strong>Walk away quietly.</strong> You don't need to make a big speech. Just move away</li>
            <li><strong>"I'm not into this"</strong> is a complete sentence. You don't need to explain more</li>
            <li><strong>Real friends don't make you be cruel to others.</strong> If your friend group only works when you're all being mean to someone, those aren't real friendships</li>
            <li><strong>Tell an adult privately.</strong> You don't have to stand up publicly. You can quietly tell a teacher what's happening — including that you feel pressured</li>
          </ul>

          <p className="font-bold mt-4">You deserve support too</p>
          <p>Here's something adults don't always say clearly enough: <strong>children who are unkind to others also deserve help.</strong> The school's job isn't just to protect the person who got hurt — it's also to help you understand why it happened and how to do better.</p>
          <p className="mt-1">Under Spanish law (LOPIVI) and the Convivèxit protocol, schools have a legal duty to provide you with support — not just consequences. That means:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Someone will talk to you properly about what happened and why</li>
            <li>If things are hard at home or you're struggling emotionally, the school will connect you with help</li>
            <li>You'll be given a chance to make things right — not just be punished</li>
            <li>Your parents will be involved to support you, not just told off</li>
          </ul>

          <div className="p-4 rounded-xl bg-gradient-to-br from-secondary/10 to-green-50 dark:from-secondary/10 dark:to-green-950/20 border border-secondary/20 mt-3">
            <p className="font-bold text-secondary">You are not stuck being this person.</p>
            <p className="text-sm mt-1">People change all the time. The version of you that did something unkind is not the final version of you. Every day you get to decide who you want to be. And the fact that you read all of this? That's already the start of something different.</p>
          </div>
        </AccordionItem>

        <AccordionItem title="When things are hard at home" icon={HandHeart}>
          <p>Sometimes what happens at school is connected to what's happening at home. If you're dealing with any of these, it's not your fault:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Arguments, shouting, or fighting at home</li>
            <li>Someone at home making you feel scared or unsafe</li>
            <li>A parent or family member who is unwell or going through a tough time</li>
            <li>Feeling like you have to look after everyone else</li>
            <li>Not having enough food, clean clothes, or a quiet place to sleep</li>
          </ul>
          <p className="mt-2">These things can make you feel angry, tired, or like you can't concentrate. They can also make you lash out at school without meaning to.</p>
          <p className="mt-2"><strong>You don't have to carry this alone.</strong> Talking to a teacher, counsellor, or another adult you trust is not betraying your family — it's getting help for everyone, including yourself.</p>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mt-2">
            <p className="font-bold text-primary">You can use safeskoolz to tell someone what's going on — you don't even have to say it out loud.</p>
          </div>
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
                  <li>Confront the person accused</li>
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
            <li><strong>Record:</strong> Log the incident on safeskoolz with full details</li>
            <li><strong>Notify:</strong> Inform the Safeguarding Coordinator same day</li>
            <li><strong>Risk assessment:</strong> Complete the structured risk assessment (low/medium/high/critical) with risk and protective factors</li>
            <li><strong>Formal protocol:</strong> If escalation is needed, open a formal protocol linking to the incident</li>
            <li><strong>Parent notification:</strong> Inform parents of both the affected child and the child responsible as appropriate</li>
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

        <AccordionItem title="Supporting children who bully" icon={RefreshCw}>
          <p>Children who bully are often struggling themselves. A punitive-only response rarely changes behaviour. Research consistently shows that effective support combines clear boundaries with genuine pastoral care.</p>

          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 mt-2 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-800">
            <p className="font-bold text-amber-700 dark:text-amber-400">The evidence is clear: doing something bad does not make a child bad.</p>
            <p className="text-sm mt-1">Research into Adverse Childhood Experiences (ACEs) shows that children who bully have significantly higher rates of trauma, family stress, and prior victimisation. A DfE report rated restorative approaches the most effective anti-bullying strategy, with 97% of schools confirming positive results. The KiVa programme (randomised controlled trials, 11,000+ students) shows that supporting children who bully — not just punishing them — reduces bullying by 20-23% and improves their own mental health.</p>
          </div>

          <p className="font-bold mt-3">Why children bully — the research</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Home difficulties</strong> — domestic conflict, neglect, abuse, or inconsistent parenting. ACE research shows a dose-response relationship: the more adverse experiences, the higher the risk of bullying behaviour</li>
            <li><strong>Prior victimisation</strong> — "bully-victims" (children who are both bullied and bully others) are identified in research as the most troubled group, showing the most severe conduct and emotional problems</li>
            <li><strong>Social pressure</strong> — seeking status, belonging, or peer approval. KiVa research shows that removing the social rewards (peer attention, status) that maintain bullying is key to stopping it</li>
            <li><strong>Emotional regulation difficulties</strong> — struggling with anger, frustration, or stress, often linked to unprocessed trauma</li>
            <li><strong>Lack of empathy skills</strong> — not yet understanding how their actions affect others. This is a skill that can be taught</li>
            <li><strong>Undiagnosed needs</strong> — ADHD, attachment difficulties, or trauma responses that manifest as aggression</li>
          </ul>

          <p className="font-bold mt-3">Evidence-based response framework</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <p className="font-bold text-green-700 dark:text-green-400 text-xs uppercase tracking-wider mb-2">Effective approaches</p>
              <ul className="list-disc pl-4 space-y-1 text-sm">
                <li><strong>Name the behaviour, not the child</strong> — "What you did was bullying" not "You are a bully." Labels become identities</li>
                <li><strong>Explore root causes</strong> — ask "What's going on for you?" before asking "Why did you do it?"</li>
                <li><strong>Teach empathy explicitly</strong> — "How do you think they felt?" Research shows empathy is a learnable skill</li>
                <li><strong>Restorative conversations</strong> — structured, non-confrontational discussions (KiVa model: understanding motivations, building empathy, developing alternative behaviours)</li>
                <li><strong>Create a support plan alongside consequences</strong> — the LOPIVI framework requires educational intervention, not just punishment</li>
                <li><strong>Check home circumstances</strong> — bullying can be a cry for help. ACE screening may be appropriate</li>
                <li><strong>Involve SENCO</strong> if behaviour is persistent or severe</li>
                <li><strong>Systematic follow-up</strong> — regular check-ins to reinforce prosocial behaviour (not just monitoring for further incidents)</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800">
              <p className="font-bold text-red-700 dark:text-red-400 text-xs uppercase tracking-wider mb-2">Avoid</p>
              <ul className="list-disc pl-4 space-y-1 text-sm">
                <li><strong>Labelling a child as "a bully"</strong> — this becomes their identity and reduces motivation to change</li>
                <li><strong>Public humiliation or shaming</strong> — shaming increases aggression, not empathy</li>
                <li><strong>Assuming the child is "just mean"</strong> — without investigating causes you miss the real problem</li>
                <li><strong>Punishment without any restorative element</strong> — sanctions alone show no long-term behaviour change in the evidence</li>
                <li><strong>Ignoring the child's own wellbeing</strong> — the Barnet study showed schools with restorative approaches had 51% fewer exclusions; those without had 65% more</li>
                <li><strong>Forcing confrontation with the victim</strong> — restorative conversations should only happen when both parties are ready and the child who bullied shows genuine commitment to change</li>
              </ul>
            </div>
          </div>

          <p className="font-bold mt-3">Your legal obligations (LOPIVI & Convivèxit)</p>
          <p>Under Spanish law, schools are required to provide an <strong>individualised intervention plan</strong> for the child who has engaged in bullying. This must include:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Behavioural modification programmes tailored to the individual child</li>
            <li>Social-emotional competency training</li>
            <li>Family support and collaboration (parents informed, involved in behaviour change commitments)</li>
            <li>Access to psychological services (school counsellor or external referral) where needed</li>
            <li>Restorative measures where appropriate — mediation, repair of harm, apology (only if the victim agrees and the child shows genuine commitment)</li>
          </ul>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mt-3 dark:bg-amber-950/20 dark:border-amber-800">
            <p className="font-bold text-amber-700 dark:text-amber-400">A child who is hurting others is often a child who is hurting inside. Your job is to address both — protect the victim and help the child who bullied. These are not competing goals.</p>
          </div>
        </AccordionItem>

        <AccordionItem title="Using safeskoolz effectively" icon={BookOpen}>
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

      <AccordionItem title="Your Rights as a Parent" icon={Scale}>
        <p>Under Spanish law (LOPIVI), the Balearic Islands Convivèxit protocol, and EU data protection regulations, you have specific rights when it comes to your child's safety and welfare at school.</p>

        <p className="font-bold mt-3">Right to information</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You have the right to be informed promptly if your child is involved in a safeguarding incident — whether as a victim, witness, or perpetrator</li>
          <li>The school must explain what protocol is being followed (LOPIVI, Convivèxit, or Machista Violence) and what steps are being taken</li>
          <li>You have the right to receive updates on the progress and outcome of any investigation</li>
          <li>You have the right to receive a written summary of any formal protocol actions taken</li>
        </ul>

        <p className="font-bold mt-3">Right to be heard</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You have the right to contribute your perspective during any investigation or protocol process</li>
          <li>You have the right to raise concerns directly — through safeskoolz, by contacting your child's teacher, or by requesting a meeting with the Safeguarding Coordinator</li>
          <li>You have the right to formally disagree with the school's handling of a situation and to have your objection recorded</li>
          <li>You have the right to contact the PTA or school governance body if you feel concerns are not being addressed</li>
        </ul>

        <p className="font-bold mt-3">Right to data protection</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Your child's personal data is protected under the EU General Data Protection Regulation (GDPR) and Spanish Organic Law 3/2018</li>
          <li>You have the right to know what data the school holds about your child and how it is used</li>
          <li>Incident reports involving your child are confidential — the school cannot share details about your child with other families without your consent</li>
          <li>Your child's diary entries are completely private — only they can see them. The AI safeguarding scanner may alert staff to concerns, but diary content is never shared</li>
          <li>You have the right to request access to, correction of, or deletion of your child's personal data (subject to safeguarding obligations)</li>
        </ul>

        <p className="font-bold mt-3">Right to consent</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>The school must request your consent before sharing incident details with classroom teachers beyond the Safeguarding Coordinator</li>
          <li>You can approve or decline consent requests through safeskoolz — your decision is recorded and audited</li>
          <li>You have the right to withdraw consent at any time</li>
        </ul>

        <p className="font-bold mt-3">Right to external support</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You can contact external bodies if you believe the school is not meeting its safeguarding duties — including the Balearic Islands Education Department, social services, or the police</li>
          <li>The school must cooperate with external agencies during investigations</li>
          <li>You have the right to seek independent legal advice at any stage</li>
        </ul>

        <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 mt-3 dark:bg-indigo-950/20 dark:border-indigo-800">
          <p className="font-bold text-indigo-700 dark:text-indigo-400">If you feel your rights are not being respected, you can raise a formal concern through safeskoolz, contact the PTA, or speak directly to the school's Safeguarding Coordinator. Every concern is logged and must receive a response.</p>
        </div>
      </AccordionItem>

      <div className="space-y-3">
        <AccordionItem title="How concerns and bullying are handled — the protocols" icon={Shield}>
          <p>The school is legally required to follow specific protocols when concerns are raised. Understanding these processes helps you know what to expect and how to engage effectively.</p>

          <p className="font-bold mt-3">Initial response</p>
          <p>When a concern is reported — whether by you, your child, a teacher, or another pupil — the school follows a structured process:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>The concern is logged formally in safeskoolz with date, time, people involved, and a description</li>
            <li>An <strong>escalation tier</strong> is assigned automatically based on the type and severity of the concern</li>
            <li>The Safeguarding Coordinator is notified immediately for medium and serious concerns</li>
            <li>You will be contacted if your child is involved — either as the child who was hurt, a witness, or the child whose behaviour is being investigated</li>
          </ol>

          <p className="font-bold mt-3">The three protocols</p>
          <p>Depending on the nature of the concern, one of three legally mandated protocols is activated:</p>

          <div className="space-y-3 mt-2">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
              <p className="font-bold text-blue-700 dark:text-blue-400 mb-2">Convivèxit — Anti-Bullying Protocol</p>
              <p className="text-sm mb-2">Required by Balearic Islands education law for all suspected bullying cases. This protocol has five phases:</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm">
                <li><strong>Detection</strong> — the concern is identified and formally recorded</li>
                <li><strong>Investigation</strong> — the school gathers evidence: interviews with pupils involved, witness statements, review of any previous incidents or patterns</li>
                <li><strong>Mediation</strong> — where appropriate, a structured conversation between the children involved, facilitated by trained staff</li>
                <li><strong>Resolution</strong> — agreed actions, consequences if necessary, and a support plan for all children involved</li>
                <li><strong>Follow-up</strong> — the school checks back at set intervals to confirm the bullying has stopped and the child feels safe</li>
              </ol>
              <p className="text-sm mt-2"><strong>Your role:</strong> You will be informed at the start and updated at each phase. You have the right to contribute your perspective and to request a meeting with the Coordinator at any point.</p>
            </div>

            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 dark:bg-purple-950/20 dark:border-purple-800">
              <p className="font-bold text-purple-700 dark:text-purple-400 mb-2">LOPIVI — Child Protection (Ley Orgánica de Protección Integral a la Infancia y la Adolescencia)</p>
              <p className="text-sm mb-2">Spain's comprehensive child protection law. Activated when there is a concern about a child's welfare or safety beyond bullying — including neglect, abuse, or harm. Five phases:</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm">
                <li><strong>Initial concern</strong> — the concern is formally logged and risk-assessed</li>
                <li><strong>Assessment</strong> — the school evaluates the severity using a likelihood × impact risk matrix</li>
                <li><strong>Referral</strong> — if necessary, a referral is made to external agencies (social services, police, health professionals)</li>
                <li><strong>Intervention</strong> — a coordinated support plan is put in place, potentially involving multiple agencies</li>
                <li><strong>Review</strong> — the situation is monitored and the plan is adjusted as needed</li>
              </ol>
              <p className="text-sm mt-2"><strong>Your role:</strong> You will be contacted as early as possible unless doing so would put the child at further risk. You have the right to be involved in planning and to receive copies of any formal referrals.</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-800">
              <p className="font-bold text-rose-700 dark:text-rose-400 mb-2">Machista Violence Protocol</p>
              <p className="text-sm mb-2">A specialised pathway for gender-based violence, harassment, or discrimination. This protocol recognises that gender-based incidents require specific expertise and additional protections:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Immediate safety measures for the affected child</li>
                <li>Specialist assessment by trained staff</li>
                <li>Referral to gender violence support services where appropriate</li>
                <li>Enhanced monitoring and follow-up</li>
                <li>Education and awareness work with the wider school community</li>
              </ul>
              <p className="text-sm mt-2"><strong>Your role:</strong> You will be supported with access to specialist external resources. The school will coordinate with relevant agencies on your behalf.</p>
            </div>
          </div>

          <p className="font-bold mt-3">What you can expect throughout</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Timely communication — the school must keep you informed at every stage</li>
            <li>Confidentiality — details about your child will not be shared with other families</li>
            <li>Documentation — every action, interview, and decision is recorded and auditable</li>
            <li>Right to escalate — if you are unhappy with how a protocol is being managed, you can raise this with the Head Teacher, PTA, or the Balearic Islands Education Department</li>
          </ul>

          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mt-3">
            <p className="font-bold text-primary">All protocol activity is tracked in safeskoolz. You can view incident updates, consent requests, and communications through your parent dashboard. If you have questions at any stage, message the Safeguarding Coordinator directly through the platform.</p>
          </div>
        </AccordionItem>

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
            <li><strong>Contact the school</strong> — speak to your child's class teacher or the Safeguarding Coordinator. You can also use safeskoolz to submit a formal concern</li>
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
          <p>Hearing that your child has been unkind to others is one of the hardest things a parent can face. It's natural to feel defensive, upset, or even disbelieving. But how you respond now can make a real difference — for your child, for the child who was hurt, and for the future.</p>

          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/5 border border-primary/20 mt-2 mb-3">
            <p className="font-bold text-primary">Your child is not "a bully." They are a child who has done something unkind.</p>
            <p className="text-sm text-muted-foreground mt-1">Research consistently shows that children who engage in bullying behaviour are often dealing with their own struggles — stress, trauma, peer pressure, or difficulties they haven't found the words for yet. Unkind behaviour is something that can change with the right support.</p>
          </div>

          <p className="font-bold mt-3">First steps</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Listen to the school without being defensive</strong> — they are not attacking your child or your parenting. They want to work with you to help your child</li>
            <li><strong>Talk to your child privately and calmly</strong> — ask for their version, but be clear that bullying behaviour is not acceptable regardless of the reason</li>
            <li><strong>Avoid "What did they do to you first?"</strong> — this teaches them to justify unkind behaviour rather than take responsibility for it</li>
            <li><strong>Help them understand impact</strong> — "How do you think they felt?" is more powerful than "You should be ashamed"</li>
            <li><strong>Separate the behaviour from the person</strong> — "What you did was wrong" is very different from "You are bad." Children internalise labels</li>
          </ul>

          <p className="font-bold mt-3">Looking deeper — what the research tells us</p>
          <p>Studies into Adverse Childhood Experiences (ACEs) show that children who bully others frequently have their own unmet needs. This is not an excuse — it's a guide for how to respond effectively. Consider honestly whether any of these might apply:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Are there difficulties at home — conflict between parents, a separation, bereavement, financial stress, or a family member's illness?</li>
            <li>Has your child been bullied themselves, either now or in the past? Research identifies "bully-victims" as the highest-risk group</li>
            <li>Are they struggling with school work, friendships, self-esteem, or anxiety?</li>
            <li>Have they been exposed to aggressive or controlling behaviour — from older siblings, peers, online content, or adults?</li>
            <li>Are they finding it hard to manage big emotions like anger, jealousy, or frustration?</li>
            <li>Could there be an undiagnosed need — attention difficulties, attachment issues, or a trauma response?</li>
          </ul>
          <p className="mt-2">Understanding the root cause doesn't excuse the behaviour, but it tells you what actually needs fixing. Punishment alone — without addressing the underlying cause — rarely leads to lasting change.</p>

          <p className="font-bold mt-3">Moving forward together</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Work with the school</strong> on a joint support and behaviour plan — under LOPIVI, the school is required to offer an individualised intervention plan, not just sanctions</li>
            <li><strong>Help your child practise empathy at home</strong> — discuss characters' feelings in books, films, or real situations. "How do you think she felt when that happened?"</li>
            <li><strong>Praise kind behaviour when you see it</strong> — reinforcing the positive is more effective than only punishing the negative</li>
            <li><strong>Set clear, consistent boundaries</strong> about how you treat others — at home, at school, and online</li>
            <li><strong>Model the behaviour you want to see</strong> — children learn how to handle conflict by watching their parents</li>
            <li><strong>If the behaviour continues</strong>, ask the school about counselling, SENCO support, or external referral. Persistent bullying often signals deeper needs that require professional help</li>
            <li><strong>Take care of yourself too</strong> — this is stressful for parents. You don't have to handle it alone. Talk to the school counsellor or seek your own support</li>
          </ul>

          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-green-50 dark:from-primary/10 dark:to-green-950/20 border border-primary/20 mt-3">
            <p className="font-bold text-primary">Your child is not defined by this behaviour.</p>
            <p className="text-sm mt-1">With the right support from home and school working together, children can and do change. What they need most right now is a combination of firm boundaries, genuine understanding, and the belief that they can be better. You reading this is already part of that.</p>
          </div>
        </AccordionItem>

        <AccordionItem title="How safeskoolz keeps you informed" icon={BookOpen}>
          <ul className="list-disc pl-5 space-y-1">
            <li>You can log into safeskoolz with your parent account to view your children's reported incidents</li>
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
