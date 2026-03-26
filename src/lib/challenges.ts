// Daily Challenge Engine — generates fresh thinking challenges each day
// Categories: Logic, Communication, Reflection
// Difficulty scales with user's streak

export interface Challenge {
  id: string;
  category: 'logic' | 'communication' | 'reflection';
  title: string;
  prompt: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeLimit: number; // minutes
}

// Rotating pool — AI generates new ones, these are the seed set
const CHALLENGE_POOL: Challenge[] = [
  // LOGIC
  {
    id: 'logic-1',
    category: 'logic',
    title: 'Spot the Fallacy',
    prompt: '"We should ban all social media because my cousin got addicted to TikTok and failed his exams." Identify every logical fallacy in this argument. Name them, explain why they\'re fallacies, and reconstruct the argument so it\'s logically sound.',
    difficulty: 'beginner',
    timeLimit: 5,
  },
  {
    id: 'logic-2',
    category: 'logic',
    title: 'Steel Man Challenge',
    prompt: 'Take this position you probably disagree with: "University education is a waste of time and money for most people." Now STEEL MAN it — make the strongest possible case FOR this position using logic, evidence, and sound reasoning. No straw men allowed.',
    difficulty: 'intermediate',
    timeLimit: 7,
  },
  {
    id: 'logic-3',
    category: 'logic',
    title: 'Hidden Assumptions',
    prompt: '"If we just paid teachers more, education would improve." List at least 5 hidden assumptions in this statement. For each, explain why it might be wrong and what evidence you\'d need to verify it.',
    difficulty: 'intermediate',
    timeLimit: 5,
  },
  {
    id: 'logic-4',
    category: 'logic',
    title: 'The Trolley Problem Evolved',
    prompt: 'A self-driving car must choose: swerve left and hit 1 elderly person, or swerve right and hit 2 young adults, or go straight and hit a barrier killing its passenger. Construct a logical framework for making this decision. What principles should govern it? Defend your framework against its strongest objection.',
    difficulty: 'advanced',
    timeLimit: 10,
  },
  // COMMUNICATION
  {
    id: 'comm-1',
    category: 'communication',
    title: 'Say It in 3 Sentences',
    prompt: 'Explain blockchain technology to a curious 12-year-old in exactly 3 sentences. No jargon. No metaphors that require prior knowledge. Every word must earn its place.',
    difficulty: 'beginner',
    timeLimit: 3,
  },
  {
    id: 'comm-2',
    category: 'communication',
    title: 'The Misunderstood Email',
    prompt: 'You wrote an email to your team: "I noticed some of you have been leaving early. I\'d like to discuss this." Your team interpreted this as a threat. Rewrite it so your actual intent — genuine curiosity about whether workload is manageable — comes through clearly. Then explain what went wrong in the original.',
    difficulty: 'intermediate',
    timeLimit: 5,
  },
  {
    id: 'comm-3',
    category: 'communication',
    title: 'Translate the Emotion',
    prompt: 'Someone tells you: "It\'s fine, do whatever you want." We both know it\'s not fine. Write 3 versions of what this person might actually mean, and for each, write the response that would make them feel genuinely heard.',
    difficulty: 'intermediate',
    timeLimit: 5,
  },
  {
    id: 'comm-4',
    category: 'communication',
    title: 'Persuade the Skeptic',
    prompt: 'Your boss thinks AI will replace all creative jobs within 5 years. You disagree. Write a 150-word argument that might actually change their mind. No condescension. No dismissal of their view. Pure persuasion through logic and empathy.',
    difficulty: 'advanced',
    timeLimit: 7,
  },
  // REFLECTION
  {
    id: 'reflect-1',
    category: 'reflection',
    title: 'The Belief Autopsy',
    prompt: 'Name one belief you held strongly 5 years ago that you no longer hold. What changed your mind? Was it evidence, experience, or someone\'s influence? What does this tell you about the beliefs you hold today?',
    difficulty: 'beginner',
    timeLimit: 5,
  },
  {
    id: 'reflect-2',
    category: 'reflection',
    title: 'Your Cognitive Blind Spot',
    prompt: 'What is the one topic where you KNOW you\'re biased but can\'t seem to fix it? Describe the bias honestly. Why do you think it persists despite your awareness? What would it take to genuinely overcome it?',
    difficulty: 'intermediate',
    timeLimit: 7,
  },
  {
    id: 'reflect-3',
    category: 'reflection',
    title: 'Letter to Yesterday',
    prompt: 'Write a brief letter to yourself from 24 hours ago. What do you know now that you didn\'t then? What would you do differently? What are you grateful for that you took for granted yesterday?',
    difficulty: 'beginner',
    timeLimit: 5,
  },
  {
    id: 'reflect-4',
    category: 'reflection',
    title: 'The Uncomfortable Truth',
    prompt: 'What is something true about yourself that you avoid thinking about? Write it down. Then ask: why do you avoid it? What would change if you fully accepted it?',
    difficulty: 'advanced',
    timeLimit: 7,
  },
];

// Get today's challenge based on date (rotates through pool)
export function getDailyChallenge(date: Date = new Date()): Challenge {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return CHALLENGE_POOL[dayOfYear % CHALLENGE_POOL.length];
}

// Get challenge by category
export function getChallengeByCategory(category: Challenge['category']): Challenge {
  const pool = CHALLENGE_POOL.filter(c => c.category === category);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Get all challenges
export function getAllChallenges(): Challenge[] {
  return CHALLENGE_POOL;
}

export const CHALLENGE_EVALUATION_PROMPT = `You are evaluating a user's response to a thinking challenge on DrNon.

Score their response on these dimensions (0.0 to 1.0):
- logic_score: How logically sound is their reasoning?
- clarity_score: How clearly did they express their ideas?
- depth_score: How deeply did they engage with the challenge?
- courage_score: Did they take intellectual risks or play it safe?

Also provide:
- feedback: 2-3 sentences of specific, actionable feedback
- strengths: What they did well (1-2 points)
- growth_areas: Where they can improve (1-2 points)

Return as JSON:
{
  "logic_score": 0.0,
  "clarity_score": 0.0,
  "depth_score": 0.0,
  "courage_score": 0.0,
  "overall_score": 0.0,
  "feedback": "...",
  "strengths": ["..."],
  "growth_areas": ["..."]
}

Be honest but encouraging. As Dr. Non says: "Confidence is built by failing."`;
