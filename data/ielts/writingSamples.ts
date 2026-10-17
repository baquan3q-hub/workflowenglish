/**
 * The same prompt answered at band 6, 7 and 8, with notes on the phrases that
 * earn or lose marks. Written for this app. Each note quotes text that appears
 * exactly once in its paragraph (checked by tests).
 */

import type { IeltsWritingTask } from '../../types';

export type SampleNoteKind = 'good' | 'weak';

export interface SampleNote {
  quote: string;
  kind: SampleNoteKind;
  note: string;
}

export interface SampleParagraph {
  text: string;
  notes?: SampleNote[];
}

export type SampleBand = 6 | 7 | 8;

export interface BandEssay {
  band: SampleBand;
  /** Criterion bands in the usual order: TA/TR, CC, LR, GRA. */
  scores: [number, number, number, number];
  verdict: string;
  paragraphs: SampleParagraph[];
}

export interface BandSampleSet {
  id: string;
  task: IeltsWritingTask;
  /** Bank question this set answers, so the learner can practise the same prompt. */
  questionId: string;
  title: string;
  essays: BandEssay[];
}

export const BAND_SAMPLE_SETS: readonly BandSampleSet[] = [
  {
    id: 'sample_t1_tourism',
    task: 'task_1',
    questionId: 'wr_t1_tourism_line_001',
    title: 'Task 1 · Khách du lịch đến một hòn đảo (line graph)',
    essays: [
      {
        band: 6,
        scores: [6, 6, 6, 6],
        verdict:
          'Có overview và đủ số liệu nên đạt band 6. Bài bị giữ ở band 6 vì liệt kê từng năm thay vì chọn lọc, overview quá chung và còn lỗi ngữ pháp cơ bản (số nhiều, hoà hợp chủ ngữ, thì).',
        paragraphs: [
          {
            text: 'The line graph shows the number of tourist who visited an island from 2010 to 2020, and it divide them into two groups, people staying on the island and people staying on cruise ships.',
            notes: [
              { quote: 'the number of tourist', kind: 'weak', note: 'Sau "the number of" danh từ phải ở số nhiều: tourists.' },
              { quote: 'it divide them', kind: 'weak', note: 'Chủ ngữ số ít cần động từ thêm -s: it divides.' },
            ],
          },
          {
            text: 'Overall, both groups increased, but the cruise ship group increased more.',
            notes: [
              {
                quote: 'both groups increased, but the cruise ship group increased more',
                kind: 'weak',
                note: 'Có overview nên không bị giới hạn ở band 5, nhưng còn quá chung: chưa nói tàu du lịch vượt lên vào cuối giai đoạn. Từ "increased" bị lặp.',
              },
            ],
          },
          {
            text: 'In 2010, there were 0.7 million tourists stayed on the island. In 2012 it went up to 1 million and in 2014 it was 1.2 million. After that it continued to increase to 1.5 million in 2016, 1.7 million in 2018 and 1.8 million in 2020.',
            notes: [
              { quote: 'there were 0.7 million tourists stayed', kind: 'weak', note: 'Hai động từ chính trong một mệnh đề. Sửa: 0.7 million tourists stayed, hoặc there were 0.7 million tourists staying.' },
              { quote: 'In 2012 it went up to 1 million and in 2014 it was 1.2 million.', kind: 'weak', note: 'Liệt kê từng năm như đọc biểu đồ. Band 7 trở lên chọn điểm đầu, điểm cuối và chỗ thay đổi tốc độ.' },
            ],
          },
          {
            text: 'The number of tourists on cruise ships was only 0.3 million in 2010. It increased a little to 0.4 million in 2012 but then it decreased to 0.3 million in 2014. However, from 2014 the number grow very fast and it reached 2 million in 2020, so it was higher than the island tourists at the end of the period.',
            notes: [
              { quote: 'the number grow very fast', kind: 'weak', note: 'Sai thì: dữ liệu quá khứ dùng grew. "very fast" có thể thay bằng rose rapidly.' },
              { quote: 'higher than the island tourists', kind: 'weak', note: 'So sánh không cùng loại (con số với con người). Sửa: higher than the figure for island tourists.' },
              { quote: 'However, from 2014', kind: 'good', note: 'Có từ nối báo hiệu đổi xu hướng, giúp điểm Coherence.' },
            ],
          },
        ],
      },
      {
        band: 7,
        scores: [7, 7, 7, 7],
        verdict:
          'Overview rõ ràng, có so sánh, thông tin được nhóm theo xu hướng thay vì theo năm. Chưa lên band 8 vì từ vựng còn an toàn và lặp (rose, figure), cấu trúc câu chưa đa dạng nhiều.',
        paragraphs: [
          {
            text: 'The line graph compares the number of tourists who visited an island between 2010 and 2020, divided into those who stayed on the island and those who stayed on cruise ships.',
          },
          {
            text: 'Overall, visitor numbers in both categories rose over the decade. However, while the number of island-based tourists grew steadily, the cruise ship figure increased much more dramatically and was the higher of the two by the end of the period.',
            notes: [
              { quote: 'Overall, visitor numbers in both categories rose over the decade.', kind: 'good', note: 'Overview nêu xu hướng chung, không có số liệu.' },
              { quote: 'was the higher of the two by the end of the period', kind: 'good', note: 'Nêu được đặc điểm nổi bật nhất: tàu du lịch vượt lên.' },
            ],
          },
          {
            text: 'In 2010, 0.7 million tourists stayed on the island, more than twice as many as those on cruise ships (0.3 million). The island figure then rose consistently, reaching 1.5 million in 2016 and 1.8 million in 2020, although the rate of growth slowed in the final years.',
            notes: [
              { quote: 'more than twice as many as', kind: 'good', note: 'So sánh bằng bội số thay vì chỉ đưa hai con số.' },
              { quote: 'although the rate of growth slowed in the final years', kind: 'good', note: 'Nhận ra chi tiết tốc độ chậm lại, cho thấy biết chọn lọc.' },
              { quote: 'The island figure then rose consistently', kind: 'weak', note: 'Đúng nhưng an toàn: "rose" và "figure" lặp lại trong bài. Band 8 đa dạng từ hơn.' },
            ],
          },
          {
            text: 'Cruise ship numbers, by contrast, changed little at first, fluctuating between 0.3 and 0.4 million until 2014. After that, they climbed rapidly to 0.8 million in 2016 and 1.5 million in 2018, before overtaking the island figure to finish at 2 million in 2020.',
            notes: [
              { quote: 'changed little at first, fluctuating between 0.3 and 0.4 million until 2014', kind: 'good', note: 'Gom ba năm thành một ý thay vì liệt kê.' },
              { quote: 'before overtaking the island figure', kind: 'good', note: 'Dùng "before + V-ing" để nối hai giai đoạn trong một câu.' },
            ],
          },
        ],
      },
      {
        band: 8,
        scores: [8, 8, 8, 8],
        verdict:
          'Overview so sánh được "quỹ đạo" của hai nhóm, số liệu chọn lọc và gắn với nhận xét. Từ vựng chính xác và tự nhiên (negligible, trajectories, level off), câu phức đa dạng, liên kết bằng tham chiếu (This lead) thay vì chỉ dùng từ nối.',
        paragraphs: [
          {
            text: 'The line graph illustrates how many tourists visited a particular island over a ten-year period from 2010, distinguishing between visitors who stayed on the island itself and those who stayed on cruise ships.',
            notes: [{ quote: 'distinguishing between', kind: 'good', note: 'Paraphrase tự nhiên, không chép lại đề.' }],
          },
          {
            text: 'Overall, both forms of tourism became more popular, but their trajectories differed markedly. Island stays grew at a steady, gradually slowing pace, whereas cruise ship tourism remained negligible for several years before surging to become the more popular option by 2020.',
            notes: [
              { quote: 'their trajectories differed markedly', kind: 'good', note: 'Overview không chỉ nói "cùng tăng" mà chỉ ra sự khác biệt về cách tăng.' },
              { quote: 'remained negligible for several years before surging', kind: 'good', note: 'Từ vựng chính xác mô tả cả hai giai đoạn trong một cụm.' },
            ],
          },
          {
            text: 'At the start of the period, island accommodation was clearly preferred, attracting 0.7 million visitors compared with just 0.3 million on cruise ships. This lead widened over the next four years: the island figure climbed to 1.2 million by 2014, while cruise numbers barely moved, dipping back to 0.3 million after a minor rise.',
            notes: [
              { quote: 'This lead widened over the next four years:', kind: 'good', note: 'Liên kết bằng tham chiếu ("This lead") và dấu hai chấm để triển khai ý.' },
              { quote: 'barely moved, dipping back to 0.3 million after a minor rise', kind: 'good', note: 'Mô tả chính xác dao động nhỏ mà không liệt kê từng năm.' },
            ],
          },
          {
            text: 'From 2014 onwards, however, the pattern changed dramatically. Cruise visitors more than doubled to 0.8 million in 2016 and almost doubled again to 1.5 million two years later. Meanwhile, growth in island stays began to level off, reaching only 1.8 million in 2020, by which time cruise passengers had overtaken them at 2 million.',
            notes: [
              { quote: 'more than doubled to 0.8 million in 2016 and almost doubled again', kind: 'good', note: 'So sánh tốc độ tăng thay vì chỉ đưa số.' },
              { quote: 'by which time cruise passengers had overtaken them', kind: 'good', note: 'Mệnh đề quan hệ với "by which time" và quá khứ hoàn thành, dùng đúng và tự nhiên.' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'sample_t2_online_learning',
    task: 'task_2',
    questionId: 'wr_t2_education_001',
    title: 'Task 2 · Học trực tuyến có thay thế lớp học? (opinion)',
    essays: [
      {
        band: 6,
        scores: [6, 6, 6, 6],
        verdict:
          'Trả lời đúng đề, có ý ở cả hai phía và có ví dụ. Bị giữ ở band 6 vì quan điểm ở mở bài ("partly agree") không khớp kết bài, ý phát triển còn nông, từ vựng đơn giản và lặp, nhiều lỗi ngữ pháp nhỏ.',
        paragraphs: [
          {
            text: 'Nowadays, online learning is becoming more and more popular, and many universities now offer courses on the internet. Some people think that it will replace traditional classroom in the future. I partly agree with this opinion.',
            notes: [
              { quote: 'I partly agree with this opinion.', kind: 'weak', note: 'Quan điểm mơ hồ, và kết bài lại nói "không thay thế hoàn toàn", tức là không đồng ý. Thesis phải khớp với kết luận.' },
              { quote: 'traditional classroom in', kind: 'weak', note: 'Danh từ đếm được số ít cần mạo từ, hoặc dùng số nhiều: traditional classrooms.' },
            ],
          },
          {
            text: 'Firstly, online learning have many advantages. Students can study anywhere and anytime they want, they do not need to go to school. For example, my cousin study English online every night after work because he is very busy. Online learning also gives learners the chance to learn from many different teachers around the world. Moreover, online courses are usually cheaper than offline courses, so more people can afford it. This is why many people, especially workers and parents, choose online learning these days.',
            notes: [
              { quote: 'online learning have', kind: 'weak', note: 'Chủ ngữ số ít: online learning has.' },
              { quote: 'anytime they want, they do not need', kind: 'weak', note: 'Hai mệnh đề nối bằng dấu phẩy (comma splice). Dùng dấu chấm, hoặc "so they do not need".' },
              { quote: 'my cousin study English', kind: 'weak', note: 'Thiếu -s: my cousin studies. Ví dụ cá nhân được chấp nhận nhưng nên giải thích nó chứng minh điều gì.' },
              { quote: 'so more people can afford it', kind: 'weak', note: '"it" phải là "them" vì thay cho online courses.' },
            ],
          },
          {
            text: 'However, I think traditional classroom is still very important. Students can talk with teachers directly and ask questions immediately. Teachers can also see when students feel bored or confused and change their way of teaching. If they study online, sometimes the internet is slow and they can not understand the lesson. Some students also feel lazy at home because nobody checks their work. In addition, children need to go to school to make friends and learn how to work in a team. These skills are very important for their future jobs.',
            notes: [
              { quote: 'Students can talk with teachers directly and ask questions immediately.', kind: 'good', note: 'Ý đúng trọng tâm và liên quan trực tiếp đến đề.' },
              { quote: 'can not', kind: 'weak', note: 'Viết liền: cannot.' },
              { quote: 'These skills are very important for their future jobs.', kind: 'weak', note: '"very important" xuất hiện hai lần trong đoạn. Thử essential, vital, valuable.' },
            ],
          },
          {
            text: 'In conclusion, online learning has many benefits and it will become more popular. However, I do not think it will replace traditional classroom completely because students still need teachers and friends. In the future, I think schools will use both online and offline lessons together.',
            notes: [{ quote: 'because students still need teachers and friends', kind: 'weak', note: 'Tóm tắt quá đơn giản; nên nhắc lại hai lý do bằng từ ngữ học thuật hơn.' }],
          },
        ],
      },
      {
        band: 7,
        scores: [7, 7, 7, 7],
        verdict:
          'Quan điểm rõ từ đầu đến cuối, có nhượng bộ rồi phản bác, câu chủ đề rõ ràng, từ vựng học thuật phù hợp. Chưa lên band 8 vì ví dụ còn chung, một vài ý chưa được minh hoạ cụ thể.',
        paragraphs: [
          {
            text: 'It is often argued that the rapid growth of online education will eventually make traditional classrooms obsolete. Although I accept that digital learning has transformed access to education, I disagree that it will ever completely replace face-to-face teaching.',
            notes: [{ quote: 'I disagree that it will ever completely replace face-to-face teaching', kind: 'good', note: 'Thesis rõ ràng, có nhượng bộ ở mệnh đề Although.' }],
          },
          {
            text: 'Admittedly, online learning offers advantages that classrooms cannot match. Learners can study at their own pace and fit lessons around work or family commitments, which makes education accessible to people who would otherwise be excluded. In addition, online courses are often cheaper, and students in rural areas can now take courses from leading universities without having to relocate. For many adult learners, therefore, online study is not just convenient but essential.',
            notes: [
              { quote: 'Admittedly,', kind: 'good', note: 'Mở đoạn nhượng bộ: thừa nhận phía kia trước khi phản bác.' },
              { quote: 'which makes education accessible to people who would otherwise be excluded', kind: 'good', note: 'Câu phức có mệnh đề quan hệ và "would otherwise", dùng chính xác.' },
            ],
          },
          {
            text: 'Nevertheless, there are important aspects of learning that are difficult to reproduce on a screen. The most significant is the relationship between teachers and students. In a classroom, teachers can notice immediately when a student is confused or losing interest and adjust their explanation accordingly, whereas this is much harder through a video call. As a result, struggling students may fall behind without anyone noticing. Furthermore, schools are not only places where knowledge is transmitted; they also teach young people how to cooperate, resolve disagreements and build friendships. These social skills are largely developed through daily interaction with peers, which online platforms cannot fully provide. This is why I believe classrooms will continue to play a central role.',
            notes: [
              { quote: 'The most significant is the relationship between teachers and students.', kind: 'good', note: 'Câu chủ đề rõ, báo trước nội dung đoạn.' },
              { quote: 'whereas this is much harder through a video call', kind: 'weak', note: 'Ý đúng nhưng chỉ khẳng định, chưa có tình huống cụ thể. Band 8 sẽ minh hoạ bằng một ví dụ.' },
              { quote: 'not only places where knowledge is transmitted; they also teach', kind: 'good', note: 'Mở rộng ý bằng cấu trúc "not only … also" và dấu chấm phẩy.' },
            ],
          },
          {
            text: 'In conclusion, while online learning will undoubtedly continue to expand, particularly for adults, I believe that traditional classrooms will remain essential, especially for children, because of the personal guidance and social development they offer.',
            notes: [{ quote: 'because of the personal guidance and social development they offer', kind: 'good', note: 'Tóm tắt hai lý do chính bằng cụm danh từ gọn.' }],
          },
        ],
      },
      {
        band: 8,
        scores: [8, 8, 8, 8],
        verdict:
          'Lập trường tinh tế (bổ trợ chứ không thay thế), mỗi ý có ví dụ cụ thể và sống động, liên kết mượt bằng tham chiếu, từ vựng chính xác (equitable, redundant, replicate), ngữ pháp đa dạng gần như không lỗi.',
        paragraphs: [
          {
            text: 'The past decade has seen an explosion in online courses, leading some to predict that the traditional classroom will soon become a thing of the past. In my view, although digital learning will continue to reshape education, it is far more likely to complement classroom teaching than to replace it.',
            notes: [{ quote: 'it is far more likely to complement classroom teaching than to replace it', kind: 'good', note: 'Quan điểm có sắc thái, vẫn trả lời thẳng câu hỏi "to what extent".' }],
          },
          {
            text: 'There is no doubt that online education has removed many of the barriers that once restricted learning. A nurse working night shifts, for instance, can now complete a degree around their schedule, and a student in a remote province can attend lectures delivered by world-class academics. Since recorded lessons can be paused and replayed, learners also gain control over the pace of their studies, which particularly benefits those who need more time to absorb complex material. For these groups, the internet has made education genuinely more equitable.',
            notes: [
              { quote: 'A nurse working night shifts, for instance,', kind: 'good', note: 'Ví dụ cụ thể, dễ hình dung, thay cho "many people".' },
              { quote: 'For these groups,', kind: 'good', note: 'Câu kết đoạn quay lại ý chính bằng tham chiếu.' },
            ],
          },
          {
            text: 'However, the idea that screens will make classrooms redundant overlooks what schools actually do. Learning is not merely the transfer of information; it depends heavily on motivation and feedback, both of which are strongest in person. An experienced teacher can sense from a puzzled expression that an explanation has failed and immediately try another approach, something that is easily lost when twenty students appear as small boxes on a screen, many with their cameras switched off. Equally importantly, classrooms are where children learn to negotiate, collaborate and cope with disagreement. The widespread loneliness and loss of motivation reported by students during the school closures of 2020 illustrate how much of this depends on physical presence.',
            notes: [
              { quote: 'overlooks what schools actually do', kind: 'good', note: 'Câu chủ đề phản bác trực tiếp ý kiến trong đề.' },
              { quote: 'both of which are strongest in person', kind: 'good', note: 'Mệnh đề quan hệ "both of which" giúp liên kết chặt.' },
              { quote: 'something that is easily lost when twenty students appear as small boxes on a screen', kind: 'good', note: 'Hình ảnh cụ thể thay cho khẳng định chung chung.' },
              { quote: 'during the school closures of 2020', kind: 'good', note: 'Bằng chứng thực tế, không bịa số liệu.' },
            ],
          },
          {
            text: 'In conclusion, online learning has made education more flexible and accessible, but it cannot replicate the human interaction on which effective teaching and social development rely. The most realistic future is therefore a blended one, in which digital tools enrich, rather than replace, the classroom.',
            notes: [{ quote: 'a blended one, in which digital tools enrich, rather than replace, the classroom', kind: 'good', note: 'Kết bài khớp chính xác với thesis ở mở bài.' }],
          },
        ],
      },
    ],
  },
];
