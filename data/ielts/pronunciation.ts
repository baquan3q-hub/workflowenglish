/**
 * Pronunciation guide for Vietnamese learners: the sounds and habits that
 * most often lower the Pronunciation band. Every example is short enough to
 * be read by the Listening TTS and cached.
 */

export interface PronunciationExample {
  text: string;
  noteVi?: string;
}

export interface PronunciationItem {
  id: string;
  title: string;
  /** IPA or a short label for the sound. */
  sound: string;
  problemVi: string;
  tipsVi: string[];
  examples: PronunciationExample[];
  /** Pairs that only differ in this sound. */
  minimalPairs?: [string, string][];
}

export const PRONUNCIATION_ITEMS: readonly PronunciationItem[] = [
  {
    id: 'final_s',
    title: 'Âm cuối /s/ và /z/',
    sound: '/s/ /z/',
    problemVi:
      'Tiếng Việt không có phụ âm cuối /s/ /z/, nên người Việt hay bỏ đuôi -s của số nhiều, ngôi thứ ba và sở hữu. Giám khảo nghe "my friend live" thay vì "my friends live", vừa mất điểm phát âm vừa bị tính là lỗi ngữ pháp.',
    tipsVi: [
      'Kéo dài đuôi: /s/ như tiếng rắn "sss", /z/ như tiếng ong "zzz".',
      'Sau âm vô thanh (p, t, k, f) đọc /s/: cups, books. Sau âm hữu thanh và nguyên âm đọc /z/: dogs, plays.',
      'Sau s, z, ʃ, tʃ, dʒ thêm một âm tiết /ɪz/: buses, watches, changes.',
      'Luyện chậm, nghe lại bản ghi: nếu không nghe thấy đuôi thì giám khảo cũng không nghe thấy.',
    ],
    examples: [
      { text: 'My parents work in two different cities.', noteVi: 'parents /ts/, cities /iz/' },
      { text: 'She usually takes the bus because it saves time.', noteVi: 'takes /s/, saves /z/' },
      { text: 'There are three buses and two trains every hour.', noteVi: 'buses /ɪz/, trains /z/' },
    ],
    minimalPairs: [
      ['book', 'books'],
      ['play', 'plays'],
      ['price', 'prizes'],
    ],
  },
  {
    id: 'final_td',
    title: 'Âm cuối /t/ và /d/',
    sound: '/t/ /d/',
    problemVi:
      'Người Việt thường nuốt hoặc đọc /t/ /d/ cuối thành âm tắc rất nhẹ, nên "light", "like", "line" nghe gần như nhau. Mất âm cuối làm câu khó hiểu và ảnh hưởng tới band Pronunciation.',
    tipsVi: [
      'Chạm đầu lưỡi vào lợi trên rồi bật nhẹ hơi ra ở /t/; /d/ thì rung dây thanh.',
      'Nguyên âm trước /d/ dài hơn nguyên âm trước /t/: "bed" dài hơn "bet".',
      'Khi /t/ /d/ đứng trước nguyên âm của từ sau, hãy nối âm: "get up" → "ge-tup".',
    ],
    examples: [
      { text: 'I tried to get a seat near the front.', noteVi: 'get, seat, front: bật /t/' },
      { text: 'We had a good time at the old market.', noteVi: 'had, good, old: /d/ cuối' },
    ],
    minimalPairs: [
      ['right', 'ride'],
      ['bet', 'bed'],
      ['light', 'like'],
    ],
  },
  {
    id: 'ed',
    title: 'Đuôi -ed: /t/, /d/ hay /ɪd/',
    sound: '/t/ /d/ /ɪd/',
    problemVi:
      'Khi kể chuyện ở Part 2 bạn dùng thì quá khứ liên tục. Nếu bỏ đuôi -ed, câu nghe như thì hiện tại, giám khảo khó đánh giá ngữ pháp của bạn.',
    tipsVi: [
      'Sau âm vô thanh (p, k, s, ʃ, tʃ, f) đọc /t/: walked, stopped, watched.',
      'Sau âm hữu thanh và nguyên âm đọc /d/: played, called, moved.',
      'Sau /t/ và /d/ thêm âm tiết /ɪd/: wanted, decided, needed.',
      'Đừng đọc mọi đuôi -ed thành /ɪd/: "walked" là một âm tiết, không phải "walk-ed".',
    ],
    examples: [
      { text: 'I walked to the station and waited for an hour.', noteVi: 'walked /t/, waited /ɪd/' },
      { text: 'We decided to stay because it rained all day.', noteVi: 'decided /ɪd/, rained /d/' },
      { text: 'She looked surprised when I finished the race.', noteVi: 'looked /t/, surprised /d/, finished /t/' },
    ],
  },
  {
    id: 'th',
    title: 'Âm /θ/ và /ð/',
    sound: '/θ/ /ð/',
    problemVi:
      'Người Việt thường thay /θ/ bằng /t/ hoặc /s/ ("think" thành "tink", "sink") và /ð/ bằng /d/ hoặc /z/ ("this" thành "dis"). Lỗi này rất dễ nghe thấy.',
    tipsVi: [
      'Đặt đầu lưỡi giữa hai hàm răng, thổi hơi qua khe nhỏ.',
      '/θ/ không rung dây thanh (think, three); /ð/ có rung (this, mother).',
      'Đặt tay lên cổ họng để cảm nhận độ rung khi đọc /ð/.',
    ],
    examples: [
      { text: 'I think three months is enough.', noteVi: 'think, three, months: /θ/' },
      { text: 'My mother and father live together in the south.', noteVi: 'mother, father, together: /ð/; south: /θ/' },
    ],
    minimalPairs: [
      ['think', 'sink'],
      ['three', 'tree'],
      ['they', 'day'],
    ],
  },
  {
    id: 'sh_s',
    title: 'Âm /ʃ/ và /s/',
    sound: '/ʃ/ /s/',
    problemVi:
      'Một số vùng phát âm "s" và "x" giống nhau, nên "she" và "see", "ship" và "sip" dễ bị lẫn. Giám khảo có thể hiểu sai từ bạn nói.',
    tipsVi: [
      '/s/: lưỡi gần lợi trên, môi dẹt, như khi cười.',
      '/ʃ/: lưỡi lùi về sau một chút, môi chu ra tròn, như khi bảo người khác "suỵt".',
      'Chú ý các từ có -tion, -sion, -cial: station, decision, special đều chứa /ʃ/ hoặc /ʒ/.',
    ],
    examples: [
      { text: 'She sells fresh fish at the station.', noteVi: 'she, fresh, fish, station: /ʃ/; sells: /s/' },
      { text: 'It was a special occasion for the whole nation.', noteVi: 'special, occasion, nation' },
    ],
    minimalPairs: [
      ['see', 'she'],
      ['sip', 'ship'],
      ['save', 'shave'],
    ],
  },
  {
    id: 'vowel_length',
    title: 'Nguyên âm dài và ngắn',
    sound: '/iː/ /ɪ/',
    problemVi:
      'Tiếng Việt không phân biệt độ dài nguyên âm như tiếng Anh, nên "sheep" và "ship", "leave" và "live" thường nghe giống nhau.',
    tipsVi: [
      '/iː/ dài, môi kéo căng như khi cười: sheep, leave, seat.',
      '/ɪ/ ngắn, thả lỏng miệng: ship, live, sit.',
      'Cặp tương tự: /uː/ (pool) và /ʊ/ (pull), /ɑː/ (heart) và /ʌ/ (hut).',
    ],
    examples: [
      { text: 'Please leave the seat for the people who live here.', noteVi: 'leave, seat, people dài; live ngắn' },
      { text: 'I usually sit in the shade and read a little.', noteVi: 'sit, little ngắn; read dài' },
    ],
    minimalPairs: [
      ['sheep', 'ship'],
      ['leave', 'live'],
      ['full', 'fool'],
    ],
  },
  {
    id: 'word_stress',
    title: 'Trọng âm từ',
    sound: 'Oo oO',
    problemVi:
      'Tiếng Việt là ngôn ngữ thanh điệu, mỗi âm tiết được đọc rõ như nhau. Tiếng Anh nhấn một âm tiết và đọc lướt các âm còn lại. Sai trọng âm làm từ khó nhận ra, ví dụ "deVElopment" đọc thành "development" đều đều.',
    tipsVi: [
      'Âm tiết nhấn: to hơn, dài hơn, cao hơn. Âm tiết không nhấn thường rút gọn thành /ə/.',
      'Đuôi -tion, -sion, -ic: nhấn ngay trước đuôi (eduCAtion, deCIsion, ecoNOmic).',
      'Danh từ hai âm tiết thường nhấn âm đầu (PREsent), động từ thường nhấn âm sau (preSENT).',
      'Khi học từ mới, chép kèm dấu nhấn, ví dụ phoˈtography.',
    ],
    examples: [
      { text: 'Photography is a popular hobby among my friends.', noteVi: 'phoTOgraphy, POpular, HOBby' },
      { text: 'Technology has changed the economy of my hometown.', noteVi: 'techNOlogy, eCOnomy, HOMEtown' },
      { text: 'I would like to present my present to the president.', noteVi: 'preSENT (động từ), PREsent (danh từ), PREsident' },
    ],
  },
  {
    id: 'linking',
    title: 'Nối âm',
    sound: '‿',
    problemVi:
      'Người Việt thường đọc tách từng từ, có khoảng ngắt nhỏ giữa các từ. Nghe sẽ giật cục và chậm, ảnh hưởng tới cả Fluency lẫn Pronunciation.',
    tipsVi: [
      'Phụ âm cuối nối với nguyên âm đầu từ sau: "turn‿off" → "tur-noff", "an‿apple".',
      'Hai nguyên âm gặp nhau thì chèn /j/ hoặc /w/ nhẹ: "the‿end" → "thee-yend", "go‿out" → "go-wout".',
      'Âm giống nhau ở cuối và đầu từ chỉ đọc một lần, kéo dài hơn: "bus‿stop", "good‿day".',
    ],
    examples: [
      { text: 'Turn it off and pick it up.', noteVi: 'tur-ni-toff, pi-ki-tup' },
      { text: 'I want to go out at about eight.', noteVi: 'go-wout, a-tabou-teight' },
      { text: 'Get off at the next stop.', noteVi: 'ge-toff, nex-stop' },
    ],
  },
  {
    id: 'intonation',
    title: 'Ngữ điệu và nhấn câu',
    sound: '↗ ↘',
    problemVi:
      'Nói đều đều một giọng làm câu trả lời nghe như đọc thuộc lòng, giám khảo khó nhận ra ý chính. Ngữ điệu đúng giúp bạn nghe tự nhiên và tự tin hơn.',
    tipsVi: [
      'Câu trần thuật và câu hỏi Wh- thường xuống giọng ở cuối ↘.',
      'Câu hỏi Yes/No thường lên giọng ↗. Khi liệt kê, lên giọng ở từng mục và xuống ở mục cuối.',
      'Nhấn vào từ mang thông tin (danh từ, động từ chính, tính từ), đọc lướt từ chức năng (a, the, of, to).',
      'Nhấn mạnh từ tương phản: "I don\'t live in the CITY, I live in the SUBURBS."',
    ],
    examples: [
      { text: 'Where do you usually go at the weekend?', noteVi: 'Câu hỏi Wh-: xuống giọng' },
      { text: 'Do you often go there?', noteVi: 'Câu hỏi Yes/No: lên giọng' },
      { text: 'I like reading, cooking, and going for long walks.', noteVi: 'Liệt kê: lên, lên, xuống' },
    ],
  },
];

export function findPronunciationItem(id: string): PronunciationItem | undefined {
  return PRONUNCIATION_ITEMS.find((p) => p.id === id);
}
