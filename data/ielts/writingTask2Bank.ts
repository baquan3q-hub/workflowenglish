/**
 * More Task 2 prompts so every essay type has at least four questions. Written
 * for this app in the style of the real test; no sample answers (the band
 * samples in writingSamples.ts show what good answers look like).
 */

import type { IeltsDifficulty, IeltsQuestion } from '../../types';

const FRAMEWORK: Record<string, string> = {
  opinion: 'fw_opinion_essay',
  discussion: 'fw_discussion_essay',
  advantages_disadvantages: 'fw_opinion_essay',
  positive_negative: 'fw_opinion_essay',
  problem_solution: 'fw_problem_solution_essay',
  cause_effect: 'fw_problem_solution_essay',
  two_part: 'fw_two_part_essay',
};

const BAND: Record<IeltsDifficulty, string> = { easy: '5.0-6.0', medium: '5.5-6.5', hard: '6.0-7.0' };

function t2(
  id: string,
  questionType: string,
  topic: string,
  difficulty: IeltsDifficulty,
  prompt: string,
  planningPrompts: string[],
  vocabulary: string[],
): IeltsQuestion {
  return {
    id,
    skill: 'writing',
    taskOrPart: 'task_2',
    questionType,
    topic,
    difficulty,
    prompt,
    frameworkId: FRAMEWORK[questionType],
    targetBand: BAND[difficulty],
    planningPrompts,
    vocabulary,
  };
}

export const MORE_TASK2_QUESTIONS: IeltsQuestion[] = [
  // ─── Opinion ──────────────────────────────────────────────────────
  t2(
    'wr_t2_transport_cars_003',
    'opinion',
    'Transport',
    'medium',
    'Some people think that private cars should be banned from city centres in order to reduce traffic and pollution. To what extent do you agree or disagree?',
    [
      'Do you agree completely, partly, or not at all? Decide before you write.',
      'Reason 1: what would improve if cars were banned (air, safety, space)?',
      'Reason 2 or counter-argument: who would be affected (shop owners, disabled people, deliveries)?',
      'Which real city could you use as an example?',
    ],
    ['pedestrianised zone', 'congestion charge', 'public transport network', 'air quality', 'accessibility'],
  ),
  t2(
    'wr_t2_education_university_004',
    'opinion',
    'Education',
    'hard',
    'University education should be free for all students, regardless of their family income. To what extent do you agree or disagree?',
    [
      'What is your position, and does it apply to all subjects and all students?',
      'Benefit to society: what does a country gain from more graduates?',
      'Cost: who pays, and what could be cut to fund it?',
      'Is there a middle way (loans, grants for low-income students)?',
    ],
    ['tuition fees', 'equal opportunity', 'taxpayers', 'student debt', 'skilled workforce'],
  ),

  // ─── Discussion ───────────────────────────────────────────────────
  t2(
    'wr_t2_work_home_003',
    'discussion',
    'Work',
    'medium',
    'Some people believe that working from home is better for employees, while others think that working in an office is more productive. Discuss both views and give your own opinion.',
    [
      'Why do some people prefer working from home (time, cost, flexibility)?',
      'Why do others think the office is more productive (teamwork, focus, training)?',
      'Which view do you support, and why?',
      'Which example from your own experience or country can you use?',
    ],
    ['commute', 'work-life balance', 'collaboration', 'distractions', 'productivity'],
  ),
  t2(
    'wr_t2_environment_individual_004',
    'discussion',
    'Environment',
    'hard',
    'Some people think that individuals can do little to protect the environment and that only governments and large companies can make a difference. Others believe that individual action is important. Discuss both views and give your own opinion.',
    [
      'Why might individual action seem too small to matter?',
      'What can governments and companies do that individuals cannot?',
      'How can individual choices add up or influence businesses?',
      'State clearly which view you find more convincing.',
    ],
    ['carbon footprint', 'collective action', 'regulation', 'consumer demand', 'sustainable habits'],
  ),

  // ─── Advantages and disadvantages ─────────────────────────────────
  t2(
    'wr_t2_society_abroad_003',
    'advantages_disadvantages',
    'Society',
    'medium',
    'More and more young people are choosing to study or work abroad. Do the advantages of this outweigh the disadvantages?',
    [
      'Advantages for the young person: skills, language, independence.',
      'Disadvantages: cost, loneliness, "brain drain" for the home country.',
      'Decide which side is stronger and say so in the introduction.',
      'Give one specific example for each side.',
    ],
    ['broaden horizons', 'brain drain', 'culture shock', 'career prospects', 'independence'],
  ),
  t2(
    'wr_t2_technology_children_004',
    'positive_negative',
    'Technology',
    'easy',
    'Nowadays many children have their own smartphones from a very young age. Is this a positive or negative development?',
    [
      'Positive: safety, learning apps, staying in touch with parents.',
      'Negative: screen time, social media pressure, less outdoor play.',
      'Is your answer "mostly positive", "mostly negative", or "depends on how it is used"?',
      'What should parents do? (One sentence in the conclusion is enough.)',
    ],
    ['screen time', 'cyberbullying', 'parental controls', 'social skills', 'educational apps'],
  ),

  // ─── Problem and solution ─────────────────────────────────────────
  t2(
    'wr_t2_society_cities_003',
    'problem_solution',
    'Society',
    'medium',
    'In many countries, the cost of housing in big cities has risen so much that young people cannot afford to buy or rent a home. What problems does this cause? What solutions can you suggest?',
    [
      'Problem 1: what happens to young people (debt, living with parents, long commutes)?',
      'Problem 2: what happens to the city (workers leave, inequality)?',
      'Solution for each problem: who acts (government, employers) and how?',
      'Make sure each solution matches a problem you described.',
    ],
    ['affordable housing', 'property prices', 'rent controls', 'urban sprawl', 'social housing'],
  ),
  t2(
    'wr_t2_health_obesity_004',
    'problem_solution',
    'Health',
    'easy',
    'Childhood obesity is increasing in many countries. What problems does this cause, and what measures could be taken to solve them?',
    [
      'Health problems for children now and later in life.',
      'Problems for families and the health system.',
      'Measures for schools, parents and governments (be specific).',
      'Example: a sugar tax, school meal rules, sports in the timetable.',
    ],
    ['sedentary lifestyle', 'processed food', 'sugar tax', 'physical education', 'healthcare costs'],
  ),
  t2(
    'wr_t2_environment_plastic_005',
    'problem_solution',
    'Environment',
    'medium',
    'Large amounts of plastic waste end up in the oceans every year. What problems does this cause? What can be done to reduce it?',
    [
      'Problems for marine life and for humans (food chain, tourism, fishing).',
      'Why does so much plastic reach the sea?',
      'Solutions: bans, deposit schemes, alternatives, education.',
      'Which solution would be the most effective, and why?',
    ],
    ['marine ecosystem', 'single-use plastics', 'deposit scheme', 'biodegradable', 'recycling facilities'],
  ),

  // ─── Cause and effect ─────────────────────────────────────────────
  t2(
    'wr_t2_society_rural_001',
    'cause_effect',
    'Society',
    'medium',
    'In many developing countries, large numbers of people are moving from the countryside to cities. What are the reasons for this, and what effects does it have?',
    [
      'Cause 1: jobs and income in the city.',
      'Cause 2: education, healthcare and lifestyle.',
      'Effects on cities: overcrowding, housing, traffic.',
      'Effects on the countryside: ageing villages, fewer farmers.',
    ],
    ['urbanisation', 'job opportunities', 'overcrowding', 'rural areas', 'infrastructure'],
  ),
  t2(
    'wr_t2_media_news_002',
    'cause_effect',
    'Media',
    'hard',
    'More people now get their news from social media rather than from newspapers or television. Why is this happening? What effects does this have on society?',
    [
      'Why: speed, cost, convenience, personalised feeds.',
      'Effect 1: misinformation and "fake news" spreading quickly.',
      'Effect 2: people only see views they already agree with.',
      'Is there any positive effect worth mentioning briefly?',
    ],
    ['misinformation', 'echo chamber', 'algorithm', 'traditional media', 'credibility'],
  ),
  t2(
    'wr_t2_work_stress_003',
    'cause_effect',
    'Work',
    'medium',
    'Many people today suffer from stress at work. What are the causes of this, and what effects does it have on individuals and society?',
    [
      'Causes: long hours, job insecurity, always being online.',
      'Effects on individuals: health, family life.',
      'Effects on society and companies: sick days, lower productivity.',
      'Keep causes and effects in separate paragraphs.',
    ],
    ['heavy workload', 'job insecurity', 'burnout', 'absenteeism', 'mental health'],
  ),
  t2(
    'wr_t2_education_reading_004',
    'cause_effect',
    'Education',
    'easy',
    'Children today read far fewer books than children did in the past. What are the causes of this? What effects might it have?',
    [
      'Causes: screens, games, busy school schedules.',
      'Effects on language and imagination.',
      'Effects on concentration and school results.',
      'One concrete example of each.',
    ],
    ['reading habits', 'attention span', 'vocabulary', 'imagination', 'digital entertainment'],
  ),

  // ─── Two-part question ────────────────────────────────────────────
  t2(
    'wr_t2_society_elderly_003',
    'two_part',
    'Society',
    'medium',
    'In many countries, the proportion of older people is increasing. What problems will this cause for individuals and society? How can these problems be reduced?',
    [
      'Question 1: problems (pensions, healthcare, fewer workers, loneliness).',
      'Question 2: ways to reduce them (retire later, immigration, care at home).',
      'Answer both questions in the introduction in one sentence.',
      'Give each question its own body paragraph.',
    ],
    ['ageing population', 'pension system', 'retirement age', 'healthcare costs', 'workforce'],
  ),
  t2(
    'wr_t2_technology_shopping_004',
    'two_part',
    'Technology',
    'easy',
    'More and more people are shopping online instead of in shops. Why is this happening? Is this a positive or negative development?',
    [
      'Question 1: reasons (price, choice, convenience, delivery).',
      'Question 2: your view, with effects on shops, jobs and town centres.',
      'Keep your opinion the same in the introduction and conclusion.',
      'Use one example of a store or market you know.',
    ],
    ['e-commerce', 'convenience', 'high street', 'home delivery', 'consumer choice'],
  ),
  t2(
    'wr_t2_government_sport_005',
    'two_part',
    'Government',
    'hard',
    'Some countries spend large amounts of money on hosting international sporting events such as the Olympic Games. Why do governments do this? Do you think it is a good use of public money?',
    [
      'Question 1: reasons (tourism, national pride, infrastructure, global image).',
      'Question 2: is it worth it? Think about debt and unused stadiums.',
      'Give a real example of a host city (good or bad outcome).',
      'Make your answer to question 2 clear from the first paragraph.',
    ],
    ['host country', 'infrastructure', 'national pride', 'public spending', 'long-term legacy'],
  ),
];
