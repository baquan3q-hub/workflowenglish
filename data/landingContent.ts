/**
 * Copy for the landing page ("VocabMaster, Số 01").
 *
 * Every line describes something the app actually does today. There are no
 * learner counts, ratings or score gains here on purpose: none exist yet, and
 * the page must not invent them.
 */

export interface TocEntry {
  id: string;
  page: string;
  section: string;
  title: string;
}

/** The issue's table of contents, in reading order. `id` is the section anchor. */
export const TOC: TocEntry[] = [
  { id: 'lp-letter', page: '02', section: 'Thư tòa soạn', title: 'Cuốn sổ chép đầy từ, và vì sao nó không giúp bạn nói' },
  { id: 'lp-science', page: '04', section: 'Khoa học', title: 'Đường cong quên, và cách kéo nó lên lại' },
  { id: 'lp-lesson', page: '06', section: 'Chuyên đề', title: 'Một bài học, năm bước. Bạn tự làm thử' },
  { id: 'lp-ielts', page: '12', section: 'Phòng luyện IELTS', title: 'Bốn kỹ năng, một sổ lỗi sai, một trợ lý AI' },
  { id: 'lp-games', page: '16', section: 'Giải trí', title: 'Ôn tập mà như chơi' },
  { id: 'lp-progress', page: '18', section: 'Hồ sơ', title: 'Thấy mình tiến bộ, và học thêm năm phút mỗi ngày' },
  { id: 'lp-compare', page: '20', section: 'Trước & sau', title: 'Hai cách học một từ mới' },
  { id: 'lp-faq', page: '21', section: 'Hỏi đáp', title: 'Những điều bạn có thể đang thắc mắc' },
  { id: 'lp-subscribe', page: '22', section: 'Phiếu đăng ký', title: 'Cắt phiếu, bắt đầu học' },
];

/** Cover lines: the three promises the cover makes, each pointing inside. */
export const COVER_LINES = [
  { id: 'lp-lesson', page: '06', text: 'Tự làm một bài học thật, ngay trên trang này' },
  { id: 'lp-science', page: '04', text: 'Vì sao học vẹt thì quên, và cách não nhớ lâu' },
  { id: 'lp-ielts', page: '12', text: 'Writing và Speaking có AI nhận xét theo tiêu chí' },
];

/** The editor's letter: three habits, each struck through and corrected. */
export const HABITS = [
  {
    wrong: 'Chép 50 từ mới vào sổ trong một tối',
    right: 'Gặp ít từ hơn, nhưng mỗi từ nằm trong một câu thật',
  },
  {
    wrong: 'Dồn hết vào tuần trước kỳ thi',
    right: 'Ôn đúng lúc sắp quên, mỗi ngày một chút',
  },
  {
    wrong: 'Thuộc nghĩa tiếng Việt là xong',
    right: 'Tự đặt câu, nghe phát âm, dùng được khi viết và nói',
  },
];

/** SM-2 intervals with "Good" every time and the default easiness 2.5 (srsService). */
export const SM2_STOPS = [
  { day: 0, label: 'Hôm nay' },
  { day: 1, label: '1 ngày' },
  { day: 6, label: '6 ngày' },
  { day: 15, label: '15 ngày' },
  { day: 38, label: '38 ngày' },
];

export interface LessonStep {
  key: 'card' | 'story' | 'quiz' | 'blank' | 'sentence';
  name: string;
  title: string;
  hint: string;
}

/** The five lesson steps, in the order the app runs them (navConfig LESSON_PHASES). */
export const LESSON_STEPS: LessonStep[] = [
  { key: 'card', name: 'Thẻ từ', title: 'Gặp từ lần đầu', hint: 'Lật thẻ, nghe phát âm.' },
  { key: 'story', name: 'Truyện', title: 'Gặp lại trong một câu chuyện', hint: 'Bấm vào từ được tô để xem nghĩa.' },
  { key: 'quiz', name: 'Trắc nghiệm', title: 'Tự nhớ lại nghĩa', hint: 'Chọn nghĩa đúng trước khi xem đáp án.' },
  { key: 'blank', name: 'Điền từ', title: 'Viết đúng chính tả', hint: 'Gõ từ còn thiếu vào câu.' },
  { key: 'sentence', name: 'Đặt câu', title: 'Dùng từ bằng câu của bạn', hint: 'Viết một câu tiếng Anh có từ này.' },
];

export const LESSON_WORD = {
  word: 'resilient',
  ipa: '/rɪˈzɪl.jənt/',
  pos: 'tính từ',
  meaning: 'Kiên cường; phục hồi nhanh sau khó khăn.',
  example: 'Children are often more resilient than adults expect.',
  story: [
    'After the storm, the small fishing village lost half of its boats.',
    'Nobody waited for help. Neighbours shared tools, meals and nets, and within a month the harbour was busy again.',
    'The village was',
    'and so were the people in it.',
  ],
  quiz: [
    { key: 'A', text: 'Dễ bị tổn thương, mong manh', correct: false, note: 'Đó là nghĩa của vulnerable.' },
    { key: 'B', text: 'Kiên cường, phục hồi nhanh', correct: true, note: '' },
    { key: 'C', text: 'Miễn cưỡng, không muốn làm', correct: false, note: 'Đó là nghĩa của reluctant.' },
  ],
  blank: {
    before: 'Small businesses need to be',
    after: 'to survive a long economic crisis.',
  },
};

export interface SkillPage {
  skill: string;
  img: string;
  title: string;
  lede: string;
  features: string[];
}

/** One "department page" per IELTS room; features are named after real screens. */
export const IELTS_PAGES: SkillPage[] = [
  {
    skill: 'Listening',
    img: '/listening-3d.png',
    title: 'Nghe từng đoạn, chép từng chữ',
    lede: 'Nghe lại đúng đoạn bạn trượt, không phải tua cả bài.',
    features: ['Làm đề đầy đủ hoặc luyện riêng từng Part', 'Chép chính tả từng câu, có gợi ý chữ sai', 'Chép chính tả từ video và podcast bạn thích', 'Bài luyện nhanh: số, tên và ngày tháng'],
  },
  {
    skill: 'Reading',
    img: '/reading-3d.png',
    title: 'Tìm dẫn chứng, không đoán mò',
    lede: 'Làm đề, rồi luyện lại đúng những câu đã sai, bắt đầu từ câu văn chứa đáp án.',
    features: ['Bài đọc và câu hỏi đặt cạnh nhau', 'Câu làm sai quay lại sau 1, 3, 7 và 21 ngày', 'Luyện riêng True / False / Not Given và paraphrase'],
  },
  {
    skill: 'Writing',
    img: '/writing-3d.png',
    title: 'Viết, được chấm, viết lại',
    lede: 'AI nhận xét bài Task 1 và Task 2 theo từng tiêu chí chấm, rồi so sánh bản viết lại với bản trước.',
    features: ['Điểm theo tiêu chí, do AI ước lượng', 'Danh sách kiểm cho Task 1', 'Hướng dẫn theo từng dạng đề', 'Luyện dịch câu Việt sang Anh'],
  },
  {
    skill: 'Speaking',
    img: '/speaking-3d.png',
    title: 'Nói vào micro, nhìn thấy độ trôi chảy',
    lede: 'Ngân hàng câu hỏi, luyện từng Part và thi thử cả bài.',
    features: ['Đo tốc độ nói, từ đệm, ngập ngừng, lặp từ', 'Nhận xét phát âm và điểm theo tiêu chí', 'Thi thử đủ ba Part'],
  },
  {
    skill: 'Sổ lỗi sai',
    img: '/ielts-3d-checklist-pen.png',
    title: 'Mỗi lỗi được ghi lại một lần',
    lede: 'Lỗi trong các bài đã chấm được gom về một chỗ, để lần sau bạn ôn đúng thứ mình hay sai.',
    features: ['Xem lỗi theo từng kỹ năng', 'Biết lỗi nào lặp lại nhiều nhất'],
  },
  {
    skill: 'Trợ lý AI',
    img: '/glossy-ai-bubble.png',
    title: 'Hỏi bất cứ lúc nào',
    lede: 'Một khung chat luôn ở góc màn hình: chấm bài, gợi ý dàn ý Speaking, hướng dẫn viết overview.',
    features: ['Gợi ý câu hỏi sẵn để bắt đầu', 'Lưu lịch sử trò chuyện', 'Có câu đố nhanh ngay trong chat'],
  },
];

/** The four review games (components/ielts/review). */
export const GAMES = [
  { name: 'Vườn ôn tập', img: '/mascot/wave.png', text: 'Mỗi thẻ đang ôn là một cái cây. Ôn đúng hạn thì cây lớn từ hạt đến lúc ra hoa, để quá hạn thì cây héo.' },
  { name: 'Thẻ vuốt', img: '/mascot/thumbs.png', text: 'Vuốt trái, phải hoặc lên để trả lời. Không có màn hình cảm ứng thì dùng phím mũi tên.' },
  { name: 'Xếp câu', img: '/mascot/cheer.png', text: 'Ghép các mảnh thành một câu đúng. Sai ở đâu, game chỉ ra đúng chỗ đó.' },
  { name: 'Săn lỗi', img: '/mascot/sleepy.png', text: 'Mỗi câu có đúng một lỗi. Tìm ra nó, rồi chọn cách sửa.' },
];

/** The playable error-hunt sentence in the games section. */
export const HUNT = {
  words: ['She', 'have', 'lived', 'in', 'Da Nang', 'since', '2019.'],
  wrongIndex: 1,
  fixes: [
    { text: 'has', correct: true },
    { text: 'having', correct: false },
    { text: 'had have', correct: false },
  ],
};

export const COMPARE_ROWS = [
  { topic: 'Gặp từ mới', old: 'Một danh sách dài, từ đứng một mình', now: 'Thẻ từ có phát âm, rồi gặp lại trong một câu chuyện' },
  { topic: 'Ghi nhớ', old: 'Đọc đi đọc lại đến khi thấy quen', now: 'Tự nhớ lại trước khi xem đáp án' },
  { topic: 'Lịch ôn', old: 'Ôn dồn khi sắp thi', now: 'SM-2 tự xếp lịch: ngày mai, 6 ngày, 15 ngày…' },
  { topic: 'Dùng từ', old: 'Biết nghĩa nhưng không đặt được câu', now: 'Tự đặt câu và được AI góp ý' },
  { topic: 'Luyện thi', old: 'Từ vựng một nơi, đề thi một nơi', now: 'Từ gặp trong đề IELTS đi thẳng vào lịch ôn' },
  { topic: 'Động lực', old: 'Một mình, không biết mình tiến đến đâu', now: 'XP, chuỗi ngày, mục tiêu hôm nay và biểu đồ tiến bộ' },
];

export const FAQS = [
  {
    q: 'Tôi có cần tạo tài khoản để học thử không?',
    a: 'Không. Bài học năm bước ở trang 06 chạy ngay trên trang này. Khi muốn lưu từ và nhận lịch ôn của riêng mình, bạn mới cần đăng nhập.',
  },
  {
    q: 'VocabMaster có miễn phí không?',
    a: 'Bạn có thể bắt đầu học miễn phí, không cần thẻ thanh toán.',
  },
  {
    q: 'SM-2 là gì, và vì sao tôi nên tin nó?',
    a: 'SM-2 là thuật toán lặp lại ngắt quãng của SuperMemo, có từ cuối thập niên 1980. Mỗi lần bạn ôn, nó dựa vào việc bạn nhớ tốt hay kém để tính ngày gặp lại từ đó: nhớ tốt thì khoảng cách dài ra, quên thì từ quay lại sớm.',
  },
  {
    q: 'AI chấm IELTS có thay được giám khảo không?',
    a: 'Không. Điểm Writing và Speaking là điểm AI ước lượng, không phải điểm IELTS chính thức. Giá trị của nó nằm ở nhận xét theo từng tiêu chí: bạn biết nên sửa gì ở bài sau.',
  },
  {
    q: 'Mỗi ngày tôi cần học bao lâu?',
    a: 'Tùy bạn. Trang chủ trong app luôn có danh sách mục tiêu hôm nay, như ôn các từ đến hạn hay học tiếp bài dở. Bạn tự thêm mục tiêu của mình, và mèo sẽ nhắc bạn.',
  },
  {
    q: 'Học trên điện thoại được không?',
    a: 'Được. Giao diện chạy trên điện thoại, máy tính bảng và máy tính. Bạn còn có thể cài VocabMaster như một ứng dụng ngay từ trình duyệt.',
  },
  {
    q: 'Tiến độ của tôi được lưu ở đâu?',
    a: 'Trong tài khoản của bạn. Đăng nhập trên máy khác, bạn học tiếp đúng chỗ đã dừng, với cùng lịch ôn.',
  },
];

export const GOALS = ['Giao tiếp hằng ngày', 'IELTS 6.0', 'IELTS 6.5', 'IELTS 7.0', 'IELTS 7.5+'] as const;
export type Goal = (typeof GOALS)[number];
