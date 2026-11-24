import type { GrammarTopic } from './types';

export const structures = [
  {
    id: 'passive',
    title: 'Câu bị động',
    en: 'Passive voice',
    level: 'Trung cấp',
    aliases: ['chủ động active passive be V3'],
    forms: [
      {
        label: 'Hiện tại đơn',
        pattern: 'S + am/is/are + V3',
      },
      {
        label: 'Quá khứ đơn',
        pattern: 'S + was/were + V3',
      },
      { label: 'Tiếp diễn', pattern: 'S + am/is/are/was/were + being + V3' },
      { label: 'Hoàn thành', pattern: 'S + have/has/had + been + V3' },
      { label: 'Tương lai hoặc tình thái', pattern: 'S + will/can/must + be + V3' },
    ],
    uses: [
      'Đưa đối tượng chịu tác động lên đầu câu khi muốn nhấn người/vật đó hoặc khi tác nhân chưa rõ. Có thể thêm by + tác nhân nếu thông tin này cần thiết.',
      'Chia be theo thì và chủ ngữ. Động từ chính giữ dạng V3, kể cả trong is being repaired.',
    ],
    trap: {
      wrong: 'The bridge was build in 1998.',
      right: 'The bridge was built in 1998.',
      why: 'Built là quá khứ phân từ của build sau was.',
    },
    examples: [
      {
        en: 'The emails are checked every morning.',
        vi: 'Email được kiểm tra mỗi sáng.',
      },
      {
        en: 'The road is being repaired this week.',
        vi: 'Con đường đang được sửa trong tuần này.',
      },
      {
        en: 'All forms must be signed before Friday.',
        vi: 'Mọi biểu mẫu phải được ký trước thứ Sáu.',
      },
    ],
    questions: [
      {
        prompt: 'The tickets ___ yesterday.',
        answer: 'were sold',
        alternatives: ['were sell', 'are sold'],
        why: 'Yesterday yêu cầu quá khứ và tickets là số nhiều. Sold là V3.',
      },
      {
        prompt: 'The results will ___ tomorrow.',
        answer: 'be announced',
        alternatives: ['been announced', 'announce by'],
        why: 'Sau will cần be + V3 khi results nhận tác động.',
      },
      {
        prompt: 'Look! The broken window ___ right now.',
        answer: 'is being replaced',
        alternatives: ['is been replaced', 'is replacing by'],
        why: 'Is being + V3 là bị động đang tiếp diễn.',
      },
      {
        prompt: 'The letters have already ___ to both schools.',
        answer: 'been sent',
        alternatives: ['be sent', 'being sent'],
        why: 'Bị động hiện tại hoàn thành dùng have been + V3.',
      },
    ],
  },
  {
    id: 'conjunctions',
    title: 'Liên từ nối từ, cụm và mệnh đề',
    en: 'Conjunctions',
    level: 'Nền tảng',
    aliases: ['and but or so because although correlatives'],
    forms: [
      {
        label: 'Liên từ đẳng lập',
        pattern: 'mệnh đề + and/but/or/so + mệnh đề',
      },
      {
        label: 'Liên từ phụ thuộc',
        pattern: 'because/although/when/if + chủ ngữ + động từ',
      },
      {
        label: 'Liên từ tương liên',
        pattern: 'either … or / neither … nor / both … and',
      },
    ],
    uses: [
      'Chọn liên từ theo quan hệ thêm ý, tương phản, lựa chọn, nguyên nhân hoặc kết quả.',
      'Với because mở đầu mệnh đề chỉ nguyên nhân, nối trực tiếp sang mệnh đề chính. Với so, thường đặt lý do trước rồi mới nêu kết quả.',
    ],
    trap: {
      wrong: 'Although it was late, but we kept working.',
      right: 'Although it was late, we kept working.',
      why: 'Although đã nêu quan hệ tương phản giữa hai mệnh đề.',
    },
    examples: [
      {
        en: 'I stayed home because I felt ill.',
        vi: 'Tôi ở nhà vì thấy không khỏe.',
      },
      {
        en: 'It started to rain, so we took the bus.',
        vi: 'Trời bắt đầu mưa nên chúng tôi đi xe buýt.',
      },
      {
        en: 'You can either email the file or bring a printed copy.',
        vi: 'Bạn có thể gửi email hoặc mang bản in.',
      },
    ],
    questions: [
      {
        prompt: 'I took a taxi ___ I was running late.',
        answer: 'because',
        alternatives: ['so', 'or'],
        why: 'Vế sau giải thích lý do cho việc đi taxi.',
      },
      {
        prompt: 'It was raining, ___ we decided to stay inside.',
        answer: 'so',
        alternatives: ['or', 'whereas'],
        why: 'Vế sau nêu kết quả.',
      },
      {
        prompt: '___ she was tired, she finished the report.',
        answer: 'Although',
        alternatives: ['So', 'And'],
        why: 'Although mở mệnh đề nhượng bộ.',
      },
      {
        prompt: 'You can either walk ___ take the bus.',
        answer: 'or',
        alternatives: ['and', 'nor'],
        why: 'Either đi cặp với or để nêu hai lựa chọn.',
      },
    ],
  },
  {
    id: 'modals',
    title: 'Động từ tình thái',
    en: 'Modal verbs',
    level: 'Nền tảng',
    aliases: ['can could should must may might have to'],
    forms: [
      {
        label: 'Cấu trúc',
        pattern: 'S + can/could/should/must/may/might + V',
      },
      {
        label: 'Quá khứ suy đoán',
        pattern: 'modal + have + V3',
      },
    ],
    uses: [
      'Can/could dùng cho khả năng hoặc yêu cầu, should cho lời khuyên, must cho yêu cầu mạnh, may/might cho khả năng chưa chắc.',
      "Mustn't chỉ điều bị cấm. Don't have to chỉ điều không bắt buộc.",
    ],
    trap: {
      wrong: 'She can to drive.',
      right: 'She can drive.',
      why: 'Sau can dùng động từ nguyên mẫu không to.',
    },
    examples: [
      {
        en: 'Could you open the window, please?',
        vi: 'Bạn mở giúp cửa sổ được không?',
      },
      {
        en: 'You do not have to call us today.',
        vi: 'Bạn không cần gọi cho chúng tôi hôm nay.',
      },
    ],
    questions: [
      {
        prompt: 'You ___ touch the exhibits. It is forbidden.',
        answer: 'must not',
        alternatives: ['do not have to', 'may'],
        why: 'Forbidden chỉ điều bị cấm.',
      },
      {
        prompt: 'You look tired. You ___ take a short break.',
        answer: 'should',
        alternatives: ['should to', 'can to'],
        why: 'Should + V dùng để đưa lời khuyên.',
      },
    ],
  },
  {
    id: 'nonfinite',
    title: 'Danh động từ và động từ nguyên mẫu',
    en: 'Gerunds and infinitives',
    level: 'Trung cấp',
    aliases: ['verb patterns V-ing to V'],
    forms: [
      {
        label: 'V-ing',
        pattern: 'enjoy / avoid / finish + V-ing',
      },
      {
        label: 'To + V',
        pattern: 'want / decide / hope + to V',
      },
      {
        label: 'Mục đích',
        pattern: 'mệnh đề + to V',
      },
    ],
    uses: [
      'Học theo mẫu của động từ đứng trước. Sau giới từ thường dùng V-ing.',
      'Một số động từ đổi nghĩa theo mẫu. Stop doing là dừng việc đang làm, stop to do là dừng lại để làm việc khác.',
    ],
    trap: {
      wrong: 'I enjoy to cook.',
      right: 'I enjoy cooking.',
      why: 'Enjoy đi với V-ing.',
    },
    examples: [
      {
        en: 'They decided to leave early.',
        vi: 'Họ quyết định rời đi sớm.',
      },
      {
        en: 'I stopped to buy some water.',
        vi: 'Tôi dừng lại để mua nước.',
      },
    ],
    questions: [
      {
        prompt: 'She avoided ___ about the problem.',
        answer: 'talking',
        alternatives: ['to talk', 'talk'],
        why: 'Sau avoid dùng V-ing.',
      },
      {
        prompt: 'I went to the library ___ for the exam.',
        answer: 'to study',
        alternatives: ['studied', 'study'],
        why: 'To + V diễn tả mục đích đến thư viện.',
      },
    ],
  },
  {
    id: 'relative',
    title: 'Mệnh đề quan hệ',
    en: 'Relative clauses',
    level: 'Trung cấp',
    aliases: ['who which that whose where'],
    forms: [
      {
        label: 'Xác định',
        pattern: 'noun + who/which/that + relative clause',
      },
      {
        label: 'Bổ sung',
        pattern: 'noun, who/which + relative clause, …',
      },
      {
        label: 'Sở hữu',
        pattern: 'noun + whose + noun + verb',
      },
    ],
    uses: [
      'Mệnh đề xác định giúp nhận diện người hoặc vật. Có thể bỏ đại từ quan hệ khi nó làm tân ngữ trong loại này.',
      'Mệnh đề bổ sung dùng dấu phẩy và dùng who/which/whose, tránh that.',
    ],
    trap: {
      wrong: 'My sister, that lives in Hue, is a nurse.',
      right: 'My sister, who lives in Hue, is a nurse.',
      why: 'Who dùng cho người trong mệnh đề bổ sung sau dấu phẩy.',
    },
    examples: [
      {
        en: 'The student who helped me is from Hanoi.',
        vi: 'Bạn sinh viên giúp tôi đến từ Hà Nội.',
      },
      {
        en: 'The book I borrowed was interesting.',
        vi: 'Cuốn sách tôi mượn rất hay.',
      },
    ],
    questions: [
      {
        prompt: 'The author ___ book won the prize is visiting our school.',
        answer: 'whose',
        alternatives: ['which', 'where'],
        why: 'Whose diễn tả cuốn sách của tác giả.',
      },
      {
        prompt: 'This house, ___ was built in 1900, is now a museum.',
        answer: 'which',
        alternatives: ['that', 'where'],
        why: 'Which làm chủ ngữ trong mệnh đề bổ sung về ngôi nhà.',
      },
    ],
  },
  {
    id: 'conditions',
    title: 'Câu điều kiện 0, 1, 2, 3 và hỗn hợp',
    en: 'Conditionals',
    level: 'Trung cấp',
    aliases: ['if unless mixed conditional'],
    forms: [
      {
        label: 'Loại 0 / 1',
        pattern: 'If + hiện tại đơn, hiện tại đơn / will + V',
      },
      {
        label: 'Loại 2',
        pattern: 'If + quá khứ đơn, would + V',
      },
      {
        label: 'Loại 3',
        pattern: 'If + had + V3, would have + V3',
      },
      {
        label: 'Hỗn hợp',
        pattern: 'If + had + V3, would + V (kết quả hiện tại)',
      },
    ],
    uses: [
      'Dùng loại 0 cho quy luật và loại 1 cho khả năng thực trong tương lai.',
      'Loại 2 diễn tả giả định, loại 3 tưởng tượng một quá khứ khác. Dạng hỗn hợp có thể nối điều kiện quá khứ với kết quả hiện tại.',
    ],
    trap: {
      wrong: 'If I will see Lan, I will tell her.',
      right: 'If I see Lan, I will tell her.',
      why: 'Trong câu điều kiện loại 1 thông thường, vế if dùng hiện tại đơn.',
    },
    examples: [
      {
        en: 'If I had more time, I would learn French.',
        vi: 'Nếu có nhiều thời gian hơn, tôi sẽ học tiếng Pháp.',
      },
      {
        en: 'If we had left earlier, we would have caught the train.',
        vi: 'Nếu đi sớm hơn, chúng tôi đã bắt kịp tàu.',
      },
      {
        en: 'If I had saved more, I would have enough money now.',
        vi: 'Nếu trước đây tôi tiết kiệm hơn, bây giờ tôi đã có đủ tiền.',
      },
    ],
    questions: [
      {
        prompt: 'If it rains tomorrow, we ___ at home.',
        answer: 'will stay',
        alternatives: ['would have stayed', 'had stayed'],
        why: 'Vế kết quả của điều kiện tương lai dùng will.',
      },
      {
        prompt: 'If she had checked the address, she ___ lost yesterday.',
        answer: 'would not have got',
        alternatives: ['would not get', 'will not get'],
        why: 'Đây là kết quả giả định của một điều kiện quá khứ.',
      },
      {
        prompt: 'If I ___ you, I would ask for help.',
        answer: 'were',
        alternatives: ['am', 'will be'],
        why: 'Were dùng được với mọi chủ ngữ trong giả định, nhất là If I were you.',
      },
    ],
  },
  {
    id: 'reported',
    title: 'Câu tường thuật',
    en: 'Reported speech',
    level: 'Trung cấp',
    aliases: ['say tell indirect speech backshift'],
    forms: [
      {
        label: 'Câu kể',
        pattern: 'say (that) … / tell + người + (that) …',
      },
      {
        label: 'Câu hỏi',
        pattern: 'ask + if/whether hoặc từ hỏi + S + V',
      },
      {
        label: 'Lời yêu cầu',
        pattern: 'ask/tell + người + to V',
      },
    ],
    uses: [
      'Khi điểm nhìn đã chuyển về quá khứ, thường lùi thì và đổi từ chỉ thời gian hoặc đại từ theo ngữ cảnh. Có thể giữ thì nếu thông tin vẫn còn đúng hoặc phù hợp.',
      'Trong câu hỏi gián tiếp, đặt chủ ngữ trước động từ.',
    ],
    trap: {
      wrong: 'She asked where did I live.',
      right: 'She asked where I lived.',
      why: 'Sau where trong câu hỏi gián tiếp dùng trật tự câu kể.',
    },
    examples: [
      {
        en: 'Nam said he was tired.',
        vi: 'Nam nói rằng anh ấy mệt.',
      },
      {
        en: 'She told me to wait outside.',
        vi: 'Cô ấy bảo tôi đợi bên ngoài.',
      },
    ],
    questions: [
      {
        prompt: 'He asked ___ I needed help.',
        answer: 'whether',
        alternatives: ['that', 'did'],
        why: 'Whether mở câu hỏi gián tiếp có/không.',
      },
      {
        prompt: 'Mai ___ me that she was leaving.',
        answer: 'told',
        alternatives: ['said', 'was saying to that'],
        why: 'Tell đi trực tiếp với người nghe me.',
      },
    ],
  },
  {
    id: 'clauses',
    title: 'Mệnh đề danh từ và mệnh đề trạng ngữ',
    en: 'Noun and adverbial clauses',
    level: 'Trung cấp',
    aliases: ['clause that whether what although when'],
    forms: [
      {
        label: 'Mệnh đề danh từ',
        pattern: 'that/whether/what + cụm mệnh đề',
      },
      {
        label: 'Mệnh đề trạng ngữ',
        pattern: 'when/because/while/although + S + V',
      },
    ],
    uses: [
      'Mệnh đề danh từ có thể làm chủ ngữ, tân ngữ hoặc bổ ngữ.',
      'Mệnh đề trạng ngữ bổ sung thông tin về thời gian, nguyên nhân, điều kiện hoặc tương phản.',
    ],
    trap: {
      wrong: "I don't know what does she mean.",
      right: "I don't know what she means.",
      why: 'Mệnh đề danh từ với what ở đây dùng trật tự câu kể.',
    },
    examples: [
      {
        en: 'What you said surprised me.',
        vi: 'Điều bạn nói làm tôi bất ngờ.',
      },
      {
        en: 'We left when the meeting ended.',
        vi: 'Chúng tôi rời đi khi cuộc họp kết thúc.',
      },
    ],
    questions: [
      {
        prompt: 'Do you know ___?',
        answer: 'where the bank is',
        alternatives: ['where is the bank', 'the bank is where'],
        why: 'Câu hỏi gián tiếp giữ the bank trước is.',
      },
      {
        prompt: '___ you told me changed my mind.',
        answer: 'What',
        alternatives: ['Because', 'While'],
        why: 'What you told me làm chủ ngữ của changed.',
      },
    ],
  },
  {
    id: 'causative',
    title: 'Cấu trúc sai khiến và nhờ làm hộ',
    en: 'Causatives',
    level: 'Trung cấp',
    aliases: ['have get make let'],
    forms: [
      {
        label: 'Dịch vụ',
        pattern: 'have/get + vật + V3',
      },
      {
        label: 'Người thực hiện',
        pattern: 'make/let/have + người + V',
      },
      {
        label: 'Thuyết phục',
        pattern: 'get + người + to V',
      },
    ],
    uses: [
      'Have/get something done nhấn việc người khác làm cho mình hoặc việc xảy ra với mình.',
      'Make chỉ ép hoặc khiến. Let chỉ cho phép. Dạng bị động của make dùng to V.',
    ],
    trap: {
      wrong: 'I had my bike repair.',
      right: 'I had my bike repaired.',
      why: 'Chiếc xe nhận tác động nên dùng repaired sau my bike.',
    },
    examples: [
      {
        en: 'I had my hair cut yesterday.',
        vi: 'Hôm qua tôi đi cắt tóc.',
      },
      {
        en: 'The teacher let us leave early.',
        vi: 'Giáo viên cho chúng tôi về sớm.',
      },
    ],
    questions: [
      {
        prompt: 'She got her phone ___ last week.',
        answer: 'fixed',
        alternatives: ['fix', 'to fix'],
        why: 'Điện thoại được người khác sửa.',
      },
      {
        prompt: 'They made us ___ for an hour.',
        answer: 'wait',
        alternatives: ['waiting', 'to wait'],
        why: 'Dạng chủ động make + người + V.',
      },
    ],
  },
  {
    id: 'phrasal',
    title: 'Cụm động từ và vị trí tân ngữ',
    en: 'Phrasal verbs',
    level: 'Trung cấp',
    aliases: ['turn off look after verb particle'],
    forms: [
      {
        label: 'Tách được',
        pattern: 'turn off the light / turn the light off',
      },
      {
        label: 'Đại từ',
        pattern: 'turn it off',
      },
      {
        label: 'Không tách được',
        pattern: 'look after the child / look after her',
      },
    ],
    uses: [
      'Học cả nghĩa và khả năng tách của cụm. Cụm động từ có thể mang nghĩa khác động từ gốc.',
      'Với cụm tách được, đại từ tân ngữ thường đứng ở giữa.',
    ],
    trap: {
      wrong: 'Please turn off it.',
      right: 'Please turn it off.',
      why: 'Với turn off, đặt đại từ it giữa turn và off.',
    },
    examples: [
      {
        en: 'We put off the meeting until Friday.',
        vi: 'Chúng tôi hoãn cuộc họp tới thứ Sáu.',
      },
      {
        en: 'She looks after her grandfather.',
        vi: 'Cô ấy chăm sóc ông mình.',
      },
    ],
    questions: [
      {
        prompt: 'The lights are on. Please ___.',
        answer: 'turn them off',
        alternatives: ['turn off them', 'turn they off'],
        why: 'Them đứng giữa turn và off.',
      },
      {
        prompt: 'My neighbour will ___ while we are away.',
        answer: 'look after the cat',
        alternatives: ['look the cat after', 'look after it the cat'],
        why: 'Look after là cụm không tách được.',
      },
    ],
  },
  {
    id: 'used-to',
    title: 'Thói quen cũ và sự quen thuộc',
    en: 'Used to, be used to, get used to',
    level: 'Trung cấp',
    aliases: ['used to would thói quen'],
    forms: [
      {
        label: 'Thói quen cũ',
        pattern: 'used to + V',
      },
      {
        label: 'Đã quen',
        pattern: 'be used to + noun / V-ing',
      },
      {
        label: 'Dần quen',
        pattern: 'get used to + noun / V-ing',
      },
    ],
    uses: [
      'Used to nói thói quen hoặc trạng thái trước đây thường đã thay đổi.',
      'Sau be/get used to, to là giới từ. Sau did trong câu hỏi chuẩn, viết use to.',
    ],
    trap: {
      wrong: 'I am used to wake up early.',
      right: 'I am used to waking up early.',
      why: 'Sau am used to dùng V-ing khi nói việc đã quen.',
    },
    examples: [
      {
        en: 'We used to live near the sea.',
        vi: 'Trước đây chúng tôi sống gần biển.',
      },
      {
        en: 'I am getting used to my new schedule.',
        vi: 'Tôi đang dần quen lịch mới.',
      },
    ],
    questions: [
      {
        prompt: 'She is used to ___ from home.',
        answer: 'working',
        alternatives: ['work', 'worked'],
        why: 'Sau is used to dùng V-ing.',
      },
      {
        prompt: 'Did you ___ play outside after school?',
        answer: 'use to',
        alternatives: ['used to', 'be used to'],
        why: 'Did mang dấu hiệu quá khứ, theo sau là use to.',
      },
    ],
  },
] satisfies GrammarTopic[];
