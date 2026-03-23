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
        <CardContent className="p-6">
          <h2 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
            <Scale size={20} className="text-indigo-600 dark:text-indigo-400" />
            Your Rights
          </h2>
          <p className="text-sm text-muted-foreground mb-3">These are things every child is entitled to. They are part of the law and the school's duty of care.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-white dark:bg-zinc-900/50 border border-indigo-100 dark:border-indigo-900/30">
                <span className="text-base shrink-0 mt-0.5">{right.emoji}</span>
                <p className="text-xs leading-relaxed">{right.text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">These rights come from the UN Convention on the Rights of the Child, Spanish LOPIVI law, and the Balearic Islands Convivèxit protocol.</p>
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
                <p className="text-muted-foreground">Talk to a teacher, parent, school counsellor, or any grown-up you trust. You can also use SafeSkoolZ to report it — even anonymously.</p>
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
            <li><strong>Use SafeSkoolZ</strong> — you can report what you saw, even if it didn't happen to you</li>
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
          <p>Sometimes people do unkind things. If you have been mean to someone, pushed them around, left them out on purpose, or said hurtful things — that takes courage to admit. <strong>Reading this is already a brave step.</strong></p>

          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mt-2 mb-3">
            <p className="font-bold text-primary">Being unkind to someone doesn't make you a bad person. What matters is what you do next.</p>
          </div>

          <p className="font-bold mt-3">Why does it happen?</p>
          <p>People are unkind for lots of reasons. You might recognise some of these:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You feel angry or stressed and you take it out on others</li>
            <li>Things are hard at home and it's making you feel bad inside</li>
            <li>You wanted to fit in or impress friends, so you went along with it</li>
            <li>Someone was unkind to you first and you passed that hurt on</li>
            <li>You didn't realise how much it was affecting the other person</li>
          </ul>
          <p className="mt-2">None of these reasons make it okay — but understanding <em>why</em> helps you change.</p>

          <p className="font-bold mt-3">Picking on someone weaker isn't being strong</p>
          <p>It might feel powerful to push someone around or say things that make others laugh. But real strength looks very different:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Real strength</strong> is standing up for someone, not against them</li>
            <li><strong>Real strength</strong> is saying sorry and meaning it</li>
            <li><strong>Real strength</strong> is walking away from a group that's being mean, even when it's hard</li>
            <li><strong>Real strength</strong> is asking for help when you're struggling inside</li>
          </ul>

          <p className="font-bold mt-3">What can you do now?</p>
          <div className="space-y-3 mt-2">
            <div className="flex gap-3 items-start">
              <span className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <div>
                <p className="font-bold">Stop the behaviour</p>
                <p className="text-muted-foreground">Even if your friends keep doing it, you can choose to stop. That's your decision and it matters.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <div>
                <p className="font-bold">Say sorry — and mean it</p>
                <p className="text-muted-foreground">A real apology sounds like: "I'm sorry I did that. It wasn't okay, and I won't do it again." You don't need to make excuses.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <div>
                <p className="font-bold">Be honest about how you're feeling</p>
                <p className="text-muted-foreground">If something is making you act this way — stress, problems at home, feeling angry all the time — tell someone. A teacher, school counsellor, or parent can help you with what's really going on.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <div>
                <p className="font-bold">Talk to an adult you trust</p>
                <p className="text-muted-foreground">Sometimes being unkind is a way of asking for help without knowing how to ask. Adults won't just punish you — they want to help you too. You deserve support.</p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20 mt-3">
            <p className="font-bold text-secondary">You are not stuck being this person. Everyone can change. The fact that you're reading this means you already care.</p>
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
            <p className="font-bold text-primary">You can use SafeSkoolZ to tell someone what's going on — you don't even have to say it out loud.</p>
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
            <li><strong>Record:</strong> Log the incident on SafeSkoolZ with full details</li>
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
          <p>Children who bully are often struggling themselves. A punitive-only response rarely changes behaviour. Effective support combines clear boundaries with genuine pastoral care.</p>

          <p className="font-bold mt-3">Why children bully</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Home difficulties</strong> — domestic conflict, neglect, abuse, or inconsistent parenting</li>
            <li><strong>Social pressure</strong> — seeking status, belonging, or peer approval</li>
            <li><strong>Past victimisation</strong> — children who have been bullied may replicate the behaviour</li>
            <li><strong>Emotional regulation difficulties</strong> — struggling with anger, frustration, or stress</li>
            <li><strong>Lack of empathy skills</strong> — not yet understanding how their actions affect others</li>
            <li><strong>Undiagnosed needs</strong> — ADHD, attachment difficulties, or trauma responses</li>
          </ul>

          <p className="font-bold mt-3">How to respond</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <p className="font-bold text-green-700 dark:text-green-400 text-xs uppercase tracking-wider mb-2">Effective approaches</p>
              <ul className="list-disc pl-4 space-y-1 text-sm">
                <li>Name the behaviour, not the child ("What you did was bullying" not "You are a bully")</li>
                <li>Explore what's behind the behaviour — ask "What's going on for you?"</li>
                <li>Teach empathy explicitly — "How do you think they felt?"</li>
                <li>Involve SENCO if behaviour is persistent or severe</li>
                <li>Create a support plan alongside consequences</li>
                <li>Check home circumstances — bullying can be a cry for help</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800">
              <p className="font-bold text-red-700 dark:text-red-400 text-xs uppercase tracking-wider mb-2">Avoid</p>
              <ul className="list-disc pl-4 space-y-1 text-sm">
                <li>Labelling a child as "a bully" — this becomes their identity</li>
                <li>Public humiliation or shaming</li>
                <li>Assuming the child is "just mean" without investigating causes</li>
                <li>Punishing without any restorative or educational element</li>
                <li>Ignoring the child's own wellbeing needs</li>
              </ul>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mt-3 dark:bg-amber-950/20 dark:border-amber-800">
            <p className="font-bold text-amber-700 dark:text-amber-400">Children who bully need support, not just sanctions. A child who is hurting others is often a child who is hurting inside. Address both.</p>
          </div>
        </AccordionItem>

        <AccordionItem title="Using SafeSkoolZ effectively" icon={BookOpen}>
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
          <li>You have the right to raise concerns directly — through SafeSkoolZ, by contacting your child's teacher, or by requesting a meeting with the Safeguarding Coordinator</li>
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
          <li>You can approve or decline consent requests through SafeSkoolZ — your decision is recorded and audited</li>
          <li>You have the right to withdraw consent at any time</li>
        </ul>

        <p className="font-bold mt-3">Right to external support</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You can contact external bodies if you believe the school is not meeting its safeguarding duties — including the Balearic Islands Education Department, social services, or the police</li>
          <li>The school must cooperate with external agencies during investigations</li>
          <li>You have the right to seek independent legal advice at any stage</li>
        </ul>

        <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 mt-3 dark:bg-indigo-950/20 dark:border-indigo-800">
          <p className="font-bold text-indigo-700 dark:text-indigo-400">If you feel your rights are not being respected, you can raise a formal concern through SafeSkoolZ, contact the PTA, or speak directly to the school's Safeguarding Coordinator. Every concern is logged and must receive a response.</p>
        </div>
      </AccordionItem>

      <div className="space-y-3">
        <AccordionItem title="How concerns and bullying are handled — the protocols" icon={Shield}>
          <p>The school is legally required to follow specific protocols when concerns are raised. Understanding these processes helps you know what to expect and how to engage effectively.</p>

          <p className="font-bold mt-3">Initial response</p>
          <p>When a concern is reported — whether by you, your child, a teacher, or another pupil — the school follows a structured process:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>The concern is logged formally in SafeSkoolZ with date, time, people involved, and a description</li>
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
            <p className="font-bold text-primary">All protocol activity is tracked in SafeSkoolZ. You can view incident updates, consent requests, and communications through your parent dashboard. If you have questions at any stage, message the Safeguarding Coordinator directly through the platform.</p>
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
            <li><strong>Contact the school</strong> — speak to your child's class teacher or the Safeguarding Coordinator. You can also use SafeSkoolZ to submit a formal concern</li>
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
          <p>Hearing that your child has been unkind to others can be difficult. It's natural to feel defensive or upset. But how you respond now can make a real difference.</p>

          <p className="font-bold mt-3">First steps</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Listen to what the school tells you without being defensive — they are not attacking your child, they want to help</li>
            <li>Talk to your child privately and calmly — ask for their version, but make clear that bullying is not acceptable</li>
            <li>Avoid asking "What did they do to you first?" — this teaches them to justify unkind behaviour</li>
            <li>Help them understand how their actions affect others: "How would you feel if someone did that to you?"</li>
          </ul>

          <p className="font-bold mt-3">Looking deeper</p>
          <p>Children who bully are often dealing with their own struggles. Consider whether any of these might apply:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Are there problems at home — arguments, a separation, a bereavement, financial stress?</li>
            <li>Has your child been bullied themselves, either now or in the past?</li>
            <li>Are they struggling with school work, friendships, or anxiety?</li>
            <li>Have they been exposed to aggressive behaviour from older siblings, peers, or media?</li>
            <li>Are they finding it hard to manage their emotions?</li>
          </ul>
          <p className="mt-2">Bullying can sometimes be a child's way of asking for help when they don't have the words. Understanding the root cause doesn't excuse the behaviour, but it helps you address it properly.</p>

          <p className="font-bold mt-3">Moving forward</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Work with the school on a support and behaviour plan</li>
            <li>Help your child practise empathy — discuss characters' feelings in books or TV shows</li>
            <li>Praise kind behaviour when you see it — reinforce the positive</li>
            <li>Set clear, consistent boundaries at home about how we treat others</li>
            <li>If the behaviour continues, ask the school about counselling or SENCO support</li>
          </ul>

          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mt-3">
            <p className="font-bold text-primary">Your child is not defined by this behaviour. With the right support from home and school working together, children can and do change. What they need most right now is firm boundaries and genuine care.</p>
          </div>
        </AccordionItem>

        <AccordionItem title="How SafeSkoolZ keeps you informed" icon={BookOpen}>
          <ul className="list-disc pl-5 space-y-1">
            <li>You can log into SafeSkoolZ with your parent account to view your children's reported incidents</li>
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
