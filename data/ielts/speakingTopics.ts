/**
 * Speaking study content, written for this app: Part 1 topic packs, Part 2
 * cue cards by type with stories that cover many cards, and Part 3 themes
 * with an O.R.E.O. model answer. No exam-book material is copied.
 */

export interface SpeakingVocab {
  phrase: string;
  meaningVi: string;
  example?: string;
}

// ─── Part 1 ─────────────────────────────────────────────────────────

export interface Part1Sample {
  question: string;
  band6: string;
  band7: string;
  /** What makes the band 7 answer better, in Vietnamese. */
  whyVi: string[];
}

export interface Part1Pack {
  id: string;
  topic: string;
  titleVi: string;
  questions: string[];
  /** What to talk about, in Vietnamese. */
  ideasVi: string[];
  vocabulary: SpeakingVocab[];
  sample: Part1Sample;
}

export const PART1_PACKS: readonly Part1Pack[] = [
  {
    id: 'p1_hometown',
    topic: 'Hometown',
    titleVi: 'Quê hương',
    questions: [
      'Where is your hometown?',
      'What do you like most about your hometown?',
      'Has your hometown changed much in recent years?',
      'Would you like to live there in the future?',
      'Is it a good place for young people?',
    ],
    ideasVi: [
      'Vị trí: thuộc tỉnh nào, cách thành phố lớn bao xa.',
      'Một điểm bạn thích cụ thể: món ăn, con sông, nhịp sống chậm.',
      'Thay đổi: đường mới, quán cà phê, nhà cao tầng thay ruộng.',
      'Một điều chưa tốt: ít việc làm, giao thông, thiếu chỗ giải trí.',
    ],
    vocabulary: [
      { phrase: 'a laid-back pace of life', meaningVi: 'nhịp sống thong thả', example: 'People love the laid-back pace of life there.' },
      { phrase: 'on the outskirts of', meaningVi: 'ở ngoại ô của', example: 'I grew up on the outskirts of Hue.' },
      { phrase: 'close-knit community', meaningVi: 'cộng đồng gắn bó', example: 'It is a close-knit community where everyone knows each other.' },
      { phrase: 'has changed beyond recognition', meaningVi: 'thay đổi đến mức khó nhận ra' },
      { phrase: 'job opportunities', meaningVi: 'cơ hội việc làm' },
      { phrase: 'move back', meaningVi: 'chuyển về lại (quê)' },
    ],
    sample: {
      question: 'Has your hometown changed much in recent years?',
      band6:
        'Yes, it changed a lot. Now there are many new buildings and roads. Before, there were many rice fields but now there are not many. I think it is good because life is more convenient, but it is also more noisy.',
      band7:
        "Yes, quite dramatically. When I was a kid, my town was surrounded by rice fields, but over the last ten years a lot of them have been turned into housing estates and shopping areas. On the plus side, life is far more convenient now, there's even a cinema. The downside is that it's lost some of its charm, and the traffic at rush hour can be pretty bad.",
      whyVi: [
        'Dùng đúng thì: "have been turned into" (hiện tại hoàn thành bị động) cho thay đổi kéo dài tới nay, thay vì "it changed".',
        'Từ vựng chính xác hơn: "dramatically", "housing estates", "lost some of its charm".',
        'Có cấu trúc rõ: "On the plus side… The downside is…" giúp câu trả lời cân bằng và mạch lạc.',
        'Chi tiết cụ thể ("there\'s even a cinema", "at rush hour") làm câu trả lời tự nhiên, không chung chung.',
      ],
    },
  },
  {
    id: 'p1_work_study',
    topic: 'Work or study',
    titleVi: 'Công việc / Học tập',
    questions: [
      'Do you work or are you a student?',
      'Why did you choose that subject (or job)?',
      'What do you find most difficult about your studies?',
      'What would you like to do after you finish your studies?',
      'Do you prefer to study in the morning or in the evening?',
    ],
    ideasVi: [
      'Nói rõ ngành, năm học hoặc vị trí công việc. Không cần nói tên trường dài dòng.',
      'Lý do chọn: sở thích từ nhỏ, cơ hội việc làm, ảnh hưởng của gia đình.',
      'Khó khăn: khối lượng bài, deadline, cân bằng học và làm thêm.',
      'Dự định: học lên, đi làm, du học. Dùng "I\'m hoping to…", "I\'d like to…".',
    ],
    vocabulary: [
      { phrase: 'I major in', meaningVi: 'tôi học chuyên ngành', example: 'I major in business administration.' },
      { phrase: 'heavy workload', meaningVi: 'khối lượng công việc nặng' },
      { phrase: 'meet deadlines', meaningVi: 'kịp hạn chót' },
      { phrase: 'hands-on experience', meaningVi: 'kinh nghiệm thực tế', example: 'An internship gives you hands-on experience.' },
      { phrase: 'career prospects', meaningVi: 'triển vọng nghề nghiệp' },
      { phrase: 'juggle work and study', meaningVi: 'xoay xở vừa làm vừa học' },
    ],
    sample: {
      question: 'What do you find most difficult about your studies?',
      band6:
        'The most difficult thing is the homework. We have a lot of homework every week and the deadlines are very close. Sometimes I do not have enough time, so I have to stay up late.',
      band7:
        "Probably the workload. In my third year we've got group projects in almost every module, and the deadlines tend to land in the same week, so I end up staying up late quite often. I'm also doing a part-time job, so juggling the two is a real challenge. I've started planning my week on Sunday evenings, which helps a bit.",
      whyVi: [
        'Mở đầu tự nhiên bằng "Probably…" thay vì lặp lại câu hỏi.',
        'Collocation chuẩn: "workload", "deadlines tend to land in the same week", "juggling the two".',
        'Thêm một ý giải quyết ở cuối ("I\'ve started planning…"), cho thấy khả năng mở rộng ý.',
        'Dùng dạng rút gọn ("we\'ve got", "I\'m") giúp giọng nói tự nhiên hơn.',
      ],
    },
  },
  {
    id: 'p1_home',
    topic: 'Home',
    titleVi: 'Nhà ở',
    questions: [
      'Do you live in a house or an apartment?',
      'Which room do you like most in your home?',
      'What would you change about your home?',
      'Do you plan to live there for a long time?',
      'What makes a home comfortable?',
    ],
    ideasVi: [
      'Loại nhà, ở với ai, ở bao lâu rồi.',
      'Phòng yêu thích và vì sao: ánh sáng, yên tĩnh, góc làm việc.',
      'Điều muốn thay đổi: chật, ồn, thiếu cây xanh.',
      'Dùng câu điều kiện: "If I could change one thing, I would…".',
    ],
    vocabulary: [
      { phrase: 'a cosy flat', meaningVi: 'căn hộ ấm cúng' },
      { phrase: 'plenty of natural light', meaningVi: 'nhiều ánh sáng tự nhiên' },
      { phrase: 'a bit cramped', meaningVi: 'hơi chật chội', example: 'My room is a bit cramped, but I like it.' },
      { phrase: 'a quiet neighbourhood', meaningVi: 'khu dân cư yên tĩnh' },
      { phrase: 'redecorate', meaningVi: 'trang trí lại' },
      { phrase: 'feel at home', meaningVi: 'cảm thấy thoải mái như ở nhà' },
    ],
    sample: {
      question: 'Which room do you like most in your home?',
      band6:
        'I like my bedroom the most. It is small but it is very quiet. I can study and relax there. I also have many books in my bedroom.',
      band7:
        "My bedroom, without a doubt. It's not very big, a bit cramped to be honest, but it gets plenty of natural light in the morning, and it's the only place in the house where I can really concentrate. I've put a small desk by the window and a shelf full of books, so it's a sort of study and a place to unwind at the same time.",
      whyVi: [
        '"without a doubt", "to be honest" là cụm tự nhiên giúp câu trả lời trôi chảy.',
        'Ý tương phản rõ: "not very big… but it gets plenty of natural light".',
        'Mệnh đề quan hệ ("the only place … where I can…") thể hiện độ đa dạng ngữ pháp.',
        '"unwind" thay cho "relax": từ ít phổ biến hơn, dùng đúng ngữ cảnh.',
      ],
    },
  },
  {
    id: 'p1_free_time',
    topic: 'Free time',
    titleVi: 'Thời gian rảnh và sở thích',
    questions: [
      'What do you usually do in your free time?',
      'Did you have the same hobbies when you were a child?',
      'Do you prefer spending free time alone or with others?',
      'Is there a new hobby you would like to try?',
      'Do people in your country have enough free time?',
    ],
    ideasVi: [
      'Một hoạt động chính, tần suất và cảm giác khi làm.',
      'So sánh quá khứ và hiện tại: "When I was younger I used to…, but these days…".',
      'Sở thích muốn thử: dùng "I\'ve always wanted to…", "I\'m thinking of…".',
    ],
    vocabulary: [
      { phrase: 'unwind after work', meaningVi: 'thư giãn sau giờ làm' },
      { phrase: 'take up a hobby', meaningVi: 'bắt đầu một sở thích', example: "I'd like to take up rock climbing." },
      { phrase: 'used to', meaningVi: 'đã từng (thói quen trong quá khứ)' },
      { phrase: 'get hooked on', meaningVi: 'bị cuốn vào, mê' },
      { phrase: 'recharge my batteries', meaningVi: 'nạp lại năng lượng' },
      { phrase: 'a hectic schedule', meaningVi: 'lịch trình bận rộn' },
    ],
    sample: {
      question: 'Did you have the same hobbies when you were a child?',
      band6:
        'No, not really. When I was a child I liked playing football with my friends. Now I like reading and watching films. I do not have time to play football now because I am busy.',
      band7:
        "Not really, no. As a kid I used to spend every afternoon playing football in the street with the neighbours' children. These days, with my hectic schedule, I tend to go for quieter things, like reading or watching a film to recharge my batteries. I do miss football, though, so I might join a weekend team at some point.",
      whyVi: [
        '"used to" diễn tả thói quen quá khứ, đối lập rõ với "These days … I tend to".',
        'Cụm thành ngữ dùng tự nhiên: "recharge my batteries", "hectic schedule".',
        'Câu kết "I do miss…, though" có nhấn mạnh và đảo ý, rất giống văn nói thật.',
      ],
    },
  },
  {
    id: 'p1_food',
    topic: 'Food',
    titleVi: 'Ăn uống',
    questions: [
      'What kind of food do you like?',
      'Do you often cook at home?',
      'Is there any food you did not like as a child but like now?',
      'Do you think people eat more healthily now than in the past?',
      'Do you prefer eating out or eating at home?',
    ],
    ideasVi: [
      'Món cụ thể, mô tả vị và cảm giác (đừng chỉ nói "delicious").',
      'Thói quen nấu ăn: ai nấu, bao lâu một lần, món sở trường.',
      'So sánh xưa và nay: đồ ăn nhanh, ăn ngoài nhiều hơn, quan tâm sức khoẻ hơn.',
    ],
    vocabulary: [
      { phrase: 'a rich, flavourful broth', meaningVi: 'nước dùng đậm đà' },
      { phrase: 'home-cooked meals', meaningVi: 'bữa ăn nấu ở nhà' },
      { phrase: 'grab a quick bite', meaningVi: 'ăn vội một chút' },
      { phrase: 'an acquired taste', meaningVi: 'món phải ăn quen mới thích', example: 'Durian is an acquired taste.' },
      { phrase: 'cut down on', meaningVi: 'cắt giảm', example: "I'm trying to cut down on sugar." },
      { phrase: 'processed food', meaningVi: 'thực phẩm chế biến sẵn' },
    ],
    sample: {
      question: 'Is there any food you did not like as a child but like now?',
      band6:
        'Yes, bitter melon. When I was a child I did not like it because it was very bitter. But now I like it because it is healthy and my mother cooks it very well.',
      band7:
        "Yes, bitter melon soup. As a kid I absolutely hated it, it was far too bitter for me, and I used to hide it under my rice. It's definitely an acquired taste, but now I actually crave it, especially on hot days, because it's so light and refreshing. My mum still laughs about how much I used to complain.",
      whyVi: [
        'Từ vựng mô tả cảm giác mạnh hơn: "absolutely hated", "crave", "light and refreshing".',
        'Thành ngữ "an acquired taste" đúng chỗ.',
        'Chi tiết cá nhân ("hide it under my rice") làm câu trả lời sinh động, dễ nhớ.',
      ],
    },
  },
  {
    id: 'p1_technology',
    topic: 'Technology',
    titleVi: 'Công nghệ và điện thoại',
    questions: [
      'How often do you use your phone?',
      'What apps do you use most?',
      'Do you think you spend too much time online?',
      'What was the first piece of technology you owned?',
      'Would you like to have less technology in your life?',
    ],
    ideasVi: [
      'Tần suất, mục đích chính (học, liên lạc, giải trí).',
      'Thừa nhận nhược điểm: lướt mạng quá nhiều, mất ngủ.',
      'Một cách bạn đang hạn chế: tắt thông báo, không dùng trước khi ngủ.',
    ],
    vocabulary: [
      { phrase: 'screen time', meaningVi: 'thời gian dùng màn hình' },
      { phrase: 'scroll through social media', meaningVi: 'lướt mạng xã hội' },
      { phrase: 'keep in touch with', meaningVi: 'giữ liên lạc với' },
      { phrase: 'can\'t do without', meaningVi: 'không thể thiếu' },
      { phrase: 'turn off notifications', meaningVi: 'tắt thông báo' },
      { phrase: 'a digital detox', meaningVi: 'thời gian cai thiết bị số' },
    ],
    sample: {
      question: 'Do you think you spend too much time online?',
      band6:
        'Yes, I think so. I use my phone for many hours every day, especially social media. Sometimes I use it until late at night and then I am tired in the morning.',
      band7:
        "Definitely, if I'm honest. My screen time report says around six hours a day, which is a bit shocking. A lot of that is mindless scrolling through social media, often late at night, so I don't sleep well. Recently I've turned off most notifications and I leave my phone in another room when I study, and it's made a real difference.",
      whyVi: [
        'Có số liệu cụ thể ("around six hours a day") làm câu trả lời thuyết phục.',
        '"mindless scrolling", "made a real difference": collocation tự nhiên.',
        'Dùng hiện tại hoàn thành ("I\'ve turned off…", "it\'s made…") đúng cho thay đổi gần đây.',
      ],
    },
  },
  {
    id: 'p1_weather',
    topic: 'Weather',
    titleVi: 'Thời tiết và mùa',
    questions: [
      'What is the weather like where you live?',
      'What is your favourite season?',
      'Does the weather affect your mood?',
      'Has the weather changed since you were young?',
      'What do you usually do on rainy days?',
    ],
    ideasVi: [
      'Mô tả khí hậu theo mùa: mùa mưa, mùa khô, nóng ẩm.',
      'Mùa yêu thích kèm hoạt động cụ thể.',
      'Ảnh hưởng tới tâm trạng: dùng "tend to", "makes me feel…".',
    ],
    vocabulary: [
      { phrase: 'hot and humid', meaningVi: 'nóng và ẩm' },
      { phrase: 'the rainy season', meaningVi: 'mùa mưa' },
      { phrase: 'a downpour', meaningVi: 'cơn mưa như trút' },
      { phrase: 'pleasantly cool', meaningVi: 'mát mẻ dễ chịu' },
      { phrase: 'it puts me in a good mood', meaningVi: 'nó làm tôi vui' },
      { phrase: 'unpredictable', meaningVi: 'khó đoán' },
    ],
    sample: {
      question: 'Does the weather affect your mood?',
      band6:
        'Yes, it does. When it is sunny I feel happy and I want to go out. When it rains I feel sad and lazy, so I usually stay at home.',
      band7:
        "It does, quite a lot actually. Bright, sunny mornings put me in a good mood and make me want to get out and do something. But during the rainy season, when there's a downpour every afternoon, I tend to feel a bit sluggish and I'd rather stay in with a cup of tea and a film.",
      whyVi: [
        '"put me in a good mood", "feel a bit sluggish" thay cho "happy" và "lazy".',
        'Mệnh đề thời gian phức ("when there\'s a downpour every afternoon").',
        '"I\'d rather stay in" là cấu trúc diễn tả lựa chọn tự nhiên.',
      ],
    },
  },
  {
    id: 'p1_travel',
    topic: 'Travel',
    titleVi: 'Du lịch và kỳ nghỉ',
    questions: [
      'Do you like travelling?',
      'Where did you go on your last holiday?',
      'Do you prefer travelling alone or with others?',
      'What kind of places would you like to visit in the future?',
      'Is it better to plan a trip or to be spontaneous?',
    ],
    ideasVi: [
      'Chuyến đi gần nhất: ở đâu, với ai, một khoảnh khắc đáng nhớ.',
      'Phong cách đi: tự túc, theo tour, lên kế hoạch kỹ hay ngẫu hứng.',
      'Nơi muốn đến: dùng "I\'ve always dreamed of…", "it\'s on my bucket list".',
    ],
    vocabulary: [
      { phrase: 'go sightseeing', meaningVi: 'đi tham quan' },
      { phrase: 'off the beaten track', meaningVi: 'nơi ít người biết đến' },
      { phrase: 'on a tight budget', meaningVi: 'với ngân sách eo hẹp' },
      { phrase: 'it\'s on my bucket list', meaningVi: 'nằm trong danh sách việc muốn làm' },
      { phrase: 'a spur-of-the-moment trip', meaningVi: 'chuyến đi ngẫu hứng' },
      { phrase: 'broaden my horizons', meaningVi: 'mở mang tầm nhìn' },
    ],
    sample: {
      question: 'Where did you go on your last holiday?',
      band6:
        'My last holiday was in Da Lat. I went there with my friends for three days. The weather was cool and we visited many beautiful places. I really liked the flower gardens.',
      band7:
        "I went to Da Lat with a couple of university friends last December. It was a spur-of-the-moment trip, we booked the bus the night before, but it turned out to be one of the best weekends I've had in ages. The air was pleasantly cool, and instead of the usual tourist spots we rented motorbikes and found a little coffee farm off the beaten track.",
      whyVi: [
        'Cụm từ ít phổ biến dùng chính xác: "spur-of-the-moment", "off the beaten track".',
        '"it turned out to be one of the best… I\'ve had in ages": cấu trúc so sánh nhất với hiện tại hoàn thành.',
        'Có điểm nhấn riêng ("a little coffee farm") thay vì liệt kê chung chung.',
      ],
    },
  },
];

// ─── Part 2 ─────────────────────────────────────────────────────────

export type CueCategory = 'person' | 'place' | 'object' | 'event' | 'experience';

export const CUE_CATEGORIES: readonly CueCategory[] = ['person', 'place', 'object', 'event', 'experience'];

export const CUE_CATEGORY_LABELS: Record<CueCategory, string> = {
  person: 'Người',
  place: 'Nơi chốn',
  object: 'Đồ vật',
  event: 'Sự kiện',
  experience: 'Trải nghiệm',
};

export interface CueCard {
  id: string;
  category: CueCategory;
  title: string;
  /** "You should say:" points, the last one is the "and explain…" point. */
  bullets: string[];
  /** One line of keywords per bullet: what a one-minute note looks like. */
  notes: string[];
  sample: string;
  vocabulary: SpeakingVocab[];
}

export const CUE_CARDS: readonly CueCard[] = [
  {
    id: 'cc_person_influence',
    category: 'person',
    title: 'Describe a person who has had a positive influence on you.',
    bullets: ['who this person is', 'how you know them', 'what they have done for you', 'and explain why they have influenced you so much'],
    notes: ['Ms Lan, English teacher, grade 10', 'small class, extra lessons after school', 'lent me books, made me speak every lesson', 'confidence, chose to study English'],
    sample:
      "I'd like to talk about my high school English teacher, Ms Lan. She taught me in grade ten, when I was honestly quite a shy student who barely said a word in class.\n\nWhat made her different was that she insisted everyone spoke in every lesson, even if it was just one sentence. At first I found it terrifying, but she was incredibly patient and never made fun of our mistakes. She also ran free extra lessons after school, and she used to lend me her old novels, which is how I got into reading in English.\n\nThe reason she influenced me so much is that she changed how I saw myself. Before her class, I thought I was just bad at languages. By the end of the year I was taking part in a speaking competition, and that's actually why I decided to study English at university. We still keep in touch, and I always send her a message on Teachers' Day.",
    vocabulary: [
      { phrase: 'a positive influence on', meaningVi: 'ảnh hưởng tích cực đến' },
      { phrase: 'incredibly patient', meaningVi: 'cực kỳ kiên nhẫn' },
      { phrase: 'got into', meaningVi: 'bắt đầu thích' },
      { phrase: 'changed how I saw myself', meaningVi: 'thay đổi cách tôi nhìn bản thân' },
    ],
  },
  {
    id: 'cc_person_admire',
    category: 'person',
    title: 'Describe someone you know who is good at their job.',
    bullets: ['who this person is', 'what their job is', 'how you know they are good at it', 'and explain how you feel about this person'],
    notes: ['my uncle Minh, mechanic', 'small garage near my house', 'customers come from far away, fixes in one visit', 'admire, honest, never overcharges'],
    sample:
      "The person I'm going to describe is my uncle Minh, who runs a small motorbike repair shop not far from my house.\n\nHe's been a mechanic for over twenty years, and he's one of those people who can tell what's wrong with an engine just by listening to it for a few seconds. I know he's good at his job because customers come from other districts to see him, even though there are plenty of garages closer to them. He usually fixes a problem in one visit, and he explains clearly what he has done.\n\nWhat I admire most, though, is his honesty. He never charges for repairs that aren't necessary, and if something can be fixed cheaply, he'll tell you. I think that's why people trust him. Whenever I see him, I'm reminded that being good at a job isn't only about skill, it's also about how you treat people.",
    vocabulary: [
      { phrase: 'runs a small business', meaningVi: 'điều hành một cơ sở nhỏ' },
      { phrase: 'overcharge', meaningVi: 'tính giá quá cao' },
      { phrase: 'what I admire most is', meaningVi: 'điều tôi ngưỡng mộ nhất là' },
    ],
  },
  {
    id: 'cc_place_relax',
    category: 'place',
    title: 'Describe a place where you like to relax.',
    bullets: ['where it is', 'how often you go there', 'what you do there', 'and explain why it is relaxing for you'],
    notes: ['small lake park, 10 min from home', 'weekend mornings, early', 'walk, music, sit on bench, watch people', 'quiet, trees, away from screens'],
    sample:
      "A place I really like to unwind is a small park built around a lake, about ten minutes from where I live.\n\nI usually go there on weekend mornings, quite early, before it gets hot and crowded. There's a path that goes all the way around the lake, so I normally walk a couple of laps with some music on, and then I just sit on a bench under the trees and watch what's going on. There are always elderly people doing tai chi and kids feeding the fish.\n\nThe reason it's so relaxing for me is that it's one of the few places in the city where it's genuinely quiet. During the week I'm in front of a screen almost all day, so being surrounded by trees and water, even for an hour, really clears my head. I usually leave feeling much calmer and ready for the rest of the week.",
    vocabulary: [
      { phrase: 'clears my head', meaningVi: 'giúp đầu óc thoải mái' },
      { phrase: 'genuinely quiet', meaningVi: 'thực sự yên tĩnh' },
      { phrase: 'before it gets crowded', meaningVi: 'trước khi đông người' },
    ],
  },
  {
    id: 'cc_place_visited',
    category: 'place',
    title: 'Describe a city or town you visited that you would like to go back to.',
    bullets: ['where it is', 'when and why you went there', 'what you did there', 'and explain why you would like to go back'],
    notes: ['Hoi An, central Vietnam', 'last summer, family trip', 'old town, lanterns, tailor, bike to beach', 'didn\'t have time for countryside, peaceful'],
    sample:
      "I'd like to talk about Hoi An, an old trading town in central Vietnam, which I visited with my family last summer.\n\nWe went mainly because my parents had been there years ago and wanted to show us. We spent most of our time in the old town, wandering through the narrow streets lined with yellow houses. In the evening the whole place is lit up by silk lanterns, which is honestly one of the most beautiful sights I've ever seen. We also had some clothes made at a local tailor, and one morning we cycled out to the beach.\n\nThe main reason I'd love to go back is that we were only there for three days, so we didn't have time to explore the countryside around it, like the vegetable villages. Also, it has a really peaceful atmosphere that's hard to find in big cities. Next time, I'd like to go in the low season, when it's less crowded.",
    vocabulary: [
      { phrase: 'narrow streets lined with', meaningVi: 'những con phố hẹp hai bên là' },
      { phrase: 'lit up by lanterns', meaningVi: 'được thắp sáng bởi đèn lồng' },
      { phrase: 'the low season', meaningVi: 'mùa thấp điểm' },
    ],
  },
  {
    id: 'cc_object_useful',
    category: 'object',
    title: 'Describe something you own that is very useful to you.',
    bullets: ['what it is', 'when and how you got it', 'how often you use it', 'and explain why it is so useful'],
    notes: ['second-hand laptop', 'bought from a senior student, first year', 'every day: notes, assignments, part-time job', 'study + earn money, saved me money'],
    sample:
      "Something I use every single day is my laptop. It's nothing special, it's actually second-hand, but I honestly couldn't manage without it.\n\nI bought it in my first year of university from a student in the year above me who was upgrading to a newer model. It was much cheaper than buying a new one, and it was in very good condition.\n\nI use it for pretty much everything: taking notes in lectures, writing assignments, and joining online classes. On top of that, I do some part-time design work, so it's also how I earn a bit of money.\n\nWhat makes it so useful is that it combines my study and my work in one place. Without it, I'd have to spend hours in the university library using the shared computers. It's getting a bit slow now, but I'm planning to keep it until I graduate.",
    vocabulary: [
      { phrase: 'second-hand', meaningVi: 'đồ cũ, đã qua sử dụng' },
      { phrase: 'couldn\'t manage without it', meaningVi: 'không thể xoay xở nếu thiếu nó' },
      { phrase: 'in very good condition', meaningVi: 'còn rất tốt' },
    ],
  },
  {
    id: 'cc_object_gift',
    category: 'object',
    title: 'Describe a gift you received that was special to you.',
    bullets: ['what it was', 'who gave it to you', 'when you received it', 'and explain why it was special'],
    notes: ['handmade photo album', 'best friends, 3 people', '18th birthday', 'effort, memories, read when homesick'],
    sample:
      "I'd like to describe a photo album that my three closest friends made for me on my eighteenth birthday.\n\nIt wasn't an expensive gift at all, but it was clearly a lot of work. They had secretly collected photos of us from primary school onwards, printed them, and written little notes next to each one about what we were doing at the time. Some of the notes were really funny, and a few were quite emotional.\n\nWhat made it so special was the effort behind it. I later found out they had spent several weekends putting it together without me knowing. Also, a few months after that, I moved to another city for university, and whenever I felt homesick, I would flip through the album and feel better straight away. It's still on the shelf above my desk, and it's probably the one thing I'd grab if there were a fire.",
    vocabulary: [
      { phrase: 'the effort behind it', meaningVi: 'công sức đằng sau nó' },
      { phrase: 'feel homesick', meaningVi: 'nhớ nhà' },
      { phrase: 'flip through', meaningVi: 'lật xem' },
    ],
  },
  {
    id: 'cc_event_celebration',
    category: 'event',
    title: 'Describe a celebration you enjoyed.',
    bullets: ['what the celebration was', 'where and when it took place', 'who was there', 'and explain why you enjoyed it'],
    notes: ['grandparents\' 50th wedding anniversary', 'grandparents\' house, countryside, last spring', 'whole family, 40 people, cousins from abroad', 'together after years, grandpa\'s speech'],
    sample:
      "The celebration I want to talk about is my grandparents' fiftieth wedding anniversary, which we held last spring.\n\nIt took place at their house in the countryside. My uncles set up tables in the yard, and almost forty relatives turned up, including two cousins who flew back from Australia especially for it. Everyone brought a dish, so there was far more food than we could possibly eat.\n\nI enjoyed it mainly because it was the first time in years that the whole family had been in one place. Usually we only meet at Tet, and even then not everyone can make it. The highlight for me was when my grandfather, who is normally very quiet, stood up and gave a short speech about how they met. A few people were in tears, including me. It reminded me how lucky I am to have such a close family.",
    vocabulary: [
      { phrase: 'turned up', meaningVi: 'có mặt, đến' },
      { phrase: 'the highlight for me was', meaningVi: 'điểm đáng nhớ nhất với tôi là' },
      { phrase: 'make it', meaningVi: 'đến được, tham dự được' },
    ],
  },
  {
    id: 'cc_event_learned',
    category: 'event',
    title: 'Describe an important lesson or event at school or university that you remember well.',
    bullets: ['what it was', 'when it happened', 'what you did', 'and explain why you remember it'],
    notes: ['first group presentation, failed', 'first year, marketing module', 'no rehearsal, overran, lost marks', 'learned to prepare, now rehearse twice'],
    sample:
      "Something I remember really well is the first group presentation I did at university, mainly because it went quite badly.\n\nIt was in my first year, for a marketing module. There were four of us, and we each prepared our own slides separately without ever rehearsing together. On the day, our parts didn't connect at all, two of us repeated the same points, and we went five minutes over the time limit, so the lecturer had to stop us.\n\nWe got a fairly low mark, and I was embarrassed at the time. But looking back, it was one of the most useful things that happened to me. Since then, I always insist that my group rehearses at least twice before any presentation, and we time ourselves. My presentations have improved a lot, and I don't panic in front of an audience the way I used to.",
    vocabulary: [
      { phrase: 'went quite badly', meaningVi: 'diễn ra khá tệ' },
      { phrase: 'looking back', meaningVi: 'nhìn lại' },
      { phrase: 'rehearse', meaningVi: 'tập dượt' },
    ],
  },
  {
    id: 'cc_experience_challenge',
    category: 'experience',
    title: 'Describe a time when you did something difficult for the first time.',
    bullets: ['what you did', 'when and where you did it', 'why it was difficult', 'and explain how you felt afterwards'],
    notes: ['part-time job in a café, first day', 'summer after high school, busy street', 'English-speaking customers, coffee machine, rush hour', 'exhausted but proud, confidence'],
    sample:
      "I'd like to talk about my first day working at a café, which was the summer after I finished high school.\n\nThe café was on a busy street popular with tourists, so a lot of the customers spoke English. I had studied English for years, but I had never actually used it with real people, let alone while trying to operate a complicated coffee machine at the same time.\n\nThe hardest part was the lunchtime rush. There was a queue out of the door, I kept mixing up orders, and at one point I completely forgot how to say 'iced'. Luckily, my manager was very understanding and stepped in when I got stuck.\n\nBy the end of the day I was absolutely exhausted, but I also felt really proud of myself. After a couple of weeks it became much easier, and that job did more for my speaking confidence than years of classes.",
    vocabulary: [
      { phrase: 'let alone', meaningVi: 'huống chi là' },
      { phrase: 'the lunchtime rush', meaningVi: 'giờ cao điểm buổi trưa' },
      { phrase: 'stepped in', meaningVi: 'can thiệp giúp đỡ' },
    ],
  },
  {
    id: 'cc_experience_happy',
    category: 'experience',
    title: 'Describe a time when you felt very happy.',
    bullets: ['when it was', 'where you were', 'what happened', 'and explain why you felt so happy'],
    notes: ['the day I got my university result', 'home, with parents, July', 'checked online, passed first choice', 'hard work paid off, parents proud'],
    sample:
      "One of the happiest moments I can remember was the day I found out I had got into my first-choice university.\n\nIt was in July, a couple of years ago. I was at home with my parents, and we were all sitting around the computer waiting for the results to be published online. The website kept crashing because so many students were trying to log in at the same time, which made the wait even more stressful.\n\nWhen the page finally loaded and I saw that my score was well above the cut-off, I just screamed. My mum burst into tears, and my dad, who doesn't usually show his feelings, gave me a big hug.\n\nI was so happy because I'd been studying really hard for that exam for over a year, giving up weekends and holidays. Seeing all that hard work pay off, and seeing how proud my parents were, made it a day I'll never forget.",
    vocabulary: [
      { phrase: 'got into my first-choice university', meaningVi: 'đỗ nguyện vọng 1' },
      { phrase: 'the cut-off', meaningVi: 'điểm chuẩn' },
      { phrase: 'hard work paid off', meaningVi: 'công sức được đền đáp' },
    ],
  },
];

/** One story that answers many cue cards with small changes. */
export interface StoryBank {
  id: string;
  titleVi: string;
  summaryVi: string;
  /** Details to keep ready, in English. */
  details: string[];
  /** Cards it answers: one of CUE_CARDS by id, or another common card by title. */
  covers: { cardId?: string; title: string; angleVi: string }[];
}

export const STORY_BANKS: readonly StoryBank[] = [
  {
    id: 'story_trip',
    titleVi: 'Một chuyến đi ngẫu hứng với bạn bè',
    summaryVi: 'Chuyến đi Đà Lạt hoặc Hội An với bạn thân: đặt vé phút chót, thuê xe máy, tìm ra một nơi ít người biết.',
    details: ['booked the night before', 'rented motorbikes', 'a coffee farm off the beaten track', 'got lost, a local family helped us', 'best weekend in ages'],
    covers: [
      { cardId: 'cc_place_visited', title: 'A city you would like to go back to', angleVi: 'Nhấn vào nơi chốn và lý do muốn quay lại.' },
      { cardId: 'cc_experience_happy', title: 'A time you felt very happy', angleVi: 'Kể khoảnh khắc tìm ra nông trại cà phê như cao trào.' },
      { title: 'A time you got lost', angleVi: 'Kể đoạn lạc đường và gia đình địa phương giúp đỡ.' },
      { title: 'A person who helped you', angleVi: 'Chọn người chủ nhà đã chỉ đường làm nhân vật chính.' },
      { title: 'A photo you like', angleVi: 'Mô tả tấm ảnh nhóm chụp ở nông trại.' },
    ],
  },
  {
    id: 'story_teacher',
    titleVi: 'Người thầy cô đã thay đổi bạn',
    summaryVi: 'Cô giáo tiếng Anh cấp 3 bắt mọi người nói mỗi buổi, cho mượn sách, giúp bạn tự tin và chọn ngành.',
    details: ['shy student', 'made everyone speak every lesson', 'lent me novels', 'speaking competition', 'chose to study English'],
    covers: [
      { cardId: 'cc_person_influence', title: 'A person who has had a positive influence on you', angleVi: 'Kể đầy đủ như bài mẫu.' },
      { cardId: 'cc_person_admire', title: 'Someone who is good at their job', angleVi: 'Nhấn vào kỹ năng dạy và sự kiên nhẫn của cô.' },
      { cardId: 'cc_event_learned', title: 'An important lesson you remember', angleVi: 'Kể buổi học đầu tiên bạn phải nói trước lớp.' },
      { title: 'A book you enjoyed', angleVi: 'Chọn cuốn tiểu thuyết cô cho mượn.' },
      { title: 'A competition you took part in', angleVi: 'Kể cuộc thi nói tiếng Anh cô khuyến khích bạn tham gia.' },
    ],
  },
  {
    id: 'story_job',
    titleVi: 'Công việc làm thêm đầu tiên',
    summaryVi: 'Làm ở quán cà phê đông khách du lịch: ngày đầu vất vả, nhầm đơn, quản lý giúp đỡ, sau đó tự tin hơn.',
    details: ['café on a tourist street', 'lunchtime rush', 'mixed up orders', 'understanding manager', 'first salary, bought a gift for my parents'],
    covers: [
      { cardId: 'cc_experience_challenge', title: 'Something difficult you did for the first time', angleVi: 'Kể ngày làm việc đầu tiên.' },
      { cardId: 'cc_object_useful', title: 'Something you bought with your own money', angleVi: 'Dùng tiền lương đầu tiên để mua đồ (máy tính, quà cho bố mẹ).' },
      { title: 'A time you helped someone', angleVi: 'Kể lần bạn giúp một khách du lịch bị lạc.' },
      { title: 'A skill you learned', angleVi: 'Pha cà phê hoặc giao tiếp với khách.' },
      { title: 'A person who is good at their job', angleVi: 'Chọn người quản lý quán làm nhân vật chính.' },
    ],
  },
];

// ─── Part 3 ─────────────────────────────────────────────────────────

export interface OreoAnswer {
  question: string;
  opinion: string;
  reason: string;
  example: string;
  /** Outcome or opinion again: the closing sentence. */
  outcome: string;
}

export interface Part3Theme {
  id: string;
  topic: string;
  titleVi: string;
  questions: string[];
  oreo: OreoAnswer;
  vocabulary: SpeakingVocab[];
}

export const OREO_STEPS: ReadonlyArray<{ key: keyof Omit<OreoAnswer, 'question'>; label: string; hintVi: string }> = [
  { key: 'opinion', label: 'Opinion', hintVi: 'Trả lời thẳng câu hỏi trong một câu.' },
  { key: 'reason', label: 'Reason', hintVi: 'Vì sao bạn nghĩ vậy.' },
  { key: 'example', label: 'Example', hintVi: 'Một ví dụ cụ thể: số liệu, người quen, điều bạn thấy.' },
  { key: 'outcome', label: 'Outcome', hintVi: 'Hệ quả, hoặc nhắc lại quan điểm có thêm sắc thái.' },
];

export const PART3_THEMES: readonly Part3Theme[] = [
  {
    id: 'p3_education',
    topic: 'Education',
    titleVi: 'Giáo dục',
    questions: [
      'Should university education be free for everyone?',
      'How has technology changed the way students learn?',
      'Is it more important to learn practical skills or academic knowledge at school?',
      'Why do some students prefer studying abroad?',
    ],
    oreo: {
      question: 'Is it more important to learn practical skills or academic knowledge at school?',
      opinion: "I'd say schools need both, but at the moment the balance is tipped too far towards academic knowledge.",
      reason: 'Students spend years memorising facts for exams, yet many leave school without knowing how to manage money or communicate in a team, which are things they need every day.',
      example: "A lot of my friends got excellent grades in maths, but when they started their first jobs, they struggled with basic things like writing a professional email or planning a budget.",
      outcome: "So I think if schools gave even a few hours a week to practical skills, young people would be far better prepared for adult life, without losing the academic foundation.",
    },
    vocabulary: [
      { phrase: 'tipped too far towards', meaningVi: 'nghiêng quá nhiều về' },
      { phrase: 'rote learning', meaningVi: 'học vẹt' },
      { phrase: 'well-rounded', meaningVi: 'phát triển toàn diện' },
      { phrase: 'equip students with', meaningVi: 'trang bị cho học sinh' },
    ],
  },
  {
    id: 'p3_technology',
    topic: 'Technology',
    titleVi: 'Công nghệ',
    questions: [
      'Do you think people rely too much on their smartphones?',
      'How might artificial intelligence change the way people work?',
      'Are older people at a disadvantage in a digital world?',
      'Should children be allowed to use tablets from a young age?',
    ],
    oreo: {
      question: 'Are older people at a disadvantage in a digital world?',
      opinion: 'In many ways, yes, especially now that so many basic services have moved online.',
      reason: "Things like booking a doctor's appointment or paying bills increasingly require an app, and older people who didn't grow up with technology can find this confusing or even stressful.",
      example: 'My grandmother, for instance, had to rely on me every time she wanted to transfer money, because the bank had closed the branch near her house.',
      outcome: "That said, I think the gap is narrowing, because younger family members can teach them, and some apps now have simpler versions designed for seniors.",
    },
    vocabulary: [
      { phrase: 'at a disadvantage', meaningVi: 'ở thế bất lợi' },
      { phrase: 'the digital divide', meaningVi: 'khoảng cách số' },
      { phrase: 'tech-savvy', meaningVi: 'thành thạo công nghệ' },
      { phrase: 'the gap is narrowing', meaningVi: 'khoảng cách đang thu hẹp' },
    ],
  },
  {
    id: 'p3_environment',
    topic: 'Environment',
    titleVi: 'Môi trường',
    questions: [
      'What can individuals do to protect the environment?',
      'Should the government or companies be responsible for reducing pollution?',
      'Why do some people not care about environmental problems?',
      'Will people use less plastic in the future?',
    ],
    oreo: {
      question: 'Should the government or companies be responsible for reducing pollution?',
      opinion: 'I think the main responsibility lies with governments, although companies obviously have a big role to play.',
      reason: "Companies exist to make a profit, so unless there are clear rules and penalties, many of them won't choose the cleaner option if it costs more.",
      example: 'In Vietnam, for example, factories along some rivers only started treating their waste water properly after the authorities introduced heavy fines.',
      outcome: "So governments need to set the rules and enforce them, and then companies can compete to find the most efficient ways to meet those standards.",
    },
    vocabulary: [
      { phrase: 'the responsibility lies with', meaningVi: 'trách nhiệm thuộc về' },
      { phrase: 'introduce heavy fines', meaningVi: 'áp dụng mức phạt nặng' },
      { phrase: 'enforce the rules', meaningVi: 'thực thi quy định' },
      { phrase: 'carbon footprint', meaningVi: 'lượng khí thải carbon' },
    ],
  },
  {
    id: 'p3_work',
    topic: 'Work',
    titleVi: 'Công việc',
    questions: [
      'Is job satisfaction more important than salary?',
      'Will working from home become more common?',
      'Why do some young people change jobs frequently?',
      'What qualities make a good manager?',
    ],
    oreo: {
      question: 'Will working from home become more common?',
      opinion: "I think it will, but mostly as a mix of home and office rather than fully remote work.",
      reason: 'Both sides benefit: employees save time on commuting, and companies can reduce the cost of office space, but people still need face-to-face contact to build trust and share ideas.',
      example: 'My cousin works for a software company in Ho Chi Minh City, and they now come into the office two days a week for meetings and work from home for the rest.',
      outcome: "Because this hybrid model seems to keep everyone fairly happy, I expect it to become the norm in office jobs, though obviously not in jobs like nursing or construction.",
    },
    vocabulary: [
      { phrase: 'a hybrid model', meaningVi: 'mô hình kết hợp' },
      { phrase: 'face-to-face contact', meaningVi: 'tiếp xúc trực tiếp' },
      { phrase: 'become the norm', meaningVi: 'trở thành chuẩn mực' },
      { phrase: 'job satisfaction', meaningVi: 'sự hài lòng với công việc' },
    ],
  },
  {
    id: 'p3_cities',
    topic: 'Cities',
    titleVi: 'Đô thị',
    questions: [
      'Why do so many young people move to big cities?',
      'What are the main problems of living in a large city?',
      'How could traffic congestion be reduced?',
      'Will cities look very different in 50 years?',
    ],
    oreo: {
      question: 'Why do so many young people move to big cities?',
      opinion: 'Mainly for opportunities, both in education and in work.',
      reason: 'The best universities and most of the well-paid jobs are concentrated in a few major cities, so staying in a small town can limit what young people are able to achieve.',
      example: "Almost everyone from my class in high school moved to Hanoi or Ho Chi Minh City after graduating, either to study or to find work, because there simply weren't many options at home.",
      outcome: "Unless smaller cities develop more industries and services, I think this trend will continue, and big cities will keep getting more crowded.",
    },
    vocabulary: [
      { phrase: 'concentrated in', meaningVi: 'tập trung ở' },
      { phrase: 'traffic congestion', meaningVi: 'ùn tắc giao thông' },
      { phrase: 'the cost of living', meaningVi: 'chi phí sinh hoạt' },
      { phrase: 'urban sprawl', meaningVi: 'đô thị hoá lan rộng' },
    ],
  },
  {
    id: 'p3_culture',
    topic: 'Culture',
    titleVi: 'Văn hoá và truyền thống',
    questions: [
      'Are traditional festivals still important to young people?',
      'How does tourism affect local culture?',
      'Should children learn about traditional crafts at school?',
      'Is globalisation making cultures more similar?',
    ],
    oreo: {
      question: 'Are traditional festivals still important to young people?',
      opinion: "I think they are, but young people celebrate them in a slightly different way from their parents.",
      reason: "Festivals like Tet are still the main time when families get together, and that matters to everyone, but many of the older rituals feel less meaningful to people who grew up in cities.",
      example: "My friends and I still go home for Tet every year, but instead of visiting every relative for days, we might spend one day with family and then travel somewhere together.",
      outcome: "So the festivals themselves aren't disappearing, they're just adapting, which I think is quite natural for any tradition.",
    },
    vocabulary: [
      { phrase: 'get together', meaningVi: 'sum họp' },
      { phrase: 'rituals', meaningVi: 'nghi lễ' },
      { phrase: 'adapting rather than disappearing', meaningVi: 'thích nghi chứ không mất đi' },
      { phrase: 'cultural heritage', meaningVi: 'di sản văn hoá' },
    ],
  },
];

/** Phrases that help Part 3 answers sound like discussion. */
export const PART3_PHRASES: ReadonlyArray<{ id: string; titleVi: string; items: string[] }> = [
  {
    id: 'opinion',
    titleVi: 'Nêu quan điểm có sắc thái',
    items: ["I'd say that…", "As far as I can tell,…", "I'm inclined to think that…", "It depends, but generally…"],
  },
  {
    id: 'balance',
    titleVi: 'Nhìn hai phía',
    items: ['On the one hand… On the other hand…', 'That said,…', "While it's true that…, …", 'There are pros and cons.'],
  },
  {
    id: 'speculate',
    titleVi: 'Dự đoán tương lai',
    items: ["I expect that… will…", "It's likely that…", "There's a good chance that…", 'In the long run,…'],
  },
  {
    id: 'compare_past',
    titleVi: 'So sánh xưa và nay',
    items: ['Compared to a generation ago,…', 'These days… whereas in the past…', "People used to…, but now…"],
  },
  {
    id: 'time',
    titleVi: 'Câu mua thời gian (dùng ít thôi)',
    items: ["That's an interesting question. I've never really thought about it, but…", 'Let me think…', "Well, it's hard to say, but…"],
  },
];

export function findPart1Pack(id: string): Part1Pack | undefined {
  return PART1_PACKS.find((p) => p.id === id);
}

export function findCueCard(id: string): CueCard | undefined {
  return CUE_CARDS.find((c) => c.id === id);
}

export function findPart3Theme(id: string): Part3Theme | undefined {
  return PART3_THEMES.find((t) => t.id === id);
}
