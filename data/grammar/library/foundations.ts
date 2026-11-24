import type { GrammarTopic } from './types';

export const foundations = [
  {
    id: 'sentence',
    title: 'Thành phần và trật tự câu',
    en: 'Sentence structure',
    level: 'Nền tảng',
    aliases: ['chủ ngữ vị ngữ tân ngữ sv svo svc'],
    forms: [
      {
        label: 'Hành động',
        pattern: 'S + V (+ O)',
      },
      {
        label: 'Miêu tả',
        pattern: 'S + be / linking verb + bổ ngữ',
      },
    ],
    uses: [
      'Tìm chủ ngữ rồi tìm động từ chính. Một số động từ cần thêm tân ngữ hoặc bổ ngữ để trọn ý.',
      'Cụm chỉ thời gian thường đứng đầu hoặc cuối câu.',
    ],
    trap: {
      wrong: 'My brother very friendly.',
      right: 'My brother is very friendly.',
      why: 'Trước tính từ friendly cần động từ nối is để tạo vị ngữ.',
    },
    examples: [
      {
        en: 'Birds sing.',
        vi: 'Chim hót.',
      },
      {
        en: 'Linh reads books after school.',
        vi: 'Linh đọc sách sau giờ học.',
      },
    ],
    questions: [
      {
        prompt: 'My parents ___ tired after work.',
        answer: 'are',
        alternatives: ['very', 'they'],
        why: 'Are nối chủ ngữ với tính từ tired.',
      },
      {
        prompt: 'Chọn câu có trật tự chủ ngữ → động từ → tân ngữ.',
        answer: 'The boy likes music.',
        alternatives: ['Likes the boy music.', 'The boy music likes.'],
        why: 'The boy làm hành động likes, music là thứ cậu ấy thích.',
      },
    ],
  },
  {
    id: 'questions',
    title: 'Câu hỏi, phủ định và câu hỏi đuôi',
    en: 'Questions and negatives',
    level: 'Nền tảng',
    aliases: ['wh question tag'],
    forms: [
      {
        label: 'Động từ thường',
        pattern: 'Wh-word + do/does/did + S + V?',
      },
      {
        label: 'Hỏi chủ ngữ',
        pattern: 'Who/What + V?',
      },
      {
        label: 'Câu hỏi đuôi',
        pattern: 'Câu khẳng định, trợ động từ phủ định + đại từ?',
      },
    ],
    uses: [
      'Với be, động từ tình thái hoặc trợ động từ có sẵn, đảo chính từ đó lên trước chủ ngữ.',
      'Chủ ngữ được hỏi như who trong Who called? đứng ngay trước động từ.',
    ],
    trap: {
      wrong: 'Where you live?',
      right: 'Where do you live?',
      why: 'Live là động từ thường, nên thêm do để hỏi nơi chốn.',
    },
    examples: [
      {
        en: 'Who broke the window?',
        vi: 'Ai làm vỡ cửa sổ?',
      },
      {
        en: "She lives near here, doesn't she?",
        vi: 'Cô ấy sống gần đây, đúng không?',
      },
    ],
    questions: [
      {
        prompt: 'Why ___ he leave early yesterday?',
        answer: 'did',
        alternatives: ['does', 'was'],
        why: 'Yesterday yêu cầu trợ động từ did cho động từ thường.',
      },
      {
        prompt: "He can't swim, ___?",
        answer: 'can he',
        alternatives: ["can't he", 'does he'],
        why: "Mệnh đề phủ định với can't đi với đuôi khẳng định can he.",
      },
    ],
  },
  {
    id: 'agreement',
    title: 'Hòa hợp chủ ngữ và động từ',
    en: 'Subject–verb agreement',
    level: 'Nền tảng',
    aliases: ['chia động từ ngôi thứ ba'],
    forms: [
      {
        label: 'Hiện tại đơn',
        pattern: 'Ngôi thứ ba số ít + V-s/es',
      },
      {
        label: 'Chủ ngữ có bổ nghĩa',
        pattern: 'Tìm danh từ trung tâm rồi chia động từ',
      },
    ],
    uses: [
      'Danh từ gần động từ có thể thuộc cụm bổ nghĩa, như books trong The box of books.',
      'Each và every làm chủ ngữ hoặc đi với danh từ số ít thường dùng động từ số ít.',
    ],
    trap: {
      wrong: 'The box of books are heavy.',
      right: 'The box of books is heavy.',
      why: 'Box là danh từ trung tâm số ít.',
    },
    examples: [
      {
        en: 'The number of students is growing.',
        vi: 'Số lượng sinh viên đang tăng.',
      },
      {
        en: 'A number of students are absent.',
        vi: 'Một số sinh viên vắng mặt.',
      },
    ],
    questions: [
      {
        prompt: 'Each of the rooms ___ a window.',
        answer: 'has',
        alternatives: ['have', 'having'],
        why: 'Each là chủ ngữ số ít.',
      },
      {
        prompt: 'The keys to the office ___ on this desk.',
        answer: 'are',
        alternatives: ['is', 'has'],
        why: 'Keys là danh từ trung tâm số nhiều.',
      },
    ],
  },
  {
    id: 'nouns',
    title: 'Danh từ đếm được và số nhiều',
    en: 'Countable and uncountable nouns',
    level: 'Nền tảng',
    aliases: ['danh từ không đếm được noun'],
    forms: [
      {
        label: 'Đếm được',
        pattern: 'one book → two books',
      },
      {
        label: 'Không đếm được',
        pattern: 'some information / a piece of information',
      },
    ],
    uses: [
      'Danh từ đếm được số ít thường cần từ hạn định như a, the, my hoặc this.',
      'Một số từ thay đổi tính đếm được theo nghĩa, như coffee chỉ thức uống hoặc a coffee chỉ một suất.',
    ],
    trap: {
      wrong: 'I need some informations.',
      right: 'I need some information.',
      why: 'Information thường không đếm được, giữ nguyên dạng.',
    },
    examples: [
      {
        en: 'There are two children in the room.',
        vi: 'Có hai đứa trẻ trong phòng.',
      },
      {
        en: 'Can you give me a piece of advice?',
        vi: 'Bạn cho tôi một lời khuyên được không?',
      },
    ],
    questions: [
      {
        prompt: 'She bought two ___ of bread.',
        answer: 'loaves',
        alternatives: ['breads', 'bread'],
        why: 'Đếm các ổ bánh mì bằng loaves.',
      },
      {
        prompt: 'We need ___ before making a decision.',
        answer: 'some information',
        alternatives: ['an information', 'a few information'],
        why: 'Information dùng some khi nói số lượng không xác định.',
      },
    ],
  },
  {
    id: 'articles',
    title: 'Mạo từ a, an, the và Ø',
    en: 'Articles',
    level: 'Nền tảng',
    aliases: ['a an the zero article'],
    forms: [
      {
        label: 'A/an',
        pattern: 'Danh từ đếm được số ít chưa xác định',
      },
      {
        label: 'The',
        pattern: 'Người/vật đã xác định',
      },
      {
        label: 'Ø',
        pattern: 'Danh từ số nhiều hoặc không đếm được khi nói chung',
      },
    ],
    uses: [
      'Dùng a hoặc an theo âm đầu của từ sau mạo từ.',
      'Dùng the khi người nghe biết rõ đối tượng từ ngữ cảnh.',
    ],
    trap: {
      wrong: 'She studies at an university.',
      right: 'She studies at a university.',
      why: 'University bắt đầu bằng âm /j/, dùng a.',
    },
    examples: [
      {
        en: 'I saw a dog. The dog had a red collar.',
        vi: 'Tôi thấy một con chó. Nó đeo vòng cổ màu đỏ.',
      },
      {
        en: 'Water is essential for life.',
        vi: 'Nước rất cần thiết cho sự sống.',
      },
    ],
    questions: [
      {
        prompt: 'It took me ___ hour to get here.',
        answer: 'an',
        alternatives: ['a', 'many'],
        why: 'Hour bắt đầu bằng nguyên âm vì h câm.',
      },
      {
        prompt: 'We rented a car. ___ car was blue.',
        answer: 'The',
        alternatives: ['A', 'An'],
        why: 'Chiếc xe đã được giới thiệu ở câu trước.',
      },
    ],
  },
  {
    id: 'pronouns',
    title: 'Đại từ và sở hữu',
    en: 'Pronouns and possession',
    level: 'Nền tảng',
    aliases: ['đại từ phản thân sở hữu'],
    forms: [
      {
        label: 'Chủ ngữ / tân ngữ',
        pattern: 'I → me · she → her · they → them',
      },
      {
        label: 'Sở hữu',
        pattern: 'my book / mine · her book / hers',
      },
      {
        label: 'Phản thân',
        pattern: 'myself, yourself, herself, themselves',
      },
    ],
    uses: [
      'Dùng đại từ sở hữu đứng độc lập khi danh từ đã rõ.',
      'Dùng phản thân khi chủ ngữ và tân ngữ cùng chỉ một người hoặc vật.',
    ],
    trap: {
      wrong: 'That is hers bag.',
      right: 'That is her bag.',
      why: 'Her đứng trước danh từ. Hers thay cho cả cụm her bag.',
    },
    examples: [
      {
        en: 'My brother hurt himself.',
        vi: 'Anh tôi tự làm mình bị thương.',
      },
      {
        en: 'Their house is older than ours.',
        vi: 'Nhà của họ cũ hơn nhà của chúng tôi.',
      },
    ],
    questions: [
      {
        prompt: 'Is this your bag or ___?',
        answer: 'mine',
        alternatives: ['my', 'me'],
        why: 'Mine thay cho my bag.',
      },
      {
        prompt: 'Mai introduced ___ to the new class.',
        answer: 'herself',
        alternatives: ['hers', 'she'],
        why: 'Mai tự giới thiệu bản thân nên dùng herself.',
      },
    ],
  },
  {
    id: 'determiners',
    title: 'Từ hạn định và lượng từ',
    en: 'Determiners and quantifiers',
    level: 'Nền tảng',
    aliases: ['some any few little many much'],
    forms: [
      {
        label: 'Đếm được',
        pattern: 'many / (a) few + danh từ số nhiều',
      },
      {
        label: 'Không đếm được',
        pattern: 'much / (a) little + danh từ',
      },
      {
        label: 'Cả hai',
        pattern: 'some / any / a lot of + danh từ',
      },
    ],
    uses: [
      'A few hoặc a little nhấn vẫn có một ít. Few hoặc little thường nhấn gần như không có.',
      'Some thường dùng trong câu khẳng định, lời mời và lời đề nghị. Any thường dùng trong câu hỏi và phủ định.',
    ],
    trap: {
      wrong: 'How many milk do we need?',
      right: 'How much milk do we need?',
      why: 'Milk không đếm được nên chọn much.',
    },
    examples: [
      {
        en: 'I have a few questions.',
        vi: 'Tôi có vài câu hỏi.',
      },
      {
        en: 'Would you like some tea?',
        vi: 'Bạn có muốn uống trà không?',
      },
    ],
    questions: [
      {
        prompt: 'We have ___ time left. Hurry up!',
        answer: 'little',
        alternatives: ['many', 'a few'],
        why: 'Time không đếm được và Hurry up cho thấy gần như hết giờ.',
      },
      {
        prompt: 'Are there ___ seats left?',
        answer: 'any',
        alternatives: ['much', 'a little'],
        why: 'Câu hỏi về danh từ đếm được số nhiều dùng any.',
      },
    ],
  },
  {
    id: 'adjectives',
    title: 'Tính từ và trật tự tính từ',
    en: 'Adjectives',
    level: 'Nền tảng',
    aliases: ['adjective ed ing'],
    forms: [
      {
        label: 'Vị trí',
        pattern: 'adjective + noun / be + adjective',
      },
      {
        label: 'Cảm xúc',
        pattern: 'V-ed mô tả cảm nhận · V-ing mô tả điều gây cảm nhận',
      },
    ],
    uses: [
      'Khi nhiều tính từ đứng trước danh từ, nhận xét thường đứng trước kích thước, độ tuổi, màu sắc và chất liệu.',
      'Một số tính từ thường dùng sau động từ nối như asleep và afraid.',
    ],
    trap: {
      wrong: 'I am boring because the film is slow.',
      right: 'I am bored because the film is slow.',
      why: 'Bored là cảm giác của người xem.',
    },
    examples: [
      {
        en: 'She has a lovely small wooden table.',
        vi: 'Cô ấy có một chiếc bàn gỗ nhỏ xinh.',
      },
      {
        en: 'The news was surprising. We were surprised.',
        vi: 'Tin đó gây bất ngờ. Chúng tôi rất ngạc nhiên.',
      },
    ],
    questions: [
      {
        prompt: 'I felt ___ after the long flight.',
        answer: 'tired',
        alternatives: ['tiring', 'tiredly'],
        why: 'Tired mô tả cảm giác của người nói.',
      },
      {
        prompt: 'Chọn cụm tự nhiên trong thứ tự trung tính.',
        answer: 'a beautiful old stone house',
        alternatives: ['an old stone beautiful house', 'a stone beautiful old house'],
        why: 'Nhận xét đứng trước tuổi và chất liệu.',
      },
    ],
  },
  {
    id: 'adverbs',
    title: 'Phó từ và vị trí phó từ',
    en: 'Adverbs',
    level: 'Nền tảng',
    aliases: ['trạng từ tần suất cách thức mức độ'],
    forms: [
      {
        label: 'Tần suất',
        pattern: 'Trước động từ thường / sau be',
      },
      {
        label: 'Cách thức',
        pattern: 'Thường sau động từ hoặc tân ngữ',
      },
      {
        label: 'Mức độ',
        pattern: 'very + tính từ hoặc phó từ',
      },
    ],
    uses: [
      'Phó từ bổ nghĩa cho động từ, tính từ, phó từ khác hoặc cả câu.',
      'Vị trí có thể đổi theo ý cần nhấn. Hard là chăm chỉ hoặc mạnh, còn hardly là hầu như không.',
    ],
    trap: {
      wrong: 'She speaks slowly English.',
      right: 'She speaks English slowly.',
      why: 'Đặt slowly sau cụm động từ và tân ngữ speaks English.',
    },
    examples: [
      {
        en: 'I usually walk to work.',
        vi: 'Tôi thường đi bộ đến chỗ làm.',
      },
      {
        en: 'He is often late for class.',
        vi: 'Cậu ấy thường đến lớp muộn.',
      },
    ],
    questions: [
      {
        prompt: 'The teacher explained the problem ___.',
        answer: 'clearly',
        alternatives: ['clear', 'clearness'],
        why: 'Clearly mô tả cách giáo viên giải thích.',
      },
      {
        prompt: 'I am ___ hungry after swimming.',
        answer: 'usually',
        alternatives: ['day every', 'usual'],
        why: 'Trạng từ tần suất usually đứng sau am.',
      },
    ],
  },
  {
    id: 'prepositions',
    title: 'Giới từ thời gian và nơi chốn',
    en: 'Prepositions',
    level: 'Nền tảng',
    aliases: ['in on at by until'],
    forms: [
      {
        label: 'Thời gian',
        pattern: 'at 7:00 · on Monday · in July',
      },
      {
        label: 'Nơi chốn',
        pattern: 'at the station · on the table · in the room',
      },
    ],
    uses: [
      'At chỉ mốc hoặc địa điểm như điểm đến. On thường chỉ ngày hoặc bề mặt, in thường chỉ khoảng lớn hoặc bên trong.',
      'By chỉ hạn chót. Until nói hành động hoặc trạng thái kéo dài tới một mốc.',
    ],
    trap: {
      wrong: 'The meeting is in Monday.',
      right: 'The meeting is on Monday.',
      why: 'Dùng on trước tên ngày.',
    },
    examples: [
      {
        en: 'The keys are on the shelf.',
        vi: 'Chìa khóa ở trên kệ.',
      },
      {
        en: 'Send your application by Friday.',
        vi: 'Gửi hồ sơ chậm nhất vào thứ Sáu.',
      },
    ],
    questions: [
      {
        prompt: 'We arrived ___ six in the evening.',
        answer: 'at',
        alternatives: ['on', 'in'],
        why: 'Six là mốc giờ cụ thể.',
      },
      {
        prompt: 'The library stays open ___ nine.',
        answer: 'until',
        alternatives: ['by', 'in'],
        why: 'Stays open là trạng thái kéo dài tới chín giờ.',
      },
    ],
  },
  {
    id: 'comparison',
    title: 'So sánh hơn, nhất và ngang bằng',
    en: 'Comparison',
    level: 'Nền tảng',
    aliases: ['comparative superlative as as'],
    forms: [
      {
        label: 'So sánh hơn',
        pattern: 'adj-er / more + adj + than',
      },
      {
        label: 'So sánh nhất',
        pattern: 'the + adj-est / most + adj',
      },
      {
        label: 'Ngang bằng',
        pattern: 'as + adj/adv + as',
      },
    ],
    uses: [
      'Tính từ ngắn thường thêm -er/-est. Tính từ dài thường dùng more/most.',
      'Các dạng bất quy tắc thường gặp là good → better → best và bad → worse → worst.',
    ],
    trap: {
      wrong: 'This route is more shorter.',
      right: 'This route is shorter.',
      why: 'Shorter đã mang nghĩa so sánh hơn.',
    },
    examples: [
      {
        en: 'This bag is lighter than mine.',
        vi: 'Chiếc túi này nhẹ hơn túi tôi.',
      },
      {
        en: 'That is the most expensive ticket.',
        vi: 'Đó là vé đắt nhất.',
      },
    ],
    questions: [
      {
        prompt: 'This room is as bright ___ the kitchen.',
        answer: 'as',
        alternatives: ['than', 'like'],
        why: 'Cặp as … as diễn tả ngang bằng.',
      },
      {
        prompt: 'The blue car is ___ than the red one.',
        answer: 'faster',
        alternatives: ['fastest', 'more fast'],
        why: 'Than đi cùng so sánh hơn faster.',
      },
    ],
  },
  {
    id: 'imperative',
    title: 'Câu mệnh lệnh và lời hướng dẫn',
    en: 'Imperatives',
    level: 'Nền tảng',
    aliases: ["let's please"],
    forms: [
      {
        label: 'Hướng dẫn',
        pattern: 'V (+ O)',
      },
      {
        label: 'Cấm / nhắc',
        pattern: "Don't + V",
      },
      {
        label: 'Rủ nhau',
        pattern: "Let's + V",
      },
    ],
    uses: ['Câu mệnh lệnh thường lược you.', 'Thêm please, hoặc dùng Could you …? khi cần lời đề nghị nhẹ hơn.'],
    trap: {
      wrong: "Don't to touch the glass.",
      right: "Don't touch the glass.",
      why: "Sau don't trong câu mệnh lệnh dùng nguyên mẫu không to.",
    },
    examples: [
      {
        en: 'Turn left at the corner.',
        vi: 'Rẽ trái ở góc đường.',
      },
      {
        en: "Let's take a short break.",
        vi: 'Chúng ta nghỉ một lát nhé.',
      },
    ],
    questions: [
      {
        prompt: 'Please ___ your name at the top.',
        answer: 'write',
        alternatives: ['writes', 'writing'],
        why: 'Hướng dẫn dùng động từ nguyên mẫu write.',
      },
      {
        prompt: "Don't ___ your password with anyone.",
        answer: 'share',
        alternatives: ['to share', 'sharing'],
        why: "Don't + V diễn tả lời nhắc hoặc lệnh cấm.",
      },
    ],
  },
] satisfies GrammarTopic[];
