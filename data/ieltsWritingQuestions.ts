import { IeltsQuestion } from '../types';

export const writingTask2Questions: IeltsQuestion[] = [
  // ─── TASK 1 QUESTIONS (5 questions) ──────────────────────────────
  {
    id: 'wr_t1_tourism_line_001',
    skill: 'writing',
    taskOrPart: 'task_1',
    questionType: 'line_graph',
    topic: 'Tourism',
    difficulty: 'medium',
    prompt: 'The line graph below shows the number of tourists visiting a particular island between 2010 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    frameworkId: 'fw_peel',
    targetBand: '5.5-6.5',
    planningPrompts: [
      'What are the overall trends for both categories of tourists over the 10-year period?',
      'Paraphrase the introduction: The line graph illustrates changes in...',
      'Write an overview identifying the main increase/decrease without details.',
      'Detail 1: Describe the fluctuations in tourists staying on cruise ships.',
      'Detail 2: Describe the steady growth in tourists staying on the island.',
    ],
    sampleAnswer: `The line graph illustrates the changes in the number of tourists visiting a specific island, categorised into those staying on cruise ships and those staying on the island, from 2010 to 2020.

Overall, the total number of visitors experienced an upward trend over the ten-year period. Furthermore, while the number of tourists staying on cruise ships fluctuated, visitors staying on the island saw steady and significant growth.

In 2010, the island received 1.0 million visitors in total, with the majority (0.7 million) choosing to stay on the island itself, compared to only 0.3 million cruise ship tourists. Over the next five years, the number of island-stayers rose steadily to reach 1.5 million in 2015, whereas cruise visitors experienced a slight dip before recovering to 0.5 million.

Between 2015 and 2020, cruise ship tourism witnessed a rapid surge, overtaking island-stayers in 2018 and reaching a peak of 2.0 million visitors by 2020. Meanwhile, tourists choosing to stay on the island leveled off at around 1.8 million. Consequently, by 2020, cruise ship visitors had become the primary source of tourism.`,
    vocabulary: ['fluctuated', 'level off', 'upward trend', 'surge', 'overtake'],
    grammarFocus: ['prepositions of time', 'past simple tense', 'relative clauses'],
    chartData: {
      type: 'line',
      title: 'Number of tourists visiting the island (Millions)',
      labels: ['2010', '2012', '2014', '2016', '2018', '2020'],
      datasets: [
        {
          label: 'Staying on the island',
          data: [0.7, 1.0, 1.2, 1.5, 1.7, 1.8],
          color: '#10b981',
        },
        {
          label: 'Staying on cruise ships',
          data: [0.3, 0.4, 0.3, 0.8, 1.5, 2.0],
          color: '#3b82f6',
        },
      ],
    },
  },
  {
    id: 'wr_t1_recycling_bar_002',
    skill: 'writing',
    taskOrPart: 'task_1',
    questionType: 'bar_chart',
    topic: 'Environment',
    difficulty: 'medium',
    prompt: 'The bar chart below compares the percentage of household waste recycled in four different countries in 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    frameworkId: 'fw_peel',
    targetBand: '5.5-6.5',
    planningPrompts: [
      'Compare recycling rates in 2015 vs 2025 for each country.',
      'Which country had the highest rate in both years?',
      'Which country showed the most significant improvement?',
      'Organise details: group countries with similar trends.',
    ],
    sampleAnswer: `The bar chart compares the proportion of household waste that was recycled in UK, France, Germany, and Spain in two separate years, 2015 and 2025.

Overall, it is clear that recycling rates increased in all four countries over the ten-year period. Germany remained the leader in recycling efforts, while France showed the most dramatic improvement.

In 2015, Germany recycled the highest percentage of household waste at 50%, followed by the UK at 35% and Spain at 30%. France had the lowest recycling rate at only 20%. By 2025, Germany's rate had increased slightly to 60%, maintaining its position as the top country.

The most notable growth was observed in France, where the recycling rate tripled to reach 60% in 2025, matching Germany. The UK also made progress, increasing its rate to 55%. Meanwhile, Spain experienced a moderate increase of 10%, ending at 40% in 2025.`,
    vocabulary: ['proportion', 'tripled', 'notable growth', 'moderate increase'],
    grammarFocus: ['comparatives and superlatives', 'passive structures', 'change verbs'],
    chartData: {
      type: 'bar',
      title: 'Recycling Rates of Household Waste (%)',
      labels: ['UK', 'France', 'Germany', 'Spain'],
      datasets: [
        {
          label: '2015',
          data: [35, 20, 50, 30],
          color: '#f59e0b',
        },
        {
          label: '2025',
          data: [55, 60, 60, 40],
          color: '#10b981',
        },
      ],
    },
  },
  {
    id: 'wr_t1_spending_pie_003',
    skill: 'writing',
    taskOrPart: 'task_1',
    questionType: 'pie_chart',
    topic: 'Society',
    difficulty: 'easy',
    prompt: 'The pie chart below shows the breakdown of average household spending in a particular country in 2026. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    frameworkId: 'fw_peel',
    targetBand: '5.0-6.0',
    planningPrompts: [
      'Identify the largest and smallest categories of spending.',
      'Compare spending on housing and food vs luxury items.',
      'Organise the details into two logical paragraphs (e.g. essential vs non-essential spending).',
    ],
    sampleAnswer: `The pie chart details the percentage distribution of average household expenditure in a particular country in the year 2026.

Overall, the largest share of household spending was dedicated to essential requirements, namely housing and food. Conversely, luxury items and healthcare accounted for the smallest portions of the budget.

Housing represented the single largest expense, constituting 35% of total household spending. Food was the second largest category, consuming 25% of the average budget. Combined, these two essential categories made up exactly 60% of all expenditure.

In contrast, transport and education accounted for 15% and 12% respectively. Meanwhile, households spent 8% on leisure and entertainment, and only 5% on healthcare, which was the least funded category in 2026.`,
    vocabulary: ['expenditure', 'dedicated to', 'constituting', 'conversely'],
    grammarFocus: ['fractions and percentages', 'linking words of contrast', 'present simple for fixed static data'],
    chartData: {
      type: 'pie',
      title: 'Household Spending Breakdown 2026 (%)',
      labels: ['Housing', 'Food', 'Transport', 'Education', 'Leisure', 'Healthcare'],
      datasets: [
        {
          label: 'Spending',
          data: [35, 25, 15, 12, 8, 5],
        },
      ],
    },
  },
  {
    id: 'wr_t1_feature_table_004',
    skill: 'writing',
    taskOrPart: 'task_1',
    questionType: 'table',
    topic: 'Technology',
    difficulty: 'medium',
    prompt: 'The table below shows the percentage of mobile phone owners using different features in 2020 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    frameworkId: 'fw_peel',
    targetBand: '5.5-6.5',
    planningPrompts: [
      'Compare the features that saw the most growth.',
      'Identify features that remained popular across both years.',
      'Compare high-tech functions (browsing, games) with traditional functions (calls, messages).',
    ],
    sampleAnswer: `The table compares the usage of various mobile phone features by owners, expressed in percentages, in the years 2020 and 2025.

Overall, making calls remained the most popular feature in both years, while searching the internet and playing games experienced the most significant increases in usage.

In 2020, making calls was almost universal at 98%, and this remained high at 99% in 2025. Similarly, sending text messages was highly popular in both years, staying stable at 85%.

The most substantial growth was recorded in internet searches, which rose from 40% in 2020 to 75% in 2025. Playing games also saw a dramatic rise, doubling from 30% to 60%. Taking photos experienced a moderate increase of 15%, ending at 80% in 2025.`,
    vocabulary: ['universal', 'substantial growth', 'doubling', 'moderate increase'],
    grammarFocus: ['adverbs of degree', 'past simple', 'making comparisons using "while"'],
    chartData: {
      type: 'table',
      title: 'Mobile Phone Feature Usage (%)',
      labels: ['2020', '2025'],
      datasets: [
        {
          label: 'Making calls',
          data: [98, 99],
        },
        {
          label: 'Sending text messages',
          data: [85, 85],
        },
        {
          label: 'Taking photos',
          data: [65, 80],
        },
        {
          label: 'Searching the internet',
          data: [40, 75],
        },
        {
          label: 'Playing games',
          data: [30, 60],
        },
      ],
    },
  },
  {
    id: 'wr_t1_village_map_005',
    skill: 'writing',
    taskOrPart: 'task_1',
    questionType: 'map',
    topic: 'Society',
    difficulty: 'hard',
    prompt: 'The map below shows the development of a village called Ryemouth between 2000 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    frameworkId: 'fw_peel',
    targetBand: '5.5-6.5',
    planningPrompts: [
      'Identify what has been demolished or removed.',
      'Identify what new facilities have been constructed.',
      'Use prepositions of place and directional terms (north, south, east, west).',
    ],
    sampleAnswer: `The map illustrates the transformation of Ryemouth village over a 25-year period from 2000 to 2025.

Overall, the village underwent significant modernisation and expansion, with a focus on residential housing and leisure facilities, replacing farmland and natural features.

To the north, the farmland area was entirely cleared to build a large housing estate with new roads. In the centre, the old post office was demolished to make way for a modern shopping centre.

To the south, the beach area remained intact, but a new hotel was built on the eastern side. Additionally, the small fishing village on the west coast was expanded and converted into a yacht marina with restaurants.`,
    vocabulary: ['transformation', 'demolished', 'intact', 'converted into', 'leisure facilities'],
    grammarFocus: ['passive voice in past simple', 'prepositions of place', 'clause of result'],
    chartData: {
      type: 'map',
      title: 'Ryemouth Village Map Changes (2000 vs 2025)',
      labels: [],
      datasets: [],
      extraInfo: {
        beforeLabel: 'Ryemouth 2000',
        afterLabel: 'Ryemouth 2025',
        before: [
          { pos: 0, name: 'Farmland' },
          { pos: 1, name: 'Farmland' },
          { pos: 2, name: 'Forest' },
          { pos: 3, name: 'Houses' },
          { pos: 4, name: 'Post Office' },
          { pos: 5, name: 'Forest' },
          { pos: 6, name: 'Beach' },
          { pos: 7, name: 'Fish Market' },
          { pos: 8, name: 'Sea' },
        ],
        after: [
          { pos: 0, name: 'Housing' },
          { pos: 1, name: 'Housing' },
          { pos: 2, name: 'Forest' },
          { pos: 3, name: 'Houses' },
          { pos: 4, name: 'Shopping Mall' },
          { pos: 5, name: 'Hotel' },
          { pos: 6, name: 'Beach' },
          { pos: 7, name: 'Marina' },
          { pos: 8, name: 'Sea' },
        ],
      },
    },
  },

  // ─── TASK 2 QUESTIONS (5 questions) ──────────────────────────────
  {
    id: 'wr_t2_education_001',
    skill: 'writing',
    taskOrPart: 'task_2',
    questionType: 'opinion',
    topic: 'Education',
    difficulty: 'medium',
    prompt: 'Some people believe that online learning will eventually replace traditional classroom education. To what extent do you agree or disagree?',
    frameworkId: 'fw_opinion_essay',
    targetBand: '5.5-6.5',
    planningPrompts: [
      'What is your clear opinion on this topic?',
      'What are two main reasons to support your view?',
      'Can you think of a specific example for each reason?',
      'Is there any counterargument you should acknowledge?',
    ],
    sampleAnswer: `It is often argued that digital education will fully take over from face-to-face teaching. While I acknowledge that online learning offers significant advantages, I disagree that it will completely replace traditional classrooms.

On the one hand, online learning provides flexibility and accessibility. Students can study at their own pace and access courses from top universities regardless of their location. For instance, platforms like Coursera allow millions of learners worldwide to gain knowledge without travelling abroad.

On the other hand, traditional classrooms offer irreplaceable benefits. Direct interaction with teachers helps students receive immediate feedback, which is essential for correcting misunderstandings. Moreover, studying in a physical environment encourages social skills and teamwork, both of which are vital in the workplace.

In conclusion, although online learning is a valuable supplement, I believe traditional education will continue to play a central role because of the personal interaction and social development it provides.`,
    vocabulary: ['flexibility', 'accessibility', 'irreplaceable', 'supplement'],
    grammarFocus: ['complex sentences', 'concession clauses', 'present simple for opinions'],
  },
  {
    id: 'wr_t2_technology_001',
    skill: 'writing',
    taskOrPart: 'task_2',
    questionType: 'discussion',
    topic: 'Technology',
    difficulty: 'medium',
    prompt: 'Some people think that social media has a positive impact on society, while others believe it causes more harm than good. Discuss both views and give your own opinion.',
    frameworkId: 'fw_discussion_essay',
    targetBand: '5.5-6.5',
    planningPrompts: [
      'What are the main benefits of social media that supporters might mention?',
      'What are the key problems that critics would highlight?',
      'Which side do you lean towards, and why?',
      'Can you provide a balanced conclusion?',
    ],
    sampleAnswer: `Social media has become an integral part of modern life, and opinions on its influence are deeply divided. This essay will examine both perspectives before presenting my own view.

Those who support social media argue that it connects people across the world and promotes the free exchange of ideas. For example, during natural disasters, social media platforms have been used to coordinate relief efforts and share vital information quickly.

However, critics point out that social media can lead to addiction, cyberbullying, and the spread of misinformation. Many studies have shown that excessive use of platforms like Instagram is linked to anxiety and depression, especially among young people.

In my opinion, social media is a powerful tool that can be either beneficial or harmful depending on how it is used. Governments and tech companies should work together to regulate harmful content while preserving the positive aspects of online communication.`,
    vocabulary: ['integral', 'coordinate', 'misinformation', 'regulate'],
    grammarFocus: ['passive voice', 'relative clauses', 'conditional structures'],
  },
  {
    id: 'wr_t2_environment_001',
    skill: 'writing',
    taskOrPart: 'task_2',
    questionType: 'problem_solution',
    topic: 'Environment',
    difficulty: 'medium',
    prompt: 'Air pollution is a growing problem in many large cities around the world. What are the main causes of this issue, and what measures can be taken to solve it?',
    frameworkId: 'fw_problem_solution_essay',
    targetBand: '5.5-6.5',
    planningPrompts: [
      'What are 2-3 main causes of air pollution in cities?',
      'What practical solutions exist for each cause?',
      'Who is responsible: governments, individuals, or companies?',
      'Can you provide a real-world example?',
    ],
    sampleAnswer: `Air quality in major urban centres has deteriorated significantly in recent decades. This essay will explore the primary causes of this issue and suggest practical solutions.

One of the main causes of air pollution is vehicle emissions. In cities such as Jakarta and Beijing, millions of cars and motorbikes release harmful gases daily, creating dangerous smog. In addition, industrial factories on the outskirts of cities contribute large amounts of pollutants to the atmosphere.

To address this problem, governments could invest in efficient public transport systems, which would reduce the number of private vehicles on the roads. For instance, cities like London have introduced congestion charges to discourage driving in central areas. Furthermore, stricter regulations on factory emissions and incentives for using renewable energy would also help improve air quality.

In conclusion, while air pollution is caused primarily by transport and industry, a combination of government policy and technological innovation can bring about meaningful improvement.`,
    vocabulary: ['deteriorated', 'emissions', 'congestion', 'incentives', 'renewable'],
    grammarFocus: ['present perfect for change', 'conditional recommendations', 'passive voice'],
  },
  {
    id: 'wr_t2_health_001',
    skill: 'writing',
    taskOrPart: 'task_2',
    questionType: 'advantages_disadvantages',
    topic: 'Health',
    difficulty: 'easy',
    prompt: 'In many countries, people are choosing to eat fast food instead of home-cooked meals. Do the advantages of this trend outweigh the disadvantages?',
    frameworkId: 'fw_opinion_essay',
    targetBand: '5.0-6.0',
    planningPrompts: [
      'What are the main advantages of eating fast food?',
      'What are the main disadvantages?',
      'Overall, which side is stronger in your view?',
      'What example can illustrate your point?',
    ],
    sampleAnswer: `In today's fast-paced world, fast food has become a common choice for many people. Although it offers convenience, I believe the disadvantages of this trend are more significant.

The main advantage of fast food is that it saves time. Busy workers and students often do not have enough time to cook, so buying a quick meal is a practical solution. Additionally, fast food is usually affordable and widely available.

However, the disadvantages are considerable. Fast food is typically high in fat, sugar, and salt, which can lead to serious health problems such as obesity, heart disease, and diabetes. Moreover, the habit of eating fast food reduces the tradition of family meals, which are important for building strong relationships.

In conclusion, although fast food is convenient and affordable, I believe its negative effects on health and family life outweigh these benefits. People should try to balance convenience with healthier eating habits.`,
    vocabulary: ['convenient', 'affordable', 'obesity', 'diabetes'],
    grammarFocus: ['comparative structures', 'although/however', 'modal verbs for advice'],
  },
  {
    id: 'wr_t2_work_001',
    skill: 'writing',
    taskOrPart: 'task_2',
    questionType: 'two_part',
    topic: 'Work',
    difficulty: 'hard',
    prompt: 'Many young people today prefer to work freelance or start their own business rather than work for a large company. Why is this the case? Is this a positive or negative development?',
    frameworkId: 'fw_two_part_essay',
    targetBand: '6.0-6.5',
    planningPrompts: [
      'What are 2-3 reasons why young people prefer freelancing or entrepreneurship?',
      'Do you think this trend is mostly positive or negative?',
      'What evidence or examples support your view?',
      'Are there any risks or drawbacks to mention?',
    ],
    sampleAnswer: `An increasing number of young people are choosing self-employment over traditional corporate careers. This essay will examine the reasons behind this trend and argue that it is largely a positive development.

There are several reasons why freelancing and entrepreneurship have become more attractive. Firstly, technology has made it easier than ever to work remotely and reach customers globally. Platforms such as Fiverr and Shopee enable young people to start businesses with minimal capital. Secondly, many young workers value flexibility and autonomy more than job security, especially after seeing how corporate layoffs affected their parents' generation.

I believe this shift is predominantly positive. It encourages creativity, innovation, and personal responsibility. Young entrepreneurs often develop diverse skills, from marketing to financial management, which make them more adaptable in a changing economy. However, it is important to acknowledge that freelancing can also bring financial instability and lack of benefits such as health insurance.

In conclusion, while self-employment carries some risks, the freedom, skill development, and innovation it promotes make it a beneficial trend for both individuals and the wider economy.`,
    vocabulary: ['autonomy', 'entrepreneurship', 'adaptable', 'instability', 'innovation'],
    grammarFocus: ['present perfect for trends', 'comparative adjectives', 'concession with although/while'],
  },
  {
    id: 'wr_t1_mixed_chart_006',
    skill: 'writing',
    taskOrPart: 'task_1',
    questionType: 'mixed_charts',
    topic: 'Environment',
    difficulty: 'hard',
    prompt: 'The mixed charts below show the average monthly temperature (line graph) and average monthly rainfall (bar chart) in London. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    frameworkId: 'fw_peel',
    targetBand: '6.0-7.0',
    planningPrompts: [
      'Compare temperature trends with rainfall trends.',
      'Which months are the hottest and wettest?',
      'Identify the overall relationship between temperature and rainfall in London.',
    ],
    sampleAnswer: `The line graph and bar chart combine to detail the average temperature and average rainfall in London over a typical calendar year.

Overall, London experiences a moderate climate, with temperatures peaking in the summer months when rainfall is lowest. Conversely, the winter and autumn months are characterised by lower temperatures and substantially higher precipitation.

Average temperatures start low in January at around 5°C, before rising steadily through spring to reach a maximum peak of 20°C in July. Following this, temperatures decline consistently to end the year at approximately 6°C in December.

In terms of precipitation, rainfall remains relatively high during winter, starting at 80mm in January. Interestingly, rainfall decreases during the late spring and summer months, dropping to a low of 40mm in July. However, autumn witnesses a sudden increase, with rainfall peaking in October at 100mm, which is the wettest month of the year.`,
    vocabulary: ['precipitation', 'peaking', 'decline consistently', 'wettest month'],
    grammarFocus: ['cohesive devices for mixed charts', 'complex sentence structures', 'comparative forms'],
    chartData: {
      type: 'line',
      title: 'London Climate: Temperature (°C) vs Rainfall (mm)',
      labels: ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'],
      datasets: [
        {
          label: 'Temperature (°C)',
          data: [5, 8, 14, 20, 15, 7],
          color: '#ec4899',
        },
        {
          label: 'Rainfall (mm) [Shown as Bar]',
          data: [80, 60, 50, 40, 70, 90],
          color: '#3b82f6',
        },
      ],
    },
  },
  {
    id: 'wr_t1_glass_process_007',
    skill: 'writing',
    taskOrPart: 'task_1',
    questionType: 'process',
    topic: 'Technology',
    difficulty: 'medium',
    prompt: 'The diagram below shows the stages of manufacturing glass bottles. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    frameworkId: 'fw_peel',
    targetBand: '5.5-6.5',
    planningPrompts: [
      'Identify the start and end of the process.',
      'How many main stages are involved in total?',
      'Use passive voice to describe what happens to the raw materials.',
    ],
    sampleAnswer: `The process diagram details the various stages involved in the production of glass bottles from raw materials.

Overall, the process is a linear, multi-stage system that begins with the collection of raw materials and concludes with the packaging of the finished glass bottles. In total, there are three primary phases: melting, molding, and cooling.

Initially, sand, soda ash, and limestone are collected and mixed together in a large container. This mixture is then heated in a high-temperature furnace at 1500°C until it melts completely into liquid glass.

Subsequently, the molten glass is cut into smaller portions and fed into individual molds, where air is blown in to shape the glass into bottles. Finally, the newly formed bottles are cooled down slowly in a special cooling oven to prevent cracking before being packaged and shipped to distributors.`,
    vocabulary: ['concludes', 'molten glass', 'furnace', 'cooled down slowly'],
    grammarFocus: ['passive voice', 'sequencing adverbs (initially, subsequently, finally)', 'present simple tense'],
    chartData: {
      type: 'process',
      title: 'Glass Bottle Manufacturing Process',
      labels: [],
      datasets: [],
      extraInfo: {
        steps: [
          { title: 'Mixing Materials', description: 'Sand, soda ash, and limestone are mixed.' },
          { title: 'Melting Furnace', description: 'Heated at 1500°C to form liquid glass.' },
          { title: 'Shaping Molds', description: 'Molten glass is blown with air inside molds.' },
          { title: 'Cooling Oven', description: 'Slowly cooled down to strengthen the glass.' },
          { title: 'Packaging', description: 'Finished bottles are packed and shipped.' },
        ],
      },
    },
  },
  {
    id: 'wr_t2_government_arts_002',
    skill: 'writing',
    taskOrPart: 'task_2',
    questionType: 'opinion',
    topic: 'Government',
    difficulty: 'hard',
    prompt: 'Some people believe that governments should spend money on supporting the arts, while others think this money should be spent on public services like healthcare and education. To what extent do you agree or disagree?',
    frameworkId: 'fw_opinion_essay',
    targetBand: '6.0-7.0',
    planningPrompts: [
      'State your position clearly: do public services outweigh the arts, or are they equally important?',
      'Point 1: Why is funding healthcare and education the government\'s primary duty?',
      'Point 2: What benefits do the arts bring to society and culture?',
    ],
    sampleAnswer: `It is highly debated whether public funds should be allocated to cultural arts or prioritised for essential services such as healthcare and education. While the arts play a vital role in society, I strongly agree that public spending must prioritize healthcare and education.

First and foremost, healthcare and education are the cornerstones of a stable and productive nation. A government's primary responsibility is to ensure the basic well-being and intellectual development of its citizens. Without free or affordable healthcare, many people would suffer from untreated illnesses, leading to a decline in life expectancy and economic productivity. Similarly, an underfunded education system leads to high illiteracy rates, limiting career opportunities and national development.

In contrast, funding the arts, such as museums, theatres, and public art installations, can be considered a luxury. While cultural preservation is important, it should not take precedence when hospitals lack beds and schools lack basic learning materials. For instance, in developing countries, investing in public health initiatives yields much higher societal benefits than subsidising modern art exhibitions.

In conclusion, although the arts contribute to cultural enrichment, I believe that governments must prioritise spending on healthcare and education, as these services directly impact the survival, equality, and progress of the population.`,
    vocabulary: ['cornerstones', 'intellectual development', 'take precedence', 'societal benefits', 'subsidising'],
    grammarFocus: ['subordinate clauses', 'modal verbs of obligation', 'comparative structures'],
  },
  {
    id: 'wr_t2_society_alone_002',
    skill: 'writing',
    taskOrPart: 'task_2',
    questionType: 'positive_negative',
    topic: 'Society',
    difficulty: 'medium',
    prompt: 'An increasing number of people are choosing to live alone in many countries nowadays. Is this a positive or negative development?',
    frameworkId: 'fw_opinion_essay',
    targetBand: '5.5-6.5',
    planningPrompts: [
      'Define whether living alone is mostly positive or negative.',
      'Positive aspects: independence, career focus, personal freedom.',
      'Negative aspects: isolation, high cost of living, social fragmentation.',
    ],
    sampleAnswer: `In recent years, the trend of single-person households has risen significantly across the globe. While this choice offers personal autonomy, I believe it is predominantly a negative development due to the financial and psychological challenges it poses to individuals and society.

On the one hand, living alone promotes independence and self-reliance. Individuals have the freedom to manage their schedules, make decisions without compromise, and focus on their careers. For instance, young professionals in major cities often choose to live alone to enjoy privacy and dedicated working environments. This autonomy can lead to personal growth and greater self-confidence.

On the other hand, the negative impacts are more substantial. Psychologically, single living is closely linked to loneliness and social isolation, which can deteriorate mental health. Without a family or flatmates to share daily experiences or provide emotional support, individuals are more vulnerable to anxiety and depression. Financially, it leads to higher energy consumption and increased demand for housing, making accommodation less affordable for everyone.

In conclusion, although living alone can foster independence, the negative consequences on mental health and the economy outweigh the benefits, making it a negative societal development overall.`,
    vocabulary: ['single-person households', 'self-reliance', 'social isolation', 'vulnerable', 'foster'],
    grammarFocus: ['concession structures (while/although)', 'adverbs of degree', 'present simple for general facts'],
  },
  {
    id: 'wr_t2_media_advertising_002',
    skill: 'writing',
    taskOrPart: 'task_2',
    questionType: 'discussion',
    topic: 'Media',
    difficulty: 'hard',
    prompt: 'Some people think that advertising aimed at children should be banned. Others think that advertising is harmless and children should learn to make their own choices. Discuss both views and give your opinion.',
    frameworkId: 'fw_discussion_essay',
    targetBand: '6.0-7.0',
    planningPrompts: [
      'View 1: Why is advertising to children harmful? (lack of critical thinking, peer pressure).',
      'View 2: Why is advertising harmless? (information source, parental control).',
      'Your opinion: Should it be banned or regulated?',
    ],
    sampleAnswer: `The impact of commercials targeting young audiences is a subject of intense debate. While some argue that marketing directed at children should be prohibited, others believe it is a normal part of life that helps them develop consumer awareness. This essay will discuss both sides and present my opinion.

Proponents of a ban argue that children are highly vulnerable to commercial manipulation. Young minds lack the critical thinking required to distinguish between reality and exaggerated advertisements. Consequently, they often demand unhealthy foods, toys, or expensive gadgets, creating immense financial pressure on parents. For example, advertisements for sugary cereals are linked to higher rates of childhood obesity because children cannot make healthy, independent choices.

However, opponents argue that advertising is an essential part of the modern economy and children must learn to navigate it. They believe that instead of banning ads, parents should teach children how to budget and evaluate commercial claims. Furthermore, many educational games and positive habits are also promoted through advertising, which can benefit children if managed responsibly.

In my opinion, although outright bans might be difficult to implement, advertising aimed at children must be strictly regulated. Governments should prohibit advertisements promoting junk food or using aggressive tactics, while parents must guide children to make sensible consumer choices.`,
    vocabulary: ['commercial manipulation', 'exaggerated', 'childhood obesity', 'outright bans', 'sensible consumer choices'],
    grammarFocus: ['relative clauses', 'passive forms of reporting', 'conditional sentences'],
  },
];
