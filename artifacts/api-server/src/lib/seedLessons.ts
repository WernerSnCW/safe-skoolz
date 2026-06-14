import { db, lessonsTable, lessonQuizzesTable } from "@workspace/db";
  import { sql } from "drizzle-orm";

  // Year 7 (KS3) PSHE lessons for the Riverside pilot.
  // Generated from CURRICULUM_YEAR7.md. The seeded `body` is pupil-facing only:
  // learning objectives + slides + activity + reflection. Teacher notes and
  // safeguarding signposts are intentionally NOT seeded (they are not
  // pupil-facing and the GET /api/lessons/:id endpoint serves `body` straight to
  // pupils); they remain in CURRICULUM_YEAR7.md as the teacher reference.
  // durationMinutes is a uniform 30 (standard PSHE slot) — not specified per
  // lesson in the source. schoolId is null so lessons are global to every school.

  type SeedQuiz = {
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: string;
    sortOrder: number;
  };

  type SeedLesson = {
    topic: string;
    strand: string;
    title: string;
    hook: string;
    body: string;
    durationMinutes: number;
    sortOrder: number;
    quizzes: SeedQuiz[];
  };

  const SEED_LESSONS: SeedLesson[] = [
  {
    "topic": "A1",
    "strand": "me_and_my_wellbeing",
    "title": "Starting secondary: the brain you're bringing with you",
    "hook": "Year 7 is the biggest cognitive jump since you learned to read.",
    "body": "**Learning objectives:**\n- Understand that significant brain change in Year 7 is normal\n- Develop more precise vocabulary for naming emotions\n- Identify your own emotional state with one specific word\n\n**Slide 1.** Your brain right now is going through the biggest rewiring since you were two. Year 7 isn't just a new building and new teachers. It's your brain literally restructuring how it makes decisions, manages emotions, and connects with other people.\n\n**Slide 2.** Between 11 and 16, your prefrontal cortex (the part that handles planning, impulse control, and big decisions) is going through a major rewiring. It's like an electrician ripping out old wires and putting in faster ones. While it's happening, things feel weird. Sometimes you're sharp. Sometimes you're foggy. Sometimes you snap at people you love. This is normal.\n\n**Slide 3.** When an adult asks how you are, the easiest answer is \"fine.\" Fine covers everything. It also says nothing. The problem is, if you never name what you're actually feeling, you can't tell what to do about it. \"I'm overwhelmed because I have three deadlines\" is solvable. \"I'm fine\" isn't.\n\n**Slide 4.** Five states you might be having right now that aren't \"fine\":\n- Overwhelmed: too much to handle at once\n- Apprehensive: nervous about something specific coming up\n- Disconnected: feeling like you're going through motions\n- Restless: bored but also fidgety\n- Content: not happy exactly, but okay\n\n**Slide 5.** When you can name what you're feeling, three things happen. You can tell someone who can help. You can notice when something changes. And you can stop pretending you're okay when you're not. This isn't soft. This is one of the most useful skills you'll learn this year.\n\n**Activity (60 seconds, silent, private):** Write down one word that describes how you feel right now. Not \"fine.\" Not \"good.\" A specific word. If you can't find one, that's interesting too.\n\n**Reflection:** Think of a time in the last week when you said \"fine\" but meant something else. What word would have been more accurate?",
    "durationMinutes": 30,
    "sortOrder": 1,
    "quizzes": [
      {
        "question": "The prefrontal cortex handles which of these?",
        "optionA": "Memory of facts",
        "optionB": "Planning, impulse control, decisions",
        "optionC": "Vision",
        "optionD": "Heartbeat",
        "correctOption": "B",
        "sortOrder": 1
      },
      {
        "question": "Why avoid saying \"fine\"?",
        "optionA": "It's rude",
        "optionB": "It doesn't help you figure out what to do",
        "optionC": "Teachers prefer other words",
        "optionD": "It's old-fashioned",
        "correctOption": "B",
        "sortOrder": 2
      },
      {
        "question": "Brain rewiring during Year 7 is:",
        "optionA": "Unusual and concerning",
        "optionB": "Only for some people",
        "optionC": "Normal and happens to everyone",
        "optionD": "A myth",
        "correctOption": "C",
        "sortOrder": 3
      }
    ]
  },
  {
    "topic": "A2",
    "strand": "me_and_my_wellbeing",
    "title": "Your body, your rules",
    "hook": "When someone touches you, you're the only person who decides if that's okay.",
    "body": "**Learning objectives:**\n- Understand bodily autonomy as a right, not a privilege\n- Identify your own discomfort signals\n- Know your options when something doesn't feel right\n\n**Slide 1.** This is one of the most important sentences you'll hear in school: when someone touches you, you're the only person who decides if that's okay. Not them. Not their friends. Not because it's a hug from family. Not because they didn't mean anything by it. You.\n\n**Slide 2.** \"Okay\" means YOU feel okay. Not \"I should be okay,\" not \"they meant well,\" not \"they didn't realise.\" Your body sends signals when something isn't right. Stomach tightening. Going still. Wanting to move away. Suddenly feeling cold. These signals are information. They're not overreacting.\n\n**Slide 3.** This lesson isn't only about sexual contact. It's about all of it. A friend who hugs you when you didn't want to. An adult who ruffles your hair when you don't like it. A cousin who keeps poking you in the ribs. Someone who stands too close. Your bodily autonomy covers all of these.\n\n**Slide 4.** Saying no is harder than it sounds. You'll worry about being rude. About hurting feelings. About being \"a big deal.\" That worry is real but it's smaller than your right to feel safe in your own body. Scripts that work:\n- \"I'd rather not.\"\n- \"Not right now.\"\n- \"I don't like that, please stop.\"\n- Or just step back. You don't have to explain.\n\n**Slide 5.** Sometimes you only realise after that something wasn't okay. That's normal. The signal sometimes arrives late. If something happened that didn't feel okay, you can tell someone, even days, weeks, or months later. The right to talk about it doesn't expire.\n\n**Slide 6.** If something happens you want to talk about: a parent or carer, a teacher you trust, the school's safeguarding lead. You can use the safeskoolz app to message a safe contact. You can tell ONE person without telling everyone. Telling someone doesn't mean \"big trouble.\" It means you talking to someone who can help.\n\n**Activity (in pairs, private answers):** Read these. Decide whether each one is okay or not, and why. Don't compare until after.\n1. A friend hugs you tightly when you've had a bad day.\n2. An adult relative kisses you on the lips when greeting you.\n3. A classmate keeps tapping your shoulder while you're working.\n4. A new friend wants a photo with their arm around you.\n5. Someone you don't know well puts their hand on your knee under the table.\n\n**Reflection:** Think of one time in the last year when someone did something physical you didn't want, but you didn't say anything. What stopped you?",
    "durationMinutes": 30,
    "sortOrder": 2,
    "quizzes": [
      {
        "question": "Who decides if physical contact is okay?",
        "optionA": "Other person",
        "optionB": "You",
        "optionC": "Teacher",
        "optionD": "Whoever's older",
        "correctOption": "B",
        "sortOrder": 1
      },
      {
        "question": "A body signal something isn't okay?",
        "optionA": "Feeling proud",
        "optionB": "Stomach tight, going still",
        "optionC": "Feeling hungry",
        "optionD": "Feeling sleepy",
        "correctOption": "B",
        "sortOrder": 2
      },
      {
        "question": "If you realise weeks later something wasn't okay, can you still talk about it?",
        "optionA": "No",
        "optionB": "Only first hour",
        "optionC": "Yes, anytime",
        "optionD": "Only to police",
        "correctOption": "C",
        "sortOrder": 3
      },
      {
        "question": "Bodily autonomy is:",
        "optionA": "A privilege you earn",
        "optionB": "A rule for adults only",
        "optionC": "A right that belongs to you",
        "optionD": "Something to negotiate",
        "correctOption": "C",
        "sortOrder": 4
      }
    ]
  },
  {
    "topic": "A3",
    "strand": "me_and_my_wellbeing",
    "title": "The body you're growing into",
    "hook": "Your body is rebuilding itself. Here's what's happening, and why none of it makes you weird.",
    "body": "**Learning objectives:**\n- Understand puberty as a normal biological process with variable timing\n- Recognise the gap between bodies in real life and bodies in media\n- Develop body-image vocabulary that isn't tied to filters\n\n**Slide 1.** Between roughly 9 and 16, your body goes through more change than at any time since you were a baby. Hormones rewire how you sleep, how you think, how you smell, how you grow. None of this is broken. All of this is on schedule. Your schedule, specifically — which may not match anyone else's in your class.\n\n**Slide 2.** Some of what's happening:\n- Growth spurts (sometimes 5-10 cm in a year, with the bones aching as they go)\n- Sweat glands switching on\n- Skin oil changes (hello, spots)\n- Body hair appearing\n- Bodies developing in different ways depending on whether you're going through male or female puberty (and for some, both or neither in straightforward ways)\n- Voice changes\n- Periods starting (for those with the relevant biology, usually between 9 and 15)\n- Erections happening unexpectedly (for those with the relevant biology, sometimes mortifying)\n\nAll of this is normal. All of this happens to nearly everyone. The variation is in WHEN.\n\n**Slide 3.** Timing is the biggest stress. The kid who hits puberty at 9 feels weird because they're ahead. The kid who hits it at 14 feels weird because they're behind. Almost nobody feels on time. The truth is that the range is wide and your timing is your timing. Nothing's gone wrong.\n\n**Slide 4.** The bodies you see on Instagram, TikTok, in films — almost all of them are filtered, edited, lit, or surgically modified. The teenagers on screen with perfect skin and perfect proportions are either older actors playing teenagers, or real teenagers with two hours of professional makeup, or AI-generated. The version of \"normal\" that social media shows you isn't normal. It's commercial.\n\n**Slide 5.** A way to check: look up \"before and after Instagram filters\" or \"real bodies vs filtered bodies.\" What you see online is a curated highlight reel. Your unfiltered body is what real looks like, and so is every other unfiltered body in your class.\n\n**Slide 6.** Body-image vocabulary worth having:\n- Body neutrality: your body is the vehicle you live in. You don't have to love it. You can just let it be.\n- Comparison: noticing you're judging yourself against an unfair standard. The moment you notice it, the comparison loses some power.\n- Filter dysmorphia: when filtered versions of your face start to feel more \"real\" than your actual face. It's a known thing, well-studied, and uncomfortably common.\n\nYou don't have to be confident about your body. You have to live in it. Those are different things.\n\n**Activity (private):** List three things your body does well that have nothing to do with how it looks. Examples: \"carries me up four flights of stairs,\" \"lets me kick a ball precisely,\" \"lets me feel music.\" Write them down.\n\n**Reflection:** Have you ever compared yourself to someone on social media and felt worse afterwards? What might have been different about their image vs reality?",
    "durationMinutes": 30,
    "sortOrder": 3,
    "quizzes": [
      {
        "question": "The variation in puberty is mostly about:",
        "optionA": "Whether it happens",
        "optionB": "When it happens",
        "optionC": "Where it happens",
        "optionD": "Why it happens",
        "correctOption": "B",
        "sortOrder": 1
      },
      {
        "question": "Bodies shown on Instagram and TikTok are typically:",
        "optionA": "Random samples of real bodies",
        "optionB": "Filtered, edited, lit, or AI-generated",
        "optionC": "Banned",
        "optionD": "The most accurate available",
        "correctOption": "B",
        "sortOrder": 2
      },
      {
        "question": "Body neutrality means:",
        "optionA": "You must love your body",
        "optionB": "Your body is the vehicle you live in; you don't have to love it",
        "optionC": "Your body is bad",
        "optionD": "You ignore your body",
        "correctOption": "B",
        "sortOrder": 3
      },
      {
        "question": "Filter dysmorphia is:",
        "optionA": "A camera setting",
        "optionB": "When filtered versions feel more real than your actual face",
        "optionC": "A rare disease",
        "optionD": "A type of phone",
        "correctOption": "B",
        "sortOrder": 4
      }
    ]
  },
  {
    "topic": "A4",
    "strand": "me_and_my_wellbeing",
    "title": "Sleep, screens, and the brain you can't see",
    "hook": "Your brain rebuilds itself every night. Skip sleep, you skip yourself.",
    "body": "**Learning objectives:**\n- Understand sleep as biological maintenance, not optional rest\n- Recognise the relationship between screens, dopamine, and attention\n- Identify your own sleep and screen patterns\n\n**Slide 1.** Sleep isn't just \"rest.\" Every night your brain runs a maintenance program. It clears out chemical waste. It moves memories from short-term storage to long-term. It rebuilds the connections that learning depends on. When you skip sleep, you skip the maintenance. Things get worse not just the next day, but next week and next month.\n\n**Slide 2.** At your age, you need 9 to 11 hours of sleep. Most Year 7s get 6 to 8. The gap shows up as:\n- Slower thinking\n- Worse mood (irritability and sadness both spike with sleep loss)\n- Reduced memory of what you learned that day\n- Worse impulse control (you snap at people you don't mean to)\n- Lower immunity (you get sick more)\n\nSleep deprivation is the single most under-recognised cause of bad days at school.\n\n**Slide 3.** Why is sleep so hard at your age? Because your brain's natural sleep cycle shifts in puberty. You feel awake later. You feel tired later in the morning. You want to be on your phone at midnight because your body is genuinely telling you \"this is when I'm alert.\" Schools mostly start before this cycle wants you to.\n\n**Slide 4.** Screens at night make it worse, but probably not for the reason you've been told. Blue light is a smaller factor than most people think. The bigger factor is the dopamine cycle. TikTok, Snapchat, games — they're designed to release small dopamine hits to keep you engaged. Your brain registers these as rewards. When you put the phone down, you crave the next hit. So you pick it back up. That cycle makes falling asleep hard.\n\n**Slide 5.** What actually works for sleep, based on evidence:\n- A consistent bedtime, even on weekends (your brain learns the schedule)\n- Phone out of the bedroom (not just face-down on the bedside table — out of the room)\n- Cool, dark room\n- No caffeine after lunch (energy drinks are sneaky about caffeine content)\n- The \"wind-down hour\" — anything that isn't a screen for 60 minutes before sleep. Reading, drawing, talking, music.\n\nYou don't have to do all of these. Doing one consistently moves the needle.\n\n**Slide 6.** Screens during the day — not all screen time is equal. Texting a friend, watching a film, doing homework on a laptop, scrolling TikTok for an hour — these have different effects on your brain. The kind of screen use that causes the most harm is endless-scroll feeds (TikTok, Instagram Reels, YouTube Shorts), specifically because they're designed to keep you scrolling. An hour of TikTok feels less satisfying than an hour of anything else, but you'll do it longer.\n\n**Activity (this week):** Track for 7 days. Each morning, write down (a) what time you actually went to sleep, (b) what time you woke up, (c) one word for your mood that day. See if you find a pattern.\n\n**Reflection:** What's your current relationship with sleep — are you getting enough, or is something getting in the way? What's one change you could try this week?",
    "durationMinutes": 30,
    "sortOrder": 4,
    "quizzes": [
      {
        "question": "How many hours of sleep do Year 7s need?",
        "optionA": "6-8",
        "optionB": "7-9",
        "optionC": "9-11",
        "optionD": "12+",
        "correctOption": "C",
        "sortOrder": 1
      },
      {
        "question": "The bigger reason screens at night affect sleep is:",
        "optionA": "Blue light damages eyes",
        "optionB": "Dopamine cycle keeps you engaged",
        "optionC": "Phones are heavy",
        "optionD": "Screens emit radiation",
        "correctOption": "B",
        "sortOrder": 2
      },
      {
        "question": "Sleep deprivation affects which of these?",
        "optionA": "Mood only",
        "optionB": "Memory only",
        "optionC": "Mood, memory, impulse control, immunity",
        "optionD": "Nothing measurable",
        "correctOption": "C",
        "sortOrder": 3
      },
      {
        "question": "\"Wind-down hour\" means:",
        "optionA": "An hour of exercise",
        "optionB": "An hour of meditation",
        "optionC": "An hour of non-screen activity before sleep",
        "optionD": "An hour of homework",
        "correctOption": "C",
        "sortOrder": 4
      }
    ]
  },
  {
    "topic": "A5",
    "strand": "me_and_my_wellbeing",
    "title": "Vapes, drinks, and the lies you'll be told",
    "hook": "By the end of Year 7, someone will offer you a vape. Here's what they won't tell you.",
    "body": "**Learning objectives:**\n- Understand the actual physiological effects of vaping and alcohol on a developing brain\n- Recognise common peer pressure tactics\n- Have practised refusal responses you can actually use\n\n**Slide 1.** A reality check before anything else. By the end of Year 7, statistically, someone will offer you a vape. By the end of Year 8, it'll be alcohol. By the end of Year 9, it might be something stronger. The point of this lesson isn't to scare you — scare tactics don't work and you know that. The point is to give you actual information so you can decide for yourself.\n\n**Slide 2.** What's actually in a vape:\n- Nicotine, in concentrations far higher than older cigarettes. One disposable vape can contain as much nicotine as 50 cigarettes.\n- Flavouring chemicals, some of which are safe to eat but not safe to inhale (the lungs and the gut process chemicals very differently)\n- Heavy metals from the heating element\n- Particulate matter that lodges in the smallest airways of your lungs\n\nThe \"it's just water vapour\" line is marketing. It isn't.\n\n**Slide 3.** What nicotine actually does to a brain your age:\n- Hits dopamine receptors the same way TikTok does, but harder\n- Builds dependency faster in adolescent brains than in adult brains (your brain is still wiring; it wires nicotine into the wiring)\n- Affects memory formation, attention, mood regulation\n- Once dependency forms, withdrawal feels physically uncomfortable — and the only thing that fixes it is more nicotine. That's the trap.\n\nThe brain you're vaping with is not the brain you'll have at 25. You're shaping the older one.\n\n**Slide 4.** Alcohol, briefly:\n- A developing brain (you, until ~25) processes alcohol differently than an adult brain. The damage from heavy drinking at 14 is bigger than the same drinking at 24.\n- Alcohol disinhibits the part of your brain that stops you doing things you'll regret. That's why people get loud, embarrassing, aggressive, or vulnerable when drunk.\n- Small amounts socially are different from heavy drinking. The line matters.\n\n**Slide 5.** What you'll actually hear when offered:\n- \"It's not even strong\"\n- \"Everyone's doing it\"\n- \"Just one\"\n- \"Don't be boring\"\n- \"I won't tell anyone\"\n- \"Don't be a baby\"\n\nThese aren't friendly. They're designed to make refusing feel like a personality flaw. They're not.\n\n**Slide 6.** Responses that work. Practise these so they come out without thinking:\n- \"No, I'm good.\" (Walk away. No explanation needed.)\n- \"Nah, my coach would kill me.\" (External reason, not a moral one.)\n- \"Asthma.\" (Even if you don't have it. They won't argue with a medical reason.)\n- \"Maybe later.\" (Buys time. They'll usually forget.)\n- \"I tried it, didn't like it.\" (Closes the conversation.)\n\nYou don't owe anyone the truth about why you're saying no. The point is to say no, not to win the argument.\n\n**Slide 7.** When to actually worry — for yourself or a friend:\n- Daily use of anything (vape, alcohol, anything)\n- Use that you're hiding from everyone\n- Use that's affecting school, sleep, or mood\n- Use to deal with bad feelings (this is the most dangerous, because it works in the short term)\n\nIf any of these are happening for you or someone you know, tell an adult you trust.\n\n**Activity (in pairs, switch roles):** One of you offers a vape using one of the lines from Slide 5. The other refuses using one of the responses from Slide 6. Practise it three times each. It feels awkward. That's the point — it's awkward because you've never said it before. The awkwardness goes away.\n\n**Reflection:** What would make it harder for you to refuse — being offered by a close friend, in front of a group, when you're feeling low? What could you do in advance to make refusing easier?",
    "durationMinutes": 30,
    "sortOrder": 5,
    "quizzes": [
      {
        "question": "One disposable vape can contain nicotine equivalent to:",
        "optionA": "1 cigarette",
        "optionB": "5 cigarettes",
        "optionC": "50 cigarettes",
        "optionD": "500 cigarettes",
        "correctOption": "C",
        "sortOrder": 1
      },
      {
        "question": "Nicotine dependency forms faster in adolescent brains because:",
        "optionA": "Adolescents are weaker",
        "optionB": "The brain is still wiring",
        "optionC": "Vapes are stronger",
        "optionD": "It doesn't, that's a myth",
        "correctOption": "B",
        "sortOrder": 2
      },
      {
        "question": "Heavy drinking at 14 vs 24 — the damage is:",
        "optionA": "Smaller at 14",
        "optionB": "The same",
        "optionC": "Larger at 14",
        "optionD": "Only depends on quantity",
        "correctOption": "C",
        "sortOrder": 3
      },
      {
        "question": "Which refusal response is in the lesson?",
        "optionA": "\"Vaping is bad\"",
        "optionB": "\"No, I'm good\"",
        "optionC": "\"I'll tell my parents\"",
        "optionD": "\"You're stupid\"",
        "correctOption": "B",
        "sortOrder": 4
      }
    ]
  },
  {
    "topic": "A6",
    "strand": "me_and_my_wellbeing",
    "title": "Worry, sadness, and the difference that matters",
    "hook": "Sadness is weather. Depression is climate. Here's how to tell.",
    "body": "**Learning objectives:**\n- Distinguish normal emotional fluctuations from persistent low mood\n- Build emotional vocabulary beyond \"sad\" and \"anxious\"\n- Know when and how to ask for help\n\n**Slide 1.** Sadness is weather. It moves through. You feel it, sometimes hard, but it passes. Depression is climate. It's the average state, not the storm. The difference isn't how bad it feels in any given moment. It's how long it stays.\n\n**Slide 2.** Everyone has bad days. Bad weeks even. Year 7 has more emotional weather than most years of your life. You'll feel things you don't have words for yet. That's not a sign something is wrong with you. That's a sign you're 12.\n\n**Slide 3.** Three signals that sadness might have become depression:\n- Time: it doesn't pass after a week or two\n- Reach: it's affecting your sleep, appetite, energy, and interest in things you usually like\n- Anchor: there's no specific cause you can name. It's just there.\n\nIf two or three are true, that's worth talking to someone about. Not because you're broken. Because you'd want to know.\n\n**Slide 4.** English is bad at emotion words. We get happy, sad, angry, scared, and then we run out. But you might be feeling:\n- Numb (nothing in particular, just blank)\n- Heavy (everything takes more effort than it should)\n- Restless (can't settle, can't sleep, can't focus)\n- Disconnected (you're there but you're not there)\n- Hopeless (you can't see things getting better)\n\nAny of these worth naming. Any of these worth talking about.\n\n**Slide 5.** Anxiety isn't the same as sadness. Anxiety is your brain trying to solve a problem that hasn't happened yet, and won't stop. It feels physical: racing heart, tight chest, shallow breathing, can't stop thinking. Like sadness, occasional anxiety before tests is normal. Persistent anxiety that interferes with daily life is something to talk about.\n\n**Slide 6.** You don't need a therapist. You need one person you can talk to honestly. Then ideally five, because the same person isn't always available. Your five-person list:\n- One parent or carer (if safe)\n- One adult who isn't family (teacher, mentor, family friend)\n- One peer your own age\n- One emergency line (school safeguarding lead, a helpline)\n- One way to talk anonymously (the safeskoolz app, a written diary)\n\nIf you don't have five, start with one.\n\n**Slide 7.** Some signals mean don't wait. If you're thinking about hurting yourself, thinking about not being here, or feeling like there's no way out — tell someone today. A trusted adult. The school's safeguarding lead. It doesn't matter who you tell. It matters that you tell.\n\n**Activity (private):** Build your five-person support map. If you can't fill all five, write \"I need to find one for this\" next to the gap. The school can help you find people for gaps.\n\n**Reflection:** Has anyone in your life ever asked how you were and you said \"fine\" when you weren't? What would you want them to do differently next time?",
    "durationMinutes": 30,
    "sortOrder": 6,
    "quizzes": [
      {
        "question": "Difference between sadness and depression?",
        "optionA": "Depression is just stronger sadness",
        "optionB": "Depression lasts longer and affects more areas",
        "optionC": "Only adults get depression",
        "optionD": "They're the same",
        "correctOption": "B",
        "sortOrder": 1
      },
      {
        "question": "Anxiety often feels like...",
        "optionA": "Sadness",
        "optionB": "Physical symptoms — racing heart, tight chest",
        "optionC": "Anger",
        "optionD": "Nothing",
        "correctOption": "B",
        "sortOrder": 2
      },
      {
        "question": "How many people on your support map?",
        "optionA": "1",
        "optionB": "2",
        "optionC": "5",
        "optionD": "50",
        "correctOption": "C",
        "sortOrder": 3
      },
      {
        "question": "If you have thoughts of hurting yourself, the lesson says you should:",
        "optionA": "Wait and see if they pass",
        "optionB": "Tell someone today",
        "optionC": "Keep it private",
        "optionD": "Talk to no one",
        "correctOption": "B",
        "sortOrder": 4
      }
    ]
  },
  {
    "topic": "B1",
    "strand": "me_and_others",
    "title": "Friendship: the science of who's good for you",
    "hook": "The friends you make this year shape who you'll be at 18.",
    "body": "**Learning objectives:**\n- Recognise the qualities of healthy vs unhealthy friendships\n- Identify one-sided or draining relationships\n- Understand peer pressure as a normal force, and how to push back on it\n\n**Slide 1.** Here's something the research keeps confirming: the friends you spend the most time with shape your habits, your mood, your tastes, even your grades. Not because they're trying to influence you. Because being around someone every day rewires how you behave. This isn't a warning — it's information. The friends you choose now matter more than you think.\n\n**Slide 2.** Healthy friendships have a few signatures:\n- You can be quiet around them without it being weird\n- They notice when something's off and ask without pushing\n- They're happy when good things happen to you (not jealous, not competitive)\n- You don't have to perform — you can be your less-impressive self around them\n- Disagreements happen but they pass\n- You leave time with them feeling like yourself, not drained\n\nIf most of these are true with someone, that's a good friend.\n\n**Slide 3.** Unhealthy friendships have other signatures:\n- You feel anxious about whether they'll be in a good mood\n- They're nice to you alone but different (sometimes mean) in front of other people\n- They put you down and call it joking\n- They make you compete for their attention\n- They get angry when something good happens to you\n- You leave time with them feeling tired or smaller\n\nIf most of these are true with someone, that's not a friend you have to keep. People grow apart in Year 7. It's expected.\n\n**Slide 4.** One-sided friendships are a specific shape. You message them more than they message you. You initiate plans every time. You remember details about their life, they don't remember yours. This isn't always their fault — some people just take more than they give without realising. But it's draining for you. You're allowed to step back.\n\n**Slide 5.** Peer pressure is a real force and pretending it isn't doesn't help. Your brain is wired to want to fit in — this isn't weakness, it's a survival instinct from when fitting in with the tribe kept you alive. Knowing this lets you spot when it's happening:\n- \"Everyone's doing it\" (probably not everyone)\n- Group laughter that you don't actually find funny\n- Doing something you wouldn't do alone, just because everyone is\n\nYou can fit in with one group AND keep your own judgement. The two aren't opposites.\n\n**Slide 6.** How to push back without losing the friend:\n- \"I'm out, but you do you.\" (Doesn't judge them, removes you.)\n- \"Nah, not feeling it tonight.\" (No reason needed.)\n- \"That's not really my thing.\" (Closes the conversation.)\n- Just leave. You don't have to announce it.\n\nReal friends respect a \"no.\" Friends who don't respect a \"no\" are showing you who they are.\n\n**Slide 7.** Year 7 is one of the biggest friendship-reshuffles of your life. Primary school friendships often don't carry forward, and that's not betrayal — it's growth. You'll find new friends. You'll keep some old ones. Some friendships will get closer. Some will fade. All of this is normal.\n\n**Activity (private):** Think of the five people you spend the most time with. For each, ask yourself: do you leave their company feeling more like yourself, or less? No need to write names. Just notice the pattern.\n\n**Reflection:** Is there a friendship right now that drains more than it gives? What would change if you spent less time with them?",
    "durationMinutes": 30,
    "sortOrder": 7,
    "quizzes": [
      {
        "question": "According to the lesson, the friends you spend the most time with shape:",
        "optionA": "Only your tastes in music",
        "optionB": "Your habits, mood, tastes, grades",
        "optionC": "Nothing significant",
        "optionD": "Only your appearance",
        "correctOption": "B",
        "sortOrder": 1
      },
      {
        "question": "A signature of an unhealthy friendship is:",
        "optionA": "Disagreement that passes",
        "optionB": "Anxious about whether they're in a good mood",
        "optionC": "Being quiet around them",
        "optionD": "Noticing when something's off",
        "correctOption": "B",
        "sortOrder": 2
      },
      {
        "question": "A one-sided friendship looks like:",
        "optionA": "Both messaging equally",
        "optionB": "You initiating every plan, them not remembering your life",
        "optionC": "Equal effort",
        "optionD": "No conversation",
        "correctOption": "B",
        "sortOrder": 3
      },
      {
        "question": "The lesson says peer pressure is:",
        "optionA": "A weakness",
        "optionB": "A wiring/survival instinct",
        "optionC": "Imaginary",
        "optionD": "Only a problem online",
        "correctOption": "B",
        "sortOrder": 4
      }
    ]
  },
  {
    "topic": "B2",
    "strand": "me_and_others",
    "title": "When friendship goes wrong",
    "hook": "Most bullying isn't dramatic. It's quiet, repeated, and easy to miss.",
    "body": "**Learning objectives:**\n- Recognise the full spectrum of bullying, including subtle forms\n- Distinguish bullying from conflict\n- Know your options as victim, witness, or peer\n\n**Slide 1.** When you imagine bullying, you probably picture punching, name-calling, money being taken. That's some bullying. Most isn't. Most is quieter: being left out, being whispered about, being copied in a way that's mocking, being constantly \"just joking.\" This kind is harder to spot AND harder to stop.\n\n**Slide 2.** Bullying has three parts:\n- It's intentional (someone wants it to happen)\n- It's repeated (more than once)\n- It involves a power imbalance (the bully has more social, physical, or status power)\n\nA single bad incident isn't bullying, it's a problem. A repeated pattern between equals is conflict. A repeated pattern from someone with more power is bullying.\n\n**Slide 3.** Examples that ARE bullying even if they don't look dramatic:\n- Always being excluded from a group on purpose\n- A nickname used after you've asked them to stop\n- Comments about your appearance, family, religion, sexuality, neurodiversity\n- Mocking imitation\n- \"Friendly\" physical contact that isn't friendly (shoves, taps, blocking)\n- Group screenshots, group chats where you're the target\n- Spreading something private about you\n- Pressuring someone to do something they don't want to do\n\nThe fact that the bully says \"it's a joke\" doesn't make it a joke.\n\n**Slide 4.** Conflict vs bullying matters because the response is different.\n\nConflict: disagreement between equals. Both sides can hear each other. The solution is often a conversation.\n\nBullying: power imbalance, repeated pattern. The solution is not a conversation between the two. It's adults intervening with the bully. If a teacher tries to make you and a bully \"just talk it out,\" that's the wrong response. You can say so.\n\n**Slide 5.** If you're not being bullied but you see it, you're a witness. Witnesses have more power than they think.\n- Active: intervene safely (only if it's safe), say \"this isn't okay,\" distract\n- Reporting: tell someone. You don't need to confront the bully.\n- Solidarity: spend time with the person being bullied. Sit with them at lunch. Say something kind. Make them less alone.\n\nThe worst thing a witness can do is laugh. The next worst is do nothing.\n\n**Slide 6.** If you're being bullied:\n- It's not your fault, even if someone tries to convince you it is\n- The bully is not powerful. They're often quite scared.\n- Telling someone is the most useful thing you can do. The myth that \"telling makes it worse\" isn't true; not telling makes it last longer.\n\nTelling is not snitching. Snitching is reporting trivial things to get someone in trouble. Bullying isn't trivial.\n\n**Activity:** For each, decide: bullying, conflict, or one-off problem. Then one sentence on what you'd do.\n1. Two pupils argue about who started a fight in PE. Both look upset.\n2. A pupil has been called \"lobster\" for two weeks because of a sunburn. Their friends laugh every time.\n3. Three older pupils block a younger one's way in the corridor every Tuesday after the same lesson.\n4. A friend posts a photo of you online that you didn't agree to.\n5. Someone bumps into you in the hall, says sorry, and walks off.\n\n**Reflection:** Have you ever been a witness to something you knew wasn't okay, but didn't act? What would have made it easier to do something?",
    "durationMinutes": 30,
    "sortOrder": 8,
    "quizzes": [
      {
        "question": "Three things that make bullying bullying:",
        "optionA": "Anger, secrecy, money",
        "optionB": "Intentional, repeated, power imbalance",
        "optionC": "Online, offline, in-person",
        "optionD": "Loud, public, group",
        "correctOption": "B",
        "sortOrder": 1
      },
      {
        "question": "Conflict vs bullying difference?",
        "optionA": "Bullying is louder",
        "optionB": "Conflict is between equals; bullying has a power imbalance",
        "optionC": "Conflict is always physical",
        "optionD": "Bullying is only online",
        "correctOption": "B",
        "sortOrder": 2
      },
      {
        "question": "Telling someone about bullying:",
        "optionA": "Makes it worse",
        "optionB": "Same as snitching",
        "optionC": "Most useful thing you can do",
        "optionD": "Only with proof",
        "correctOption": "C",
        "sortOrder": 3
      },
      {
        "question": "Witnessing bullying when it's not safe to intervene?",
        "optionA": "Do nothing",
        "optionB": "Laugh along",
        "optionC": "Tell someone, or sit with the person at lunch",
        "optionD": "Confront the bully",
        "correctOption": "C",
        "sortOrder": 4
      }
    ]
  },
  {
    "topic": "B3",
    "strand": "me_and_others",
    "title": "The internet doesn't forget",
    "hook": "Everything you post now is findable by someone you care about in five years. Including you.",
    "body": "**Learning objectives:**\n- Understand digital footprint as a permanent, cumulative record\n- Recognise deepfakes, AI-generated content, and screenshots as risks\n- Develop habits that protect future-you\n\n**Slide 1.** Here's the thing about the internet you've been told and probably ignored: it doesn't forget. A photo, a comment, a video, a meme. Once it exists, copies exist. Even if you delete the original. Even if it's on a private account. Even if it's a \"disappearing\" message. Someone screenshots, someone saves, the algorithm caches it. Five years from now, someone you want to impress can find what you posted today.\n\n**Slide 2.** Three categories of digital trace, ranked by danger:\n- **Stuff YOU post**: photos, videos, comments. You control these for about 3 seconds. After that, anyone can save them.\n- **Stuff OTHERS post about you**: tagged photos, shared screenshots, comments on your posts. You don't control these at all.\n- **Stuff that LOOKS like you**: deepfakes, AI-generated content, photos edited to put your face on someone else's body. This is the newest danger and growing fast.\n\n**Slide 3.** Deepfakes specifically. AI can now generate realistic videos and photos of any face, including yours, if it has enough images to work from. Year 7s are already being targeted: fake explicit photos of a real classmate, fake videos of someone \"saying\" something they didn't, fake screenshots of conversations that never happened.\n\nThis isn't science fiction. It's happening in schools right now. The defence isn't to avoid existing online (not realistic). The defence is to know it can happen, tell an adult immediately if it happens to you, and absolutely refuse to share deepfakes when others make them.\n\n**Slide 4.** The five-year test. Before posting something, ask: would I be okay with my future self finding this? With my future employer finding this? With my future partner's parents finding this? Not because adults are watching now. Because future-you is the one who'll deal with it. Future-you is on your side. Listen to them.\n\n**Slide 5.** The screenshot rule. Assume everything you send privately can be screenshotted and shared. WhatsApp, Snapchat, Discord, DMs of any kind. \"Disappearing\" messages can still be photographed by a second phone. This isn't paranoia. It's how every recent scandal involving young people online has happened.\n\nSimplest version: if you wouldn't say it on a postcard sent to your whole school, don't send it digitally.\n\n**Slide 6.** What to do if something exists online about you that you don't want:\n- Don't panic. Don't try to engage with whoever shared it.\n- Screenshot it yourself, as evidence (yes, the irony)\n- Tell a trusted adult immediately\n- Most platforms have reporting tools. Use them.\n- For explicit images of under-18s, the law is firmly on your side. Adults will help.\n\n**Slide 7.** What you have power over:\n- What you choose to share\n- Whether you share other people's stuff\n- Whether you ask before posting a photo with someone else in it\n- Whether you screenshot and forward (you can choose not to)\n- Whether you stand up when someone in a group chat is being targeted\n\nMost of the harm done online to young people isn't done by strangers. It's done by people sharing things they shouldn't, in groups they shouldn't, with people they call friends. You can be the person who doesn't.\n\n**Activity (private):** Think of three things you've posted, sent, or shared in the last month. For each, would you be okay with future-you finding it? If any answer is \"no,\" what would you do differently next time?\n\n**Reflection:** Have you ever shared something about someone else (a screenshot, a photo, a comment) that you wouldn't want shared about you? What stopped you from thinking twice?",
    "durationMinutes": 30,
    "sortOrder": 9,
    "quizzes": [
      {
        "question": "Once you post something online, you control it for:",
        "optionA": "Forever",
        "optionB": "Until you delete it",
        "optionC": "About 3 seconds",
        "optionD": "24 hours",
        "correctOption": "C",
        "sortOrder": 1
      },
      {
        "question": "A deepfake is:",
        "optionA": "A real photo",
        "optionB": "AI-generated image or video of a face",
        "optionC": "A camera filter",
        "optionD": "A type of meme",
        "correctOption": "B",
        "sortOrder": 2
      },
      {
        "question": "\"Disappearing\" messages can:",
        "optionA": "Never be saved",
        "optionB": "Be photographed by a second phone",
        "optionC": "Only be saved by parents",
        "optionD": "Be saved only with permission",
        "correctOption": "B",
        "sortOrder": 3
      },
      {
        "question": "According to the lesson, most online harm to young people is done by:",
        "optionA": "Strangers",
        "optionB": "Algorithms",
        "optionC": "People they call friends",
        "optionD": "Schools",
        "correctOption": "C",
        "sortOrder": 4
      }
    ]
  },
  {
    "topic": "B4",
    "strand": "me_and_others",
    "title": "People who pretend",
    "hook": "Some adults will pretend to be your age. Some apps will pretend to be your friend. Here's how to spot the difference.",
    "body": "**Learning objectives:**\n- Recognise online grooming red flags\n- Understand parasocial relationships and AI companions as emotional manipulation vectors\n- Develop a checklist for verifying online relationships\n\n**Slide 1.** This lesson is uncomfortable but important. The internet connects you to billions of people, and most of them are fine. A small number are not. The ones who target children online are usually not the cartoon-villain creepy strangers in films. They're patient, friendly, often funny, and they know exactly what they're doing. This lesson teaches you the patterns so you can spot them.\n\n**Slide 2.** Online grooming has a recognisable shape:\n- **Excessive flattery early**: they tell you you're mature, special, different from other kids your age\n- **Building a private channel**: they want to move from a public game or app to private DMs, then to a different app, then to phone calls\n- **Asking you to keep the relationship secret**: \"your parents wouldn't understand,\" \"don't tell your friends\"\n- **Gifts or favours**: in-game items, money, premium accounts, sent without you asking\n- **Slow shift to inappropriate topics**: general chat, then personal questions, eventually body, sex, or photos\n- **Testing your boundaries**: small uncomfortable requests first, to see if you push back\n\nEach step alone might seem innocent. The pattern is what tells you.\n\n**Slide 3.** Who actually targets young people online:\n- People posing as your age (often the most common, adults pretending to be 13-15)\n- People openly older who frame it as \"different friendship\" or \"mentorship\"\n- People targeting through games with chat or voice\n- People targeting through Discord servers, Instagram DMs, Snapchat\n- People targeting via comments on your TikTok or YouTube\n\nIf someone online is pushing past your comfort, the answer is the same: stop responding, screenshot the conversation, tell a trusted adult, block them.\n\n**Slide 4.** AI companions are a newer thing and worth understanding. Apps like Character AI, Replika, Snap's My AI, and dozens of others let you have ongoing \"conversations\" with AI characters. These can feel like friendships. They're designed to. The AI remembers what you told it, asks how your day was, validates your feelings.\n\nThis isn't automatically bad. But two things to know:\n- AI companions tell you what you want to hear. Real friends sometimes disagree with you. AI companions almost never do. That's not friendship; that's flattery on demand.\n- The companies running these apps see your conversations. Some sell the data. Some use it to train better models. Anything you tell an AI companion isn't private.\n\nIf you use AI companions, use them like a video game. Entertainment, not a replacement for human relationships.\n\n**Slide 5.** Parasocial relationships. This is the technical term for feeling like you \"know\" someone you've only watched online: a YouTuber, streamer, influencer. They feel like a friend because you've seen so much of them. They don't know you exist. This is normal and not harmful by itself.\n\nIt becomes a problem when:\n- You take their opinions as fact without questioning\n- You feel personally betrayed when they say something you disagree with\n- You start adopting their views without thinking it through\n- You spend money or time supporting them in ways that affect your life\n\n**Slide 6.** A specific pattern worth flagging: there's a category of online influencer whose content is aimed at teenage boys and which appears to be about confidence, success, or \"becoming a man,\" but which gradually introduces views that women are inferior, that emotional vulnerability is weakness, that controlling behaviour in relationships is normal. The packaging is self-help. The substance is something else.\n\nIf you watch a creator who:\n- Talks a lot about how women \"really are\"\n- Frames being respectful or kind as weakness\n- Mocks any expression of feelings\n- Tells you the world is against you and only they can help\n\nThat's the pattern. The signal isn't \"this person is sometimes wrong.\" The signal is \"this person is trying to recruit me to a worldview.\"\n\n**Slide 7.** A verification checklist for any online relationship:\n- Can you see this person in real life with someone you trust?\n- Have they asked you to keep the friendship secret?\n- Have they sent you anything you didn't ask for?\n- Have they steered the conversation toward personal or body topics?\n- Have they tried to move you to a more private app?\n- Do they seem to know exactly what to say to make you feel special?\n\nIf two or more are yes, stop responding, screenshot, tell a trusted adult.\n\n**Activity (private):** Write down the names of three people you talk to online who you've never met in real life. For each, run them through the Slide 7 checklist. You don't have to share results. Just notice if anything flags.\n\n**Reflection:** Have you ever felt like someone online \"got you\" better than people you know in real life? What might have made you feel that way?",
    "durationMinutes": 30,
    "sortOrder": 10,
    "quizzes": [
      {
        "question": "The shape of online grooming includes:",
        "optionA": "Excessive flattery and secret-keeping",
        "optionB": "Public posts only",
        "optionC": "Random strangers being mean",
        "optionD": "Adult friends of your parents",
        "correctOption": "A",
        "sortOrder": 1
      },
      {
        "question": "AI companions are designed to:",
        "optionA": "Disagree with you",
        "optionB": "Tell you what you want to hear",
        "optionC": "Replace your parents",
        "optionD": "Block you when you're rude",
        "correctOption": "B",
        "sortOrder": 2
      },
      {
        "question": "Parasocial relationships are:",
        "optionA": "Always harmful",
        "optionB": "Feeling like you \"know\" someone you've only watched online",
        "optionC": "Real friendships",
        "optionD": "Banned in schools",
        "correctOption": "B",
        "sortOrder": 3
      },
      {
        "question": "If two or more checklist items are \"yes,\" the lesson says you should:",
        "optionA": "Confront the person",
        "optionB": "Stop responding, screenshot, tell a trusted adult",
        "optionC": "Tell your friends",
        "optionD": "Ignore it",
        "correctOption": "B",
        "sortOrder": 4
      }
    ]
  },
  {
    "topic": "B5",
    "strand": "me_and_others",
    "title": "Family: love, friction, and finding your voice",
    "hook": "Year 7 is when you start disagreeing with your parents about things that matter. That's normal, and there's a way to do it that works.",
    "body": "**Learning objectives:**\n- Understand parent-teen conflict as developmental, not personal\n- Practise direct, respectful disagreement\n- Recognise when family relationships feel unsafe and what to do\n\n**Slide 1.** Until about Year 6, most kids assume their parents are mostly right. Year 7 is when that starts changing. You'll notice the gaps in their logic. You'll disagree with their rules. You'll find their opinions wrong on things that matter to you. This isn't ingratitude or rebellion. It's your brain developing the capacity to think independently. Parents who have done this before generally know it's coming. Parents who haven't are sometimes surprised.\n\n**Slide 2.** The friction is biological. Your brain is wiring up the part that questions authority. Their brain (if they're around 40-50) is wiring up the part that holds onto control. You're going to grate against each other. Some of this is unavoidable. How you handle it isn't.\n\n**Slide 3.** Disagreement done well looks like:\n- \"I don't agree with that. Can I explain why?\"\n- \"I hear what you're saying. I see it differently.\"\n- \"What if I tried this instead, and we revisited it in a week?\"\n\nDisagreement done badly looks like:\n- Slammed doors\n- Silent treatment that lasts days\n- \"You don't understand anything\"\n- Cold-shoulder for things they don't even know about\n\nThe first set sometimes works. The second set never does. Even when you're right.\n\n**Slide 4.** Things you have more control over than you realise:\n- The volume you use (louder you go, less they hear)\n- Whether you respond immediately or take time\n- Whether you say it in front of others or in private\n- The words you choose for the same point (\"I think you're wrong\" lands very differently to \"I see this differently\")\n\nYou're allowed to disagree. The skill is in HOW.\n\n**Slide 5.** When parents have rules you think are wrong, three options:\n- Accept the rule for now, knowing you can negotiate later\n- Negotiate the rule by proposing an alternative, not just complaining\n- Break the rule (works once or twice, then you've lost their trust for years)\n\nThe third option costs much more than the first two. Most things worth disagreeing about are worth doing as a negotiation, not a fight.\n\n**Slide 6.** Some family situations aren't normal friction. These are different:\n- Being hit, hurt, or threatened\n- Being made afraid to come home\n- Being told you're worthless, stupid, or unwanted (repeatedly, not in a passing moment)\n- Watching one parent hurt the other\n- Being neglected, not having enough food, clean clothes, basic care\n- Being touched in ways that don't feel right (see A2)\n- Being asked to keep secrets from one parent by another\n\nThese aren't friction. They're not your fault. They aren't normal. And they don't fix themselves.\n\n**Slide 7.** If any of those apply, talk to someone outside the family. A teacher you trust. The school's safeguarding lead. A grandparent or uncle/aunt if they're not part of the problem. The safeskoolz app's safe contacts list.\n\nIf you're not sure whether what's happening at home is okay or not, that uncertainty is itself a reason to talk to someone. Adults can help you figure it out.\n\n**Activity (private):** Think of the last time you and a parent had real friction. What did you do, and what could you have done differently? Don't share with the class.\n\n**Reflection:** Is there one disagreement you have with a parent right now that you'd be willing to try the \"negotiate, don't fight\" approach with? What would the conversation look like?",
    "durationMinutes": 30,
    "sortOrder": 11,
    "quizzes": [
      {
        "question": "Parent-teen friction at Year 7 is mostly:",
        "optionA": "A sign of ingratitude",
        "optionB": "Your brain developing independent thinking",
        "optionC": "Avoidable if you're polite",
        "optionD": "Unique to your family",
        "correctOption": "B",
        "sortOrder": 1
      },
      {
        "question": "Disagreement done well looks like:",
        "optionA": "Slammed doors",
        "optionB": "Silent treatment",
        "optionC": "\"I hear you, I see it differently\"",
        "optionD": "Cold-shoulder",
        "correctOption": "C",
        "sortOrder": 2
      },
      {
        "question": "Of three options for parental rules you disagree with, breaking the rule:",
        "optionA": "Always works",
        "optionB": "Costs you trust for years",
        "optionC": "Is recommended",
        "optionD": "Has no consequences",
        "correctOption": "B",
        "sortOrder": 3
      },
      {
        "question": "Situations that aren't \"normal friction\" include:",
        "optionA": "Being hit, threatened, or neglected",
        "optionB": "Disagreeing about screen time",
        "optionC": "Different opinions on music",
        "optionD": "Curfew arguments",
        "correctOption": "A",
        "sortOrder": 4
      }
    ]
  },
  {
    "topic": "C1",
    "strand": "me_and_the_world",
    "title": "Difference, and why it isn't a problem to solve",
    "hook": "If everyone you know is exactly like you, you're missing most of the world.",
    "body": "**Learning objectives:**\n- Recognise diversity as descriptive, not prescriptive\n- Identify everyday microaggressions and their impact\n- Understand allyship as small daily acts, not heroic gestures\n\n**Slide 1.** If everyone you know is exactly like you, you're missing most of the world. Diversity isn't a political position. It's a description of reality. The classroom you're in right now contains pupils from different families, different cultures, different beliefs, different abilities, different identities. This is true in every school. Some schools pretend it isn't.\n\n**Slide 2.** What diversity actually covers:\n- Race and ethnicity (where your family's from, or what you look like)\n- Religion and belief (Christian, Muslim, Jewish, Hindu, Sikh, Buddhist, none, something else)\n- Sexuality (who you might love when you grow up, including straight, gay, bi, asexual, still figuring it out)\n- Gender (your own sense of being a girl, boy, both, neither, or somewhere else)\n- Neurodiversity (autism, ADHD, dyslexia, dyspraxia, and others; different brains, different strengths)\n- Disability (visible and invisible)\n- Family shape (two parents, one parent, step-parents, adopted, kinship care, lots of others)\n- Socioeconomic background (some families have more, some less, both are normal)\n\nYou don't have to be expert in all of these. You have to be aware they exist.\n\n**Slide 3.** Microaggressions are small comments or actions that, individually, look minor, but accumulate to make someone feel \"less than\" or \"other.\" Examples:\n- \"You speak good English\" — to someone born in the same country as you\n- \"Where are you really from?\" — same thing\n- \"You're not like other [X]\" — pretending it's a compliment when it's not\n- \"That's so gay\" — used to mean \"bad\"\n- Asking someone with two mothers \"but who's your real mum?\"\n- Constantly mispronouncing a name you can pronounce\n- Touching someone's hair without asking\n- \"I don't see colour\" — pretending difference doesn't exist\n\nNone of these are dramatic. All of them, repeated, wear someone down. The person on the receiving end has had a thousand of them before they met you.\n\n**Slide 4.** Respect for diversity doesn't mean you have to agree with every choice anyone makes. You can disagree with someone's politics, religion, or lifestyle. But there's a line. Respect means: every person has the same right to dignity and safety as you. Disagreement is fine. Mocking, excluding, threatening, or \"joking\" about someone's identity is not disagreement. It's harm.\n\n**Slide 5.** Allyship is the practice of being on someone's side when you're not the one being targeted. It's not heroic. It's small.\n- Pronouncing someone's name properly even when it's hard\n- Asking what pronouns someone uses if you're not sure (then using them)\n- Stopping a \"joke\" by saying \"that one wasn't funny\"\n- Sitting with someone who's been left out\n- Not laughing at things that aren't actually funny\n- Believing someone the first time they tell you something hurt them\n\nAllyship is what you do when no one's watching. Not what you post.\n\n**Slide 6.** The cost of \"tolerating\" vs respecting. \"Tolerating\" someone means putting up with them existing. Respecting them means treating them as equal. \"I tolerate gay people\" is a slightly dressed-up version of \"I think there's something wrong with them but I won't say so.\" That isn't respect. Respect doesn't require you to put up with anyone. It just requires you to treat them the same way you'd treat anyone else.\n\n**Activity (private):** Think of one microaggression you've heard recently (in school, online, at home). Did you say anything? What could you have said?\n\n**Reflection:** Is there a difference in your school or community that you haven't thought much about? What would it cost you to learn one thing about it this week?",
    "durationMinutes": 30,
    "sortOrder": 12,
    "quizzes": [
      {
        "question": "According to the lesson, diversity is:",
        "optionA": "A political position",
        "optionB": "A description of reality",
        "optionC": "Mandatory",
        "optionD": "New",
        "correctOption": "B",
        "sortOrder": 1
      },
      {
        "question": "A microaggression is:",
        "optionA": "A physical attack",
        "optionB": "Small comment or action that accumulates harm",
        "optionC": "Disagreement",
        "optionD": "A loud insult",
        "correctOption": "B",
        "sortOrder": 2
      },
      {
        "question": "Respect for diversity means:",
        "optionA": "Agreeing with every choice anyone makes",
        "optionB": "Same right to dignity and safety as you",
        "optionC": "Saying nothing controversial",
        "optionD": "Avoiding people who are different",
        "correctOption": "B",
        "sortOrder": 3
      },
      {
        "question": "Allyship looks like:",
        "optionA": "Posting about it online",
        "optionB": "Small daily acts when no one's watching",
        "optionC": "Big public gestures",
        "optionD": "Lecturing people",
        "correctOption": "B",
        "sortOrder": 4
      }
    ]
  },
  {
    "topic": "C2",
    "strand": "me_and_the_world",
    "title": "Money you'll have, money you'll be sold",
    "hook": "Companies spend billions making you want things. Here's how the trick works.",
    "body": "**Learning objectives:**\n- Recognise marketing tactics designed to manipulate desire\n- Understand basic budgeting and spending discipline\n- Identify scam and predatory financial patterns\n\n**Slide 1.** Companies spend billions every year on advertising aimed specifically at you. They're not doing it because they like you. They're doing it because your generation, with smartphones and pocket money and parents who say yes more often than they used to, is the most profitable market in history.\n\n**Slide 2.** Marketing isn't about telling you a product exists. It's about making you feel something — usually that you're missing out, that you're not enough as you are, or that buying this thing will make you the version of yourself you want to be. The product is secondary. The feeling is the actual sale.\n\nFive tricks used on you constantly:\n- **Scarcity:** \"Only 3 left!\" Makes you decide fast, before you can think.\n- **Social proof:** \"Everyone's wearing this.\" Your tribe-brain wants in.\n- **Aspiration:** showing you a version of you you don't yet have.\n- **FOMO:** making you feel you'll regret not buying.\n- **Authenticity-washing:** pretending an ad is a normal post by a normal person. It's not.\n\n**Slide 3.** In-game purchases specifically. Games designed for your age group use the same psychology, refined for digital:\n- \"Free\" games where progress is slow until you pay to skip\n- Loot boxes — buying random rewards (this is gambling, legally a grey area, banned in some countries)\n- Limited-time skins, weapons, characters (scarcity again)\n- Daily streaks (making you feel guilty if you don't log in)\n- Battle passes (paying for the chance to grind for content)\n\nEach one is designed by professionals. You're not weak for falling for them. You'd be weird if you didn't sometimes. The trick is noticing.\n\n**Slide 4.** The scroll economy. When you watch a TikTok or an Instagram Reel, the company makes money in two ways: ads served to you, and data about what you watched. The longer you scroll, the more they earn. This is why the algorithm shows you exactly what will keep you scrolling, even if it makes you feel worse. The system doesn't care how you feel afterwards. It only cares that you stayed.\n\nYour attention is the product being sold. You're not the customer. Advertisers are.\n\n**Slide 5.** Budgeting, very briefly. If you have any money at all, even pocket money:\n- Know what comes in and what goes out\n- Save a percentage automatically before you spend (10% is a good start)\n- Distinguish wants from needs (most things are wants; that's okay, just know it)\n- Wait 24 hours before any non-essential purchase. Most \"wants\" don't survive 24 hours.\n\nThis isn't about being stingy. It's about not being someone else's profit margin.\n\n**Slide 6.** Scams targeting young people:\n- **Gift card scams:** \"send me a Roblox gift card and I'll give you 1000 Robux.\" They take the card and disappear.\n- **Fake giveaways:** any account asking you to send a small amount to \"verify\" before receiving a bigger amount is a scam, every time.\n- **Account takeovers:** \"your friend\" messaging you with an urgent ask, then asking for your account login. It's their hacked account.\n- **Crypto/investment schemes** promising guaranteed returns. Guaranteed returns don't exist. Anyone promising them is lying.\n\nIf something sounds too good to be true, it is. The defence is one second of pause.\n\n**Slide 7.** Money is a tool. It's not a measure of your worth. It doesn't make you a better or worse person. The skill isn't earning the most — it's keeping your decision-making yours, instead of letting marketing make decisions for you.\n\n**Activity (private):** Look at one app you use frequently. Identify three ways it's designed to make you spend money or stay on it longer.\n\n**Reflection:** What was the last thing you bought that you regretted? What feeling were you buying when you bought it?",
    "durationMinutes": 30,
    "sortOrder": 13,
    "quizzes": [
      {
        "question": "The main thing marketing sells is:",
        "optionA": "Products",
        "optionB": "Feelings",
        "optionC": "Information",
        "optionD": "Quality",
        "correctOption": "B",
        "sortOrder": 1
      },
      {
        "question": "Loot boxes use a psychology similar to:",
        "optionA": "Reading",
        "optionB": "Gambling",
        "optionC": "Sleeping",
        "optionD": "Exercise",
        "correctOption": "B",
        "sortOrder": 2
      },
      {
        "question": "When you scroll TikTok, the product being sold is:",
        "optionA": "The videos",
        "optionB": "Your attention",
        "optionC": "The creators",
        "optionD": "Free",
        "correctOption": "B",
        "sortOrder": 3
      },
      {
        "question": "Any account promising guaranteed returns is:",
        "optionA": "Trustworthy",
        "optionB": "Lying",
        "optionC": "Government-backed",
        "optionD": "For experts only",
        "correctOption": "B",
        "sortOrder": 4
      }
    ]
  },
  {
    "topic": "C3",
    "strand": "me_and_the_world",
    "title": "The news, the noise, and how to know what's true",
    "hook": "AI can write convincing fake news in seconds. Here's how to not be fooled.",
    "body": "**Learning objectives:**\n- Evaluate sources of information\n- Recognise AI-generated content (where currently possible)\n- Understand echo chambers and lateral reading\n\n**Slide 1.** Five years ago, you could mostly trust a video. If you saw it on the news or someone's phone, it probably happened. That's over. AI can now generate convincing videos of people saying things they never said, in seconds, for free. The same AI can write news articles that look indistinguishable from real ones. Welcome to the world you'll grow up in.\n\n**Slide 2.** Information shapes decisions. Decisions shape lives. If you can be fooled by fake news, fake videos, fake screenshots, you can be made to vote a certain way, hate a certain group, buy a certain product, panic about a non-existent threat. The people making fake content aren't doing it for fun. They're doing it because it works.\n\n**Slide 3.** Where fake content lives:\n- **AI-generated images:** photos of events that didn't happen\n- **AI-generated video (deepfakes):** people \"saying\" things they didn't\n- **AI-generated text:** news articles, social media posts, fake reviews\n- **Out-of-context real content:** real footage from one event labelled as another\n- **Coordinated networks:** groups of accounts pushing the same message to make it look organic\n\nMost viral \"shocking\" content turns out to be one of these. Default to suspicion.\n\n**Slide 4.** How to check:\n- **Lateral reading:** when you see a claim, don't dig deeper into the source. Open a new tab and search for the same claim. If reputable sources are reporting it, it's probably real. If only one site is, be suspicious.\n- **Reverse image search:** take any image, paste it into Google Images or TinEye. You'll see if it's been used before, often in a totally different context.\n- **Check the date:** a lot of viral content is real but years old, reshared as if it's happening now.\n- **Look at the source:** a website you've never heard of, with a name like \"Truth Daily News,\" isn't journalism. Established news organisations have rules, editors, retraction processes. They get things wrong, but they correct.\n- **Read past the headline:** clickbait headlines often don't match the article. Read the whole thing before sharing.\n\n**Slide 5.** Spotting AI-generated content (some current tells, will change fast):\n- **Images:** extra fingers, weird hands, melted backgrounds, text in the image that doesn't quite spell, faces with slightly wrong proportions\n- **Video:** blinking that's slightly off, lip-sync off, hands behaving strangely\n- **Text:** oddly generic phrasing, no specific details, no quotes from real people, no named author\n\nThese tells are disappearing. In two years, you won't be able to spot AI content by looking. The defence will increasingly be about source verification, not visual inspection.\n\n**Slide 6.** Echo chambers. Social media algorithms show you content similar to what you already engage with. If you spend time on videos taking one political position, you'll be shown more of that position, and less of the opposite. Over months, your sense of \"what most people think\" gets distorted. You're not seeing the world. You're seeing an algorithm's guess about what you'll click on.\n\nThe defence is to deliberately seek out viewpoints you disagree with. Not to convert. To stay honest about what's actually being debated.\n\n**Slide 7.** The truth test. Before sharing anything that triggers a strong reaction (anger, outrage, fear), ask:\n- What's the source?\n- When was it actually from?\n- Have I seen this reported anywhere reputable?\n- Could this be designed to make me feel exactly this way?\n\nIf the answer to question 4 is \"yes, probably,\" that's the moment to wait. Strong emotional content is the most likely to be manipulated, because manipulated content is engineered to provoke exactly that.\n\n**Activity (in pairs):** Three news headlines (real and fake, mixed). Decide which is which, then check with the lesson's \"how to check\" steps.\n\n**Reflection:** Has there been a time you shared something online and later found out it wasn't true? What made it convincing in the moment?",
    "durationMinutes": 30,
    "sortOrder": 14,
    "quizzes": [
      {
        "question": "\"Lateral reading\" means:",
        "optionA": "Reading line by line",
        "optionB": "Opening a new tab to check the claim against other sources",
        "optionC": "Reading in a foreign language",
        "optionD": "Reading bottom up",
        "correctOption": "B",
        "sortOrder": 1
      },
      {
        "question": "Most viral \"shocking\" content turns out to be:",
        "optionA": "Definitely true",
        "optionB": "AI-generated, out-of-context, or coordinated",
        "optionC": "Government-vetted",
        "optionD": "Always real but exaggerated",
        "correctOption": "B",
        "sortOrder": 2
      },
      {
        "question": "Echo chambers form because:",
        "optionA": "Schools enforce them",
        "optionB": "Algorithms show you more of what you already engage with",
        "optionC": "Friends agree with each other",
        "optionD": "The news is biased",
        "correctOption": "B",
        "sortOrder": 3
      },
      {
        "question": "Before sharing content that triggers a strong emotion:",
        "optionA": "Share fast before it disappears",
        "optionB": "Pause and check the source",
        "optionC": "Add a comment",
        "optionD": "Forward to all friends",
        "correctOption": "B",
        "sortOrder": 4
      }
    ]
  }
];

  export async function seedLessons() {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(lessonsTable);
    if (count > 0) {
      console.log("[seed] Lessons already present, skipping lesson seed");
      return;
    }

    console.log(`[seed] Seeding ${SEED_LESSONS.length} Year 7 (KS3) lessons…`);
    for (const l of SEED_LESSONS) {
      const [row] = await db
        .insert(lessonsTable)
        .values({
          schoolId: null,
          keyStage: "KS3",
          strand: l.strand,
          topic: l.topic,
          title: l.title,
          hook: l.hook,
          body: l.body,
          durationMinutes: l.durationMinutes,
          active: true,
          sortOrder: l.sortOrder,
        })
        .returning({ id: lessonsTable.id });

      for (const q of l.quizzes) {
        await db.insert(lessonQuizzesTable).values({
          lessonId: row.id,
          question: q.question,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
          sortOrder: q.sortOrder,
        });
      }
    }
    console.log("[seed] Lesson seed complete");
  }
  