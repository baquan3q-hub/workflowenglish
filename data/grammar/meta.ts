/** Roadmap, lesson index and topic hubs. Loaded with the module; lesson bodies load per stage. */
import type { Cefr, HubId, LessonBody, LessonMeta, StageId } from './types';

export interface Stage {
  id: StageId;
  cefr: string;
  title: string;
  outcome: string;
}

export const stages: Stage[] = [
  { id: 0, cefr: 'A1', title: 'Khởi động từ số 0', outcome: 'Đặt được câu đúng cấu trúc để giới thiệu người, vật và nơi chốn.' },
  { id: 1, cefr: 'A1', title: 'Nói về hiện tại', outcome: 'Kể thói quen, việc đang làm và hỏi đáp về cuộc sống hằng ngày.' },
  { id: 2, cefr: 'A2', title: 'Quá khứ và tương lai', outcome: 'Kể lại một chuyện đã qua, nói kế hoạch và so sánh hai lựa chọn.' },
  { id: 3, cefr: 'A2–B1', title: 'Các thì hoàn thành và động từ khuyết thiếu', outcome: 'Dùng đủ 12 thì, nói trải nghiệm, khả năng, lời khuyên và sự bắt buộc.' },
  { id: 4, cefr: 'B1', title: 'Mở rộng câu', outcome: 'Viết câu dài có bị động, điều kiện, mệnh đề quan hệ và liên từ.' },
  { id: 5, cefr: 'B2', title: 'Ngữ pháp cho IELTS 6.0–7.0', outcome: 'Viết câu phức chính xác cho Task 1, Task 2 và trả lời giả định trong Speaking.' },
  { id: 6, cefr: 'C1', title: 'Văn phong học thuật', outcome: 'Đa dạng cấu trúc, nhấn mạnh và rào đón như người viết học thuật.' },
];

const m = (
  id: string,
  stage: StageId,
  cefr: Cefr,
  title: string,
  en: string,
  hook: string,
  prereq: string[] = [],
  aliases: string[] = []
): LessonMeta => ({ id, stage, cefr, title, en, hook, prereq, aliases });

export const lessons: LessonMeta[] = [
  // Chặng 0
  m('sentence', 0, 'A1', 'Câu tiếng Anh cần những gì', 'Sentence basics', 'Nhận ra chủ ngữ, động từ và biết vì sao câu tiếng Anh không được thiếu động từ.', [], ['chủ ngữ', 'động từ', 'thành phần câu']),
  m('be', 0, 'A1', 'Động từ be: am, is, are', 'The verb be', 'Giới thiệu tên, nghề, cảm xúc và nơi ở của một người.', ['sentence'], ['to be', 'là']),
  m('pronouns', 0, 'A1', 'Đại từ: I, me, my, mine', 'Pronouns', 'Thay tên người, vật bằng đại từ đúng vị trí chủ ngữ, tân ngữ.', ['be'], ['đại từ nhân xưng', 'tân ngữ']),
  m('nouns', 0, 'A1', 'Danh từ số ít, số nhiều và đếm được', 'Nouns and plurals', 'Nói đúng số lượng người, đồ vật và phân biệt danh từ đếm được với không đếm được.', ['be'], ['số nhiều', 'đếm được', 'plural']),
  m('articles', 0, 'A1', 'Mạo từ a, an, the', 'Articles', 'Giới thiệu một vật lần đầu và nhắc lại vật mà người nghe đã biết.', ['nouns'], ['mạo từ', 'a an the']),
  m('adjectives', 0, 'A1', 'Tính từ và vị trí của tính từ', 'Adjectives', 'Miêu tả người, vật bằng tính từ đặt đúng chỗ.', ['be'], ['tính từ', 'miêu tả']),
  m('possessive', 0, 'A1', "Sở hữu: my, 's và of", 'Possessives', 'Nói đồ vật, mối quan hệ thuộc về ai.', ['pronouns'], ['sở hữu cách', "'s"]),
  m('order', 0, 'A1', 'Trật tự từ trong câu', 'Word order', 'Sắp xếp ai, làm gì, cái gì, ở đâu, khi nào theo đúng thứ tự tiếng Anh.', ['sentence'], ['trật tự từ', 'SVO']),
  // Chặng 1
  m('present-simple', 1, 'A1', 'Thì hiện tại đơn', 'Present simple', 'Kể thói quen, lịch trình và sự thật hiển nhiên.', ['be'], ['thói quen', 's es']),
  m('do-question', 1, 'A1', 'Câu hỏi và phủ định với do, does', "Do / does questions and negatives", 'Hỏi người khác thường làm gì và nói điều mình không làm.', ['present-simple'], ["don't", "doesn't", 'câu hỏi yes no']),
  m('wh', 1, 'A1', 'Câu hỏi với từ để hỏi', 'Wh- questions', 'Hỏi ai, cái gì, ở đâu, khi nào, vì sao, như thế nào.', ['do-question'], ['what where when why how', 'từ để hỏi']),
  m('frequency', 1, 'A1', 'Trạng từ tần suất', 'Adverbs of frequency', 'Nói mình làm việc gì thường xuyên đến mức nào.', ['present-simple'], ['always usually often', 'tần suất']),
  m('present-continuous', 1, 'A1', 'Thì hiện tại tiếp diễn', 'Present continuous', 'Nói việc đang diễn ra lúc này và tình huống tạm thời.', ['be'], ['đang', 'V-ing']),
  m('present-contrast', 1, 'A2', 'Hiện tại đơn hay hiện tại tiếp diễn', 'Present simple vs continuous', 'Chọn đúng thì khi nói thói quen, việc đang làm và động từ chỉ trạng thái.', ['present-simple', 'present-continuous'], ['stative verbs', 'phân biệt thì hiện tại']),
  m('location', 1, 'A1', 'There is và there are', 'There is / there are', 'Mô tả ở một nơi có gì và có bao nhiêu.', ['nouns', 'articles'], ['có', 'there']),
  m('prepositions', 1, 'A1', 'Giới từ thời gian và nơi chốn: in, on, at', 'Prepositions of time and place', 'Nói đúng giờ, ngày, tháng và vị trí.', ['location'], ['giới từ', 'in on at']),
  m('ability', 1, 'A1', 'Can, can’t và lời đề nghị lịch sự', 'Can for ability and requests', 'Nói mình làm được gì và nhờ người khác giúp một cách lịch sự.', ['present-simple'], ['khả năng', 'could you']),
  // Chặng 2
  m('was-were', 2, 'A2', 'Was và were', 'Past of be', 'Kể mình đã ở đâu, cảm thấy thế nào trong quá khứ.', ['be'], ['quá khứ của be']),
  m('past-simple', 2, 'A2', 'Thì quá khứ đơn', 'Past simple', 'Kể một việc đã xảy ra và kết thúc trong quá khứ.', ['was-were'], ['V2', 'động từ bất quy tắc', 'ed']),
  m('past-question', 2, 'A2', 'Câu hỏi và phủ định với did', 'Past questions and negatives', 'Hỏi chi tiết về chuyện đã qua và phủ định nó.', ['past-simple'], ["didn't", 'did']),
  m('past-continuous', 2, 'A2', 'Thì quá khứ tiếp diễn', 'Past continuous', 'Tả bối cảnh đang diễn ra khi một việc khác xen vào.', ['past-simple'], ['when while', 'đang lúc']),
  m('used-to', 2, 'A2', 'Used to: thói quen trong quá khứ', 'Used to', 'Kể điều mình từng làm, nay không còn nữa.', ['past-simple'], ['từng', 'thói quen cũ']),
  m('future-simple', 2, 'A2', 'Thì tương lai đơn với will', 'Future simple (will)', 'Đưa ra quyết định tức thì, lời hứa và dự đoán.', ['present-simple'], ['will', 'sẽ']),
  m('future', 2, 'A2', 'Be going to và hiện tại tiếp diễn cho tương lai', 'Future plans', 'Nói dự định, kế hoạch đã sắp xếp và phân biệt với will.', ['future-simple', 'present-continuous'], ['going to', 'kế hoạch', 'future contrast']),
  m('comparison', 2, 'A2', 'So sánh hơn và so sánh nhất', 'Comparatives and superlatives', 'So sánh hai lựa chọn và chọn cái nhất trong một nhóm.', ['adjectives'], ['so sánh', 'than', 'the most']),
  m('connect', 2, 'A2', 'Nối ý với and, but, so, because', 'Basic linking words', 'Nối hai ý để giải thích lý do, kết quả và sự tương phản.', ['sentence'], ['liên từ cơ bản']),
  m('determiners', 2, 'A2', 'Lượng từ: some, any, much, many', 'Quantifiers', 'Nói số lượng nhiều, ít với danh từ đếm được và không đếm được.', ['nouns'], ['lượng từ', 'a lot of', 'few little']),
  // Chặng 3
  m('present-perfect', 3, 'A2', 'Thì hiện tại hoàn thành', 'Present perfect', 'Nói trải nghiệm, việc vừa xong và việc kéo dài đến bây giờ.', ['past-simple'], ['have has V3', 'đã từng', 'for since']),
  m('perfect-contrast', 3, 'B1', 'Hiện tại hoàn thành hay quá khứ đơn', 'Present perfect vs past simple', 'Chọn đúng thì khi có hoặc không có thời điểm cụ thể.', ['present-perfect'], ['phân biệt', 'ever yesterday']),
  m('present-perfect-continuous', 3, 'B1', 'Thì hiện tại hoàn thành tiếp diễn', 'Present perfect continuous', 'Nhấn mạnh một việc đã kéo dài bao lâu tính đến bây giờ.', ['present-perfect'], ['have been V-ing']),
  m('past-perfect', 3, 'B1', 'Thì quá khứ hoàn thành', 'Past perfect', 'Kể việc xảy ra trước một việc khác trong quá khứ.', ['past-simple'], ['had V3', 'trước khi']),
  m('past-perfect-continuous', 3, 'B1', 'Thì quá khứ hoàn thành tiếp diễn', 'Past perfect continuous', 'Nói một việc đã kéo dài bao lâu trước một mốc trong quá khứ.', ['past-perfect'], ['had been V-ing']),
  m('future-continuous', 3, 'B1', 'Thì tương lai tiếp diễn', 'Future continuous', 'Nói việc sẽ đang diễn ra tại một thời điểm trong tương lai.', ['future-simple'], ['will be V-ing']),
  m('future-perfect', 3, 'B1', 'Thì tương lai hoàn thành', 'Future perfect', 'Nói việc sẽ xong trước một mốc trong tương lai.', ['future-simple', 'present-perfect'], ['will have V3', 'by']),
  m('future-perfect-continuous', 3, 'B2', 'Thì tương lai hoàn thành tiếp diễn', 'Future perfect continuous', 'Nói một việc sẽ kéo dài được bao lâu tính đến mốc tương lai.', ['future-perfect'], ['will have been V-ing']),
  m('modals', 3, 'B1', 'Động từ khuyết thiếu: must, have to, should', 'Modal verbs', 'Nói sự bắt buộc, lời khuyên, sự cho phép và khả năng.', ['ability'], ['modal', 'phải', 'nên']),
  m('tense-choice', 3, 'B1', 'Chọn thì trong một đoạn văn', 'Choosing tenses in context', 'Giữ thì nhất quán và đổi thì đúng lúc khi kể chuyện hoặc viết IELTS.', ['perfect-contrast', 'past-perfect'], ['ôn 12 thì', 'nhất quán thì']),
  // Chặng 4
  m('passive', 4, 'B1', 'Câu bị động', 'The passive', 'Viết câu tập trung vào việc được làm, thay vì ai làm.', ['present-perfect'], ['bị động', 'be V3']),
  m('conditions', 4, 'B1', 'Câu điều kiện loại 0 và loại 1', 'Zero and first conditionals', 'Nói sự thật luôn đúng và điều có thể xảy ra nếu có một điều kiện.', ['future-simple'], ['if', 'câu điều kiện', 'unless']),
  m('conditional-2', 4, 'B1', 'Câu điều kiện loại 2', 'Second conditional', 'Nói về tình huống giả định, không có thật ở hiện tại.', ['conditions'], ['if I were', 'giả định hiện tại']),
  m('relative', 4, 'B1', 'Mệnh đề quan hệ xác định', 'Defining relative clauses', 'Nói rõ người, vật mình đang nhắc tới bằng who, which, that.', ['sentence'], ['who which that', 'mệnh đề quan hệ']),
  m('nonfinite', 4, 'B1', 'V-ing hay to V', 'Gerunds and infinitives', 'Chọn đúng dạng động từ đi sau enjoy, want, decide, avoid…', ['present-simple'], ['to infinitive', 'gerund', 'danh động từ']),
  m('reported', 4, 'B1', 'Câu tường thuật', 'Reported speech', 'Kể lại lời người khác nói, hỏi và yêu cầu.', ['past-perfect'], ['câu gián tiếp', 'said told']),
  m('adverbs', 4, 'B1', 'Phó từ: cách tạo và vị trí', 'Adverbs', 'Dùng phó từ để bổ nghĩa cho động từ, tính từ và cả câu.', ['adjectives', 'frequency'], ['trạng từ', 'ly']),
  m('clauses', 4, 'B1', 'Liên từ phụ thuộc: although, while, unless', 'Subordinating conjunctions', 'Nối hai mệnh đề để nói nhượng bộ, đối lập, mục đích và thời gian.', ['connect'], ['although', 'whereas', 'so that']),
  m('conjunctions', 4, 'B1', 'Liên từ kết hợp và cặp liên từ', 'Coordinating and paired conjunctions', 'Dùng and, or, yet, both… and, not only… but also đúng ngữ pháp.', ['connect'], ['liên từ', 'either or', 'neither nor']),
  m('phrasal', 4, 'B1', 'Cụm động từ', 'Phrasal verbs', 'Hiểu và dùng cụm động từ thông dụng, đặt tân ngữ đúng chỗ.', ['order'], ['phrasal verbs', 'look after']),
  // Chặng 5
  m('advanced-conditions', 5, 'B2', 'Câu điều kiện loại 3 và hỗn hợp', 'Third and mixed conditionals', 'Nói về điều đã không xảy ra trong quá khứ và hệ quả của nó.', ['conditional-2', 'past-perfect'], ['if I had', 'điều kiện hỗn hợp']),
  m('relative-plus', 5, 'B2', 'Mệnh đề quan hệ không xác định và rút gọn', 'Non-defining and reduced relative clauses', 'Thêm thông tin bằng dấu phẩy, dùng whose, where và rút gọn mệnh đề.', ['relative'], ['whose where', 'rút gọn mệnh đề']),
  m('advanced-passive', 5, 'B2', 'Bị động nâng cao: It is said that', 'Advanced passive', 'Viết câu khách quan kiểu học thuật: It is believed that…, X is thought to…', ['passive'], ['bị động kép', 'it is said']),
  m('wish', 5, 'B2', 'Wish, if only, would rather', 'Wishes and regrets', 'Bày tỏ mong ước, tiếc nuối và sự ưu tiên.', ['conditional-2'], ['ước', 'tiếc']),
  m('causative', 5, 'B2', 'Thể nhờ bảo: have / get something done', 'Causative', 'Nói việc mình nhờ người khác làm cho mình.', ['passive'], ['have sth done', 'nhờ']),
  m('noun-phrases', 5, 'B2', 'Cụm danh từ mở rộng', 'Expanded noun phrases', 'Gói nhiều thông tin vào một cụm danh từ gọn cho bài viết.', ['adjectives', 'relative'], ['cụm danh từ', 'noun phrase']),
  m('data-comparison', 5, 'B2', 'Mô tả và so sánh số liệu (Task 1)', 'Describing data', 'Tả xu hướng, so sánh số liệu chính xác trong IELTS Writing Task 1.', ['comparison', 'past-simple'], ['task 1', 'biểu đồ', 'twice as']),
  m('cohesion', 5, 'B2', 'Từ nối và liên kết đoạn', 'Linking adverbials and cohesion', 'Nối các câu trong đoạn bằng however, therefore, moreover đúng dấu câu.', ['clauses'], ['từ nối', 'linking words', 'however']),
  m('modal-deduction', 5, 'B2', 'Suy đoán: must, might, can’t (have)', 'Modals of deduction', 'Suy đoán về hiện tại và quá khứ với mức độ chắc chắn khác nhau.', ['modals'], ['must have', 'suy luận']),
  m('punctuation', 5, 'B2', 'Câu ghép, dấu phẩy và lỗi câu dính', 'Sentence boundaries and punctuation', 'Tránh lỗi câu dính, câu cụt và đặt dấu phẩy đúng trong bài viết.', ['clauses', 'conjunctions'], ['dấu câu', 'run-on', 'fragment']),
  // Chặng 6
  m('participle', 6, 'C1', 'Mệnh đề phân từ', 'Participle clauses', 'Rút gọn câu bằng V-ing, V3 và having V3 cho văn viết.', ['relative-plus'], ['rút gọn', 'having done']),
  m('inversion', 6, 'C1', 'Đảo ngữ', 'Inversion', 'Nhấn mạnh bằng Never, Not only, Only when… đặt ở đầu câu.', ['adverbs'], ['đảo ngữ', 'not only']),
  m('cleft', 6, 'C1', 'Câu chẻ: It is… that, What… is', 'Cleft sentences', 'Nhấn mạnh đúng thông tin mình muốn người nghe chú ý.', ['relative'], ['câu nhấn mạnh', 'it is that']),
  m('hedging', 6, 'C1', 'Rào đón trong văn học thuật', 'Hedging', 'Đưa ra nhận định thận trọng, không tuyệt đối hóa trong bài luận.', ['modal-deduction'], ['tend to', 'may', 'rào đón']),
  m('subjunctive', 6, 'C1', 'Thể giả định', 'The subjunctive', 'Dùng It is essential that he be… và các cấu trúc đề xuất trang trọng.', ['wish'], ['giả định', 'suggest that']),
  m('nominalisation', 6, 'C1', 'Danh từ hóa', 'Nominalisation', 'Biến động từ, tính từ thành danh từ để viết học thuật gọn và khách quan.', ['noun-phrases'], ['danh từ hóa']),
  m('ellipsis', 6, 'C1', 'Tỉnh lược và thay thế', 'Ellipsis and substitution', 'Tránh lặp từ bằng do so, one, so, not và lược bỏ hợp lý.', ['cohesion'], ['so do I', 'tránh lặp']),
];

export const lessonIds = lessons.map((l) => l.id);
export const lessonById = new Map(lessons.map((l) => [l.id, l]));
export const getMeta = (id: string) => lessonById.get(id);
export const stageLessons = (stage: StageId) => lessons.filter((l) => l.stage === stage);
export function nextLesson(id: string) {
  const i = lessonIds.indexOf(id);
  return i >= 0 ? lessons[i + 1] : undefined;
}

export interface Hub {
  id: HubId;
  title: string;
  description: string;
  lessons: string[];
}

/** Rows: present, past, future. Columns: simple, continuous, perfect, perfect continuous. */
export const TENSE_GRID = [
  ['present-simple', 'present-continuous', 'present-perfect', 'present-perfect-continuous'],
  ['past-simple', 'past-continuous', 'past-perfect', 'past-perfect-continuous'],
  ['future-simple', 'future-continuous', 'future-perfect', 'future-perfect-continuous'],
];

export const hubs: Hub[] = [
  {
    id: 'tenses',
    title: '12 thì tiếng Anh',
    description: 'Bảng 12 thì và các bài phân biệt thì dễ nhầm.',
    lessons: [...TENSE_GRID.flat(), 'present-contrast', 'perfect-contrast', 'future', 'used-to', 'tense-choice'],
  },
  { id: 'passive', title: 'Câu bị động', description: 'Từ be + V3 đến It is said that và have something done.', lessons: ['passive', 'advanced-passive', 'causative'] },
  { id: 'conjunctions', title: 'Liên từ và từ nối', description: 'Nối từ, nối mệnh đề, nối câu trong đoạn.', lessons: ['connect', 'conjunctions', 'clauses', 'cohesion', 'punctuation'] },
  { id: 'adverbs', title: 'Phó từ', description: 'Tần suất, cách thức, mức độ, và đảo ngữ với phó từ phủ định.', lessons: ['frequency', 'adverbs', 'inversion'] },
  { id: 'conditionals', title: 'Câu điều kiện và giả định', description: 'Loại 0, 1, 2, 3, hỗn hợp, wish và thể giả định.', lessons: ['conditions', 'conditional-2', 'advanced-conditions', 'wish', 'subjunctive'] },
  { id: 'relative', title: 'Mệnh đề quan hệ', description: 'Who, which, that, whose, where, rút gọn và câu chẻ.', lessons: ['relative', 'relative-plus', 'participle', 'cleft'] },
  { id: 'modals', title: 'Động từ khuyết thiếu', description: 'Can, must, should, might và cách rào đón.', lessons: ['ability', 'modals', 'modal-deduction', 'hedging'] },
  { id: 'questions', title: 'Câu hỏi và câu tường thuật', description: 'Đặt câu hỏi đúng trật tự và kể lại lời người khác.', lessons: ['do-question', 'wh', 'past-question', 'reported'] },
  {
    id: 'word-classes',
    title: 'Từ loại và cụm từ',
    description: 'Danh từ, mạo từ, đại từ, tính từ, giới từ, lượng từ, dạng động từ.',
    lessons: ['nouns', 'articles', 'pronouns', 'possessive', 'adjectives', 'determiners', 'prepositions', 'comparison', 'nonfinite', 'phrasal', 'noun-phrases'],
  },
  { id: 'sentence', title: 'Câu và trật tự từ', description: 'Dựng câu hoàn chỉnh, đúng thứ tự và đúng dấu câu.', lessons: ['sentence', 'be', 'order', 'location', 'punctuation'] },
  {
    id: 'ielts-writing',
    title: 'Ngữ pháp cho IELTS Writing',
    description: 'Các cấu trúc giúp tăng điểm Grammatical Range and Accuracy.',
    lessons: ['tense-choice', 'data-comparison', 'noun-phrases', 'relative-plus', 'advanced-passive', 'cohesion', 'punctuation', 'participle', 'hedging', 'nominalisation'],
  },
];

/** Hubs shown as quick links on the first screen. */
export const QUICK_HUBS: HubId[] = ['tenses', 'passive', 'conjunctions', 'adverbs', 'conditionals', 'relative'];
export const hubsFor = (id: string) => hubs.filter((h) => h.lessons.includes(id));

export function normalizeSearch(value: string) {
  return value.toLocaleLowerCase('vi').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').trim();
}
export function searchLessons(query: string) {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return lessons;
  return lessons.filter((l) => {
    const text = normalizeSearch(
      [l.title, l.en, l.hook, ...(l.aliases ?? []), ...hubsFor(l.id).map((h) => h.title)].join(' ')
    );
    return tokens.every((t) => text.includes(t));
  });
}

const loaders: Record<StageId, () => Promise<{ default: LessonBody[] }>> = {
  0: () => import('./lessons/stage0'),
  1: () => import('./lessons/stage1'),
  2: () => import('./lessons/stage2'),
  3: () => import('./lessons/stage3'),
  4: () => import('./lessons/stage4'),
  5: () => import('./lessons/stage5'),
  6: () => import('./lessons/stage6'),
};
const cache = new Map<StageId, Promise<LessonBody[]>>();
function loadStage(stage: StageId) {
  let pending = cache.get(stage);
  if (!pending) {
    pending = loaders[stage]().then((mod) => mod.default);
    pending.catch(() => cache.delete(stage));
    cache.set(stage, pending);
  }
  return pending;
}
export async function loadLessons(ids: string[]) {
  const wanted = ids.map((id) => lessonById.get(id)).filter((l): l is LessonMeta => !!l);
  const bodies = (await Promise.all([...new Set(wanted.map((l) => l.stage))].map(loadStage))).flat();
  return wanted.map((meta) => {
    const body = bodies.find((b) => b.id === meta.id);
    if (!body) throw new Error('Missing grammar lesson: ' + meta.id);
    return { ...meta, ...body };
  });
}
export const loadLesson = async (id: string) => (await loadLessons([id]))[0];
