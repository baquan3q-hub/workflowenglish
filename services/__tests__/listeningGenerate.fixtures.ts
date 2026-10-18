/**
 * Model output for generateListeningSection as Gemini would return it: one
 * valid Part 2 and one valid Part 4. Tests copy and break them.
 */

interface RawOption {
  key: string;
  text: string;
}
export interface RawFixture {
  part: string;
  difficulty: string;
  title: string;
  contextVi: string;
  speakers: { name: string; gender: string; roleVi: string }[];
  segments: { lines: { speaker: string; text: string }[] }[];
  groups: {
    type: string;
    title?: string;
    lines?: string[];
    prompt?: string;
    optionsTitle?: string;
    options?: RawOption[];
    questions: {
      number: number;
      prompt?: string;
      options?: RawOption[];
      answers: string[];
      segment: number;
      evidence: string;
      distractor?: string;
      paraphraseQuestion?: string;
      paraphraseAudio?: string;
      explanationVi: string;
    }[];
  }[];
}

export const RAW_PART2: RawFixture = {
  part: '2',
  difficulty: 'medium',
  title: 'A visit to Hollybank Farm Park',
  contextVi: 'Nhân viên giáo dục giới thiệu công viên nông trại cho một đoàn khách trước khi tham quan.',
  speakers: [{ name: 'Megan', gender: 'female', roleVi: 'Nhân viên giáo dục' }],
  segments: [
    {
      lines: [
        {
          speaker: 'Megan',
          text: "Good morning, everyone, and welcome to Hollybank Farm Park. My name's Megan, and I'm one of the education officers here. Before you set off, I'd like to give you a quick overview of the park and what's on today. The farm was opened to the public in 1998, but people often assume it's been a visitor attraction for much longer, because the farmhouse itself is over three hundred years old. In fact, for most of its history it was a working dairy farm, and it was only when the last owner retired that the local council bought it. Now, a lot of visitors ask how the park is funded. We do get a small grant from the council, but most of our money actually comes from school visits, which bring in far more than the café or the gift shop.",
        },
      ],
    },
    {
      lines: [
        {
          speaker: 'Megan',
          text: "Right, let's talk about today. The weather forecast was for rain, so we had planned to keep everyone indoors, but as you can see, it's turned out to be a lovely day, so the sheep-shearing demonstration will go ahead outside as usual, at eleven o'clock in the main yard. Please don't feed the animals with your own food. We sell bags of special feed at the entrance, and the money goes towards vet bills. Children under five must be with an adult in the barns at all times, and I'd also ask everyone to wash their hands after touching the animals. There are sinks by every exit. If you lose anything, the place to go is the ticket office rather than the café, because that's where lost property is kept.",
        },
      ],
    },
    {
      lines: [
        {
          speaker: 'Megan',
          text: "We've made a few changes this year. The pony rides were very popular, but sadly we've had to stop them because of insurance costs. Instead, we've introduced tractor rides, which leave from the car park every half an hour and take you around the whole farm. We were also hoping to start cheese-making classes, but they won't be ready until next spring. What you can try today, though, is our new maze. It's made from willow trees, and it takes about twenty minutes to find your way to the centre. The bird of prey shows, which have been running for ten years now, are still on every afternoon at three.",
        },
      ],
    },
    {
      lines: [
        {
          speaker: 'Megan',
          text: "Finally, a word about the different areas. If you head up the hill to the orchard, you'll get the best views of the valley, so do take a camera. The pond is lovely, but I'm afraid it's closed at the moment while we repair the fence around it, so please keep away from that path. The old mill is fascinating, and it has a little museum inside, but you'll need to buy a separate ticket for that at the door. It's only two pounds. And the picnic field is where most families end up. It's fine in the morning, but it does get very busy at lunchtime, so you might want to eat a bit earlier. Right, that's all from me. Enjoy your day.",
        },
      ],
    },
  ],
  groups: [
    {
      type: 'mcq',
      questions: [
        {
          number: 11,
          prompt: 'What does Megan say about the farmhouse?',
          options: [
            { key: 'A', text: 'It was bought by the council in 1998.' },
            { key: 'B', text: 'It is more than three centuries old.' },
            { key: 'C', text: 'It has been open to visitors for a long time.' },
          ],
          answers: ['B'],
          segment: 1,
          evidence: 'the farmhouse itself is over three hundred years old',
          distractor: "people often assume it's been a visitor attraction for much longer",
          paraphraseQuestion: 'more than three centuries old',
          paraphraseAudio: 'over three hundred years old',
          explanationVi: 'B đúng: "over three hundred years" là hơn ba thế kỷ. C sai vì đó chỉ là điều mọi người "assume".',
        },
        {
          number: 12,
          prompt: 'Most of the park’s income comes from',
          options: [
            { key: 'A', text: 'a council grant.' },
            { key: 'B', text: 'the café and gift shop.' },
            { key: 'C', text: 'visits by schools.' },
          ],
          answers: ['C'],
          segment: 1,
          evidence: 'most of our money actually comes from school visits',
          distractor: 'We do get a small grant from the council',
          explanationVi: 'C đúng. Khoản trợ cấp của hội đồng chỉ là "small grant", không phải nguồn chính.',
        },
        {
          number: 13,
          prompt: 'Where will the sheep-shearing demonstration take place today?',
          options: [
            { key: 'A', text: 'indoors' },
            { key: 'B', text: 'in the main yard' },
            { key: 'C', text: 'in the barns' },
          ],
          answers: ['b'],
          segment: 2,
          evidence: "the sheep-shearing demonstration will go ahead outside as usual, at eleven o'clock in the main yard",
          distractor: 'we had planned to keep everyone indoors',
          explanationVi: 'B đúng. Ban đầu định tổ chức trong nhà vì dự báo mưa, nhưng trời đẹp nên vẫn làm ngoài sân.',
        },
        {
          number: 14,
          prompt: 'Visitors who lose something should go to',
          options: [
            { key: 'A', text: 'the ticket office.' },
            { key: 'B', text: 'the café.' },
            { key: 'C', text: 'the entrance.' },
          ],
          answers: ['A'],
          segment: 2,
          evidence: "the ticket office rather than the café, because that's where lost property is kept",
          distractor: 'We sell bags of special feed at the entrance',
          explanationVi: 'A đúng: đồ thất lạc được giữ ở quầy vé, không phải quán café.',
        },
      ],
    },
    {
      type: 'mcq_multi',
      prompt: 'Which TWO activities are new this year?',
      options: [
        { key: 'A', text: 'pony rides' },
        { key: 'B', text: 'tractor rides' },
        { key: 'C', text: 'cheese-making classes' },
        { key: 'D', text: 'a maze' },
        { key: 'E', text: 'bird of prey shows' },
      ],
      questions: [
        {
          number: 15,
          answers: ['B', 'D'],
          segment: 3,
          evidence: "Instead, we've introduced tractor rides",
          distractor: "we've had to stop them because of insurance costs",
          explanationVi: 'B đúng: "introduced" nghĩa là mới có. Cưỡi ngựa con đã bị dừng.',
        },
        {
          number: 16,
          answers: ['B', 'D'],
          segment: 3,
          evidence: 'What you can try today, though, is our new maze.',
          distractor: "they won't be ready until next spring",
          explanationVi: 'D đúng. Lớp làm phô mai chưa có tới mùa xuân năm sau; chương trình chim săn mồi đã có 10 năm.',
        },
      ],
    },
    {
      type: 'matching',
      prompt: 'What does Megan say about each area of the park?',
      optionsTitle: 'Comments',
      options: [
        { key: 'A', text: 'suitable for young children' },
        { key: 'B', text: 'closed for repairs' },
        { key: 'C', text: 'has the best views' },
        { key: 'D', text: 'needs a separate ticket' },
        { key: 'E', text: 'new this season' },
        { key: 'F', text: 'gets crowded in the middle of the day' },
      ],
      questions: [
        {
          number: 17,
          prompt: 'the orchard',
          answers: ['C'],
          segment: 4,
          evidence: "you'll get the best views of the valley",
          explanationVi: 'C đúng: từ vườn cây ăn quả nhìn được toàn cảnh thung lũng.',
        },
        {
          number: 18,
          prompt: 'the pond',
          answers: ['B'],
          segment: 4,
          evidence: "it's closed at the moment while we repair the fence around it",
          explanationVi: 'B đúng: ao đang đóng để sửa hàng rào.',
        },
        {
          number: 19,
          prompt: 'the old mill',
          answers: ['D'],
          segment: 4,
          evidence: "you'll need to buy a separate ticket for that at the door",
          explanationVi: 'D đúng: bảo tàng trong cối xay cần mua vé riêng.',
        },
        {
          number: 20,
          prompt: 'the picnic field',
          answers: ['F'],
          segment: 4,
          evidence: 'it does get very busy at lunchtime',
          paraphraseQuestion: 'gets crowded in the middle of the day',
          paraphraseAudio: 'get very busy at lunchtime',
          explanationVi: 'F đúng: "very busy at lunchtime" là đông vào giữa trưa.',
        },
      ],
    },
  ],
};

export const RAW_PART4: RawFixture = {
  part: '4',
  difficulty: 'easy',
  title: 'Bees in cities',
  contextVi: 'Một giảng viên trình bày bài giảng về loài ong sống ở thành phố.',
  speakers: [{ name: 'Ruth', gender: 'female', roleVi: 'Giảng viên' }],
  segments: [
    {
      lines: [
        {
          speaker: 'Ruth',
          text: "Good afternoon. Today I'm going to talk about bees in cities, which is a topic that has attracted a lot of attention from researchers over the last decade. Most people picture bees in the countryside, surrounded by fields of flowers, so it may surprise you to learn that many cities now support more bee species than the farmland around them. One reason for this is that modern farms tend to grow a single crop over a huge area. When that crop stops flowering, there's simply nothing left for the bees to eat. In a city, by contrast, gardens, parks and even roadsides contain a wide variety of plants that flower at different times of the year, so food is available for much longer. Another factor is temperature. Cities are usually a few degrees warmer than the surrounding area, and this means bees can become active earlier in the spring.",
        },
      ],
    },
    {
      lines: [
        {
          speaker: 'Ruth',
          text: "However, city life is not without its problems. The biggest threat that urban bees face is a lack of places to nest. Around seventy percent of bee species don't live in hives at all. They nest in the ground, in small holes in wood or even in old walls, and these sites are often lost when land is cleared for building. Pollution is a concern too, although the research here is less clear. Some studies suggest that air pollution makes it harder for bees to find flowers by smell, but others have found very little effect. What is certain is that the chemicals people use in their gardens can be extremely harmful. A single application of some common products can kill bees for weeks afterwards.",
        },
      ],
    },
    {
      lines: [
        {
          speaker: 'Ruth',
          text: "So what can be done? Several cities have started to create what are called bee corridors. These are lines of flowering plants that connect parks and gardens, so that bees can travel safely across the city. Some building designers have also begun to add green roofs, which are covered in low plants, and these have proved surprisingly popular with bees. Interestingly, beehives on roofs are a less helpful idea than many people think. Honeybees compete with wild bees for food, so adding too many hives can actually reduce the number of wild species. The best thing an ordinary person can do is simply to leave part of their garden untidy, with long grass and dead wood, because that provides exactly the kind of nest site that wild bees need. Thank you.",
        },
      ],
    },
  ],
  groups: [
    {
      type: 'completion',
      title: 'Bees in cities',
      lines: [
        'Why cities suit bees',
        'Cities often have more bee species than nearby {{31}}',
        'Farms usually grow only one {{32}} across a large area',
        'Urban plants flower at different times, so {{33}} lasts longer',
        'Higher {{34}} lets bees become active earlier in spring',
        'Problems',
        'Main threat: a shortage of sites to {{35}}',
        'Many species live in the {{36}}, in wood or in walls',
        'Garden {{37}} can harm bees for a long time',
        'Solutions',
        'Bee {{38}} link parks and gardens',
        'Too many {{39}} on roofs may reduce wild species',
        'People should leave part of the garden {{40}}',
      ],
      questions: [
        { number: 31, answers: ['farmland'], segment: 1, evidence: 'many cities now support more bee species than the farmland around them', explanationVi: 'Thành phố có nhiều loài ong hơn vùng đất nông nghiệp xung quanh.' },
        { number: 32, answers: ['crop'], segment: 1, evidence: 'modern farms tend to grow a single crop over a huge area', paraphraseQuestion: 'only one', paraphraseAudio: 'a single', explanationVi: '"a single crop" = chỉ một loại cây trồng.' },
        { number: 33, answers: ['food'], segment: 1, evidence: 'so food is available for much longer', explanationVi: 'Cây nở hoa vào nhiều thời điểm nên thức ăn có lâu hơn.' },
        { number: 34, answers: ['temperature'], segment: 1, evidence: 'Another factor is temperature.', explanationVi: 'Thành phố ấm hơn nên ong hoạt động sớm hơn vào mùa xuân.' },
        { number: 35, answers: ['nest'], segment: 2, evidence: 'a lack of places to nest', paraphraseQuestion: 'a shortage of sites', paraphraseAudio: 'a lack of places', explanationVi: '"a lack of places to nest" = thiếu chỗ làm tổ.' },
        { number: 36, answers: ['ground'], segment: 2, evidence: 'They nest in the ground, in small holes in wood or even in old walls', explanationVi: 'Nhiều loài làm tổ dưới đất, trong gỗ hoặc tường cũ.' },
        { number: 37, answers: ['chemicals'], segment: 2, evidence: 'the chemicals people use in their gardens can be extremely harmful', explanationVi: 'Hoá chất dùng trong vườn có thể giết ong nhiều tuần.' },
        { number: 38, answers: ['corridors'], segment: 3, evidence: 'Several cities have started to create what are called bee corridors.', explanationVi: '"bee corridors" là các dải cây hoa nối công viên và vườn.' },
        { number: 39, answers: ['hives', 'beehives'], segment: 3, evidence: 'adding too many hives can actually reduce the number of wild species', explanationVi: 'Quá nhiều tổ ong mật làm giảm số loài ong hoang dã.' },
        { number: 40, answers: ['untidy'], segment: 3, evidence: 'leave part of their garden untidy', explanationVi: 'Để một phần vườn bừa bộn tạo chỗ làm tổ cho ong hoang dã.' },
      ],
    },
  ],
};
