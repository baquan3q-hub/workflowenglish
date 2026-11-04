/**
 * "Viết từng câu": IELTS answers split into sentences, each in Vietnamese and
 * at bands 6, 7 and 8, for the sentence-by-sentence translation drill
 * (services/writingTranslateLogic.ts). Written for this app.
 *
 * `traps` names the Vietnamese-to-English mistakes the sentence invites, so
 * the first hint can point at them before the learner writes.
 */
import type { TranslationSet } from '../../services/writingTranslateLogic';

export const TRANSLATION_SETS: readonly TranslationSet[] = [
  {
    id: 'tr_t2_online_learning',
    source: 'bundled',
    task: 'task_2',
    title: 'Task 2 · Học trực tuyến có thay thế lớp học? (opinion)',
    questionId: 'wr_t2_education_001',
    sampleSetId: 'sample_t2_online_learning',
    prompt: 'Some people believe that online learning will soon replace traditional classroom teaching. To what extent do you agree or disagree?',
    paragraphs: [
      {
        label: 'Mở bài',
        sentences: [
          {
            id: 's1',
            vi: 'Ngày nay, ngày càng nhiều trường đại học cung cấp các khoá học trực tuyến, và một số người tin rằng hình thức học này sẽ sớm thay thế lớp học truyền thống.',
            band6: 'Nowadays, more and more universities offer online courses, and some people believe that this kind of learning will soon replace traditional classrooms.',
            band7: 'An increasing number of universities now offer courses online, leading some people to believe that this form of learning will soon replace traditional classrooms.',
            band8: 'With a growing number of universities now delivering courses online, some argue that virtual learning will soon render the traditional classroom obsolete.',
            keys: [
              { en: 'an increasing number of', vi: 'ngày càng nhiều' },
              { en: 'leading some people to believe', vi: 'khiến một số người tin rằng' },
              { en: 'render ... obsolete', vi: 'khiến ... trở nên lỗi thời' },
            ],
            traps: ['plural_agreement', 'article'],
          },
          {
            id: 's2',
            vi: 'Tôi không đồng ý với quan điểm này, vì học trực tuyến khó có thể thay thế hoàn toàn sự tương tác trực tiếp giữa giáo viên và học sinh.',
            band6: 'I disagree with this view because online learning cannot completely replace the direct interaction between teachers and students.',
            band7: 'I disagree with this view, as online learning is unlikely to fully replace face-to-face interaction between teachers and students.',
            band8: 'I disagree, since online platforms are unlikely ever to fully replicate the face-to-face interaction between teachers and learners.',
            keys: [
              { en: 'be unlikely to', vi: 'khó có khả năng' },
              { en: 'face-to-face interaction', vi: 'tương tác trực tiếp' },
            ],
            traps: ['word_choice'],
          },
        ],
      },
      {
        label: 'Thân bài 1',
        sentences: [
          {
            id: 's3',
            vi: 'Phải thừa nhận rằng học trực tuyến mang lại nhiều lợi ích rõ ràng.',
            band6: 'It is true that online learning has many clear benefits.',
            band7: 'Admittedly, online learning offers a number of clear benefits.',
            band8: 'Admittedly, online learning offers some undeniable advantages.',
            keys: [
              { en: 'Admittedly,', vi: 'Phải thừa nhận rằng' },
              { en: 'offer benefits', vi: 'mang lại lợi ích' },
            ],
            traps: ['collocation'],
          },
          {
            id: 's4',
            vi: 'Người học có thể học bất cứ lúc nào và ở bất cứ đâu, điều này đặc biệt hữu ích cho những người vừa đi làm vừa đi học.',
            band6: 'Learners can study at any time and in any place, and this is very useful for people who work and study at the same time.',
            band7: 'Learners can study whenever and wherever they like, which is particularly useful for people who combine work and study.',
            band8: 'Learners can study at their own pace and on their own schedule, which is particularly valuable for those juggling work and study.',
            keys: [
              { en: 'which is particularly useful for', vi: 'điều này đặc biệt hữu ích cho' },
              { en: 'combine work and study', vi: 'vừa làm vừa học' },
            ],
            traps: ['sentence_structure'],
          },
          {
            id: 's5',
            vi: 'Ngoài ra, các khoá học trực tuyến thường rẻ hơn vì sinh viên không phải trả tiền đi lại hay tiền thuê nhà ở thành phố.',
            band6: 'In addition, online courses are often cheaper because students do not have to pay for travel or rent in the city.',
            band7: 'Online courses are also usually cheaper, since students do not have to pay for transport or accommodation in the city.',
            band8: 'Online courses also tend to be more affordable, as students avoid the cost of commuting or renting accommodation in a city.',
            keys: [
              { en: 'tend to be more affordable', vi: 'thường rẻ hơn' },
              { en: 'pay for accommodation', vi: 'trả tiền chỗ ở' },
            ],
            traps: ['preposition', 'article'],
          },
        ],
      },
      {
        label: 'Thân bài 2',
        sentences: [
          {
            id: 's6',
            vi: 'Tuy nhiên, lớp học truyền thống vẫn có những ưu điểm mà màn hình máy tính không thể thay thế.',
            band6: 'However, traditional classrooms still have advantages that a computer screen cannot replace.',
            band7: 'However, traditional classrooms still have strengths that cannot be replaced by a computer screen.',
            band8: 'Nevertheless, the traditional classroom retains strengths that no screen can replace.',
            keys: [
              { en: 'retain strengths', vi: 'vẫn giữ được ưu điểm' },
              { en: 'cannot be replaced by', vi: 'không thể bị thay thế bởi' },
            ],
            traps: ['sentence_structure'],
          },
          {
            id: 's7',
            vi: 'Khi học trực tiếp, giáo viên có thể nhận ra ngay khi học sinh gặp khó khăn và giải thích lại.',
            band6: 'When students study in class, teachers can see immediately when they have difficulty and explain again.',
            band7: 'In a classroom, teachers can notice immediately when students are struggling and explain the point again.',
            band8: 'In a physical classroom, teachers can spot at once when a student is struggling and adjust their explanation accordingly.',
            keys: [
              { en: 'be struggling', vi: 'đang gặp khó khăn' },
              { en: 'adjust ... accordingly', vi: 'điều chỉnh cho phù hợp' },
            ],
            traps: ['tense', 'plural_agreement'],
          },
          {
            id: 's8',
            vi: 'Học sinh cũng học được các kỹ năng xã hội như làm việc nhóm và giao tiếp thông qua các hoạt động hằng ngày ở trường.',
            band6: 'Students also learn social skills such as teamwork and communication through daily activities at school.',
            band7: 'Students also develop social skills such as teamwork and communication through everyday activities at school.',
            band8: 'Students also develop social skills such as teamwork and communication through the everyday routines of school life.',
            keys: [
              { en: 'develop social skills', vi: 'phát triển kỹ năng xã hội' },
              { en: 'such as', vi: 'như là' },
            ],
            traps: ['collocation'],
          },
          {
            id: 's9',
            vi: 'Ví dụ, trong đại dịch Covid-19, nhiều học sinh ở Việt Nam cảm thấy cô đơn và mất động lực khi phải học online trong nhiều tháng.',
            band6: 'For example, during the Covid-19 pandemic, many students in Vietnam felt lonely and lost motivation when they had to study online for many months.',
            band7: 'For example, during the Covid-19 pandemic, many Vietnamese students felt isolated and lost motivation when they had to study online for months.',
            band8: 'During the Covid-19 pandemic, for instance, many Vietnamese students reported feeling isolated and demotivated after months of remote learning.',
            keys: [
              { en: 'lose motivation', vi: 'mất động lực' },
              { en: 'remote learning', vi: 'học từ xa' },
            ],
            traps: ['tense'],
          },
        ],
      },
      {
        label: 'Kết bài',
        sentences: [
          {
            id: 's10',
            vi: 'Tóm lại, mặc dù học trực tuyến tiện lợi và tiết kiệm, tôi tin rằng nó sẽ không thay thế hoàn toàn lớp học truyền thống.',
            band6: 'In conclusion, although online learning is convenient and cheap, I believe that it will not completely replace traditional classrooms.',
            band7: 'In conclusion, although online learning is convenient and economical, I believe it will never completely replace traditional classrooms.',
            band8: 'In conclusion, while online learning is convenient and economical, I am convinced that it will complement rather than replace the traditional classroom.',
            keys: [
              { en: 'complement rather than replace', vi: 'bổ trợ chứ không thay thế' },
              { en: 'economical', vi: 'tiết kiệm' },
            ],
            traps: ['sentence_structure'],
          },
          {
            id: 's11',
            vi: 'Cách tốt nhất có lẽ là kết hợp cả hai hình thức để tận dụng ưu điểm của mỗi bên.',
            band6: 'The best way is probably to combine both types of learning to use the advantages of each one.',
            band7: 'The best approach is probably to combine the two so that learners can benefit from the strengths of each.',
            band8: 'The most effective approach is likely to be a blended model that draws on the strengths of both.',
            keys: [
              { en: 'a blended model', vi: 'mô hình kết hợp' },
              { en: 'draw on the strengths of', vi: 'tận dụng ưu điểm của' },
            ],
            traps: ['word_choice'],
          },
        ],
      },
    ],
  },
  {
    id: 'tr_t2_environment',
    source: 'bundled',
    task: 'task_2',
    title: 'Task 2 · Cá nhân hay chính phủ bảo vệ môi trường? (discussion)',
    prompt:
      'Some people think that individuals can do little to improve the environment and that only governments and large companies can make a real difference. Discuss both views and give your own opinion.',
    paragraphs: [
      {
        label: 'Mở bài',
        sentences: [
          {
            id: 's1',
            vi: 'Ô nhiễm môi trường đang trở thành một vấn đề nghiêm trọng ở nhiều quốc gia.',
            band6: 'Environmental pollution is becoming a serious problem in many countries.',
            band7: 'Environmental pollution is becoming an increasingly serious problem in many countries.',
            band8: 'Environmental degradation has become a pressing concern in many parts of the world.',
            keys: [
              { en: 'a pressing concern', vi: 'mối lo cấp bách' },
              { en: 'environmental degradation', vi: 'suy thoái môi trường' },
            ],
            traps: ['article'],
          },
          {
            id: 's2',
            vi: 'Một số người cho rằng chỉ chính phủ và các công ty lớn mới có thể tạo ra thay đổi, trong khi những người khác tin rằng mỗi cá nhân cũng có vai trò quan trọng.',
            band6: 'Some people think that only governments and big companies can make a difference, while others believe that every person also has an important role.',
            band7: 'Some people argue that only governments and large companies can make a real difference, while others believe that individuals also have an important role to play.',
            band8: 'While some argue that only governments and large corporations can make a meaningful difference, others contend that individuals have an equally important part to play.',
            keys: [
              { en: 'make a difference', vi: 'tạo ra thay đổi' },
              { en: 'have a role to play', vi: 'có vai trò' },
            ],
            traps: ['collocation', 'plural_agreement'],
          },
          {
            id: 's3',
            vi: 'Bài viết này sẽ thảo luận cả hai quan điểm trước khi đưa ra ý kiến của tôi.',
            band6: 'This essay will discuss both views before giving my opinion.',
            band7: 'This essay will discuss both views before giving my own opinion.',
            band8: 'This essay will examine both perspectives before presenting my own view.',
            keys: [
              { en: 'examine both perspectives', vi: 'xem xét cả hai quan điểm' },
              { en: 'before presenting', vi: 'trước khi đưa ra' },
            ],
            traps: ['word_form'],
          },
        ],
      },
      {
        label: 'Thân bài 1',
        sentences: [
          {
            id: 's4',
            vi: 'Một mặt, các chính phủ có quyền ban hành luật và đánh thuế những ngành công nghiệp gây ô nhiễm.',
            band6: 'On the one hand, governments have the power to make laws and put taxes on industries that cause pollution.',
            band7: 'On the one hand, governments have the power to pass laws and impose taxes on polluting industries.',
            band8: 'On the one hand, governments have the authority to pass legislation and impose taxes on polluting industries.',
            keys: [
              { en: 'pass laws', vi: 'ban hành luật' },
              { en: 'impose taxes on', vi: 'đánh thuế lên' },
            ],
            traps: ['collocation', 'preposition'],
          },
          {
            id: 's5',
            vi: 'Các công ty lớn cũng tạo ra phần lớn lượng khí thải, vì vậy chỉ một thay đổi nhỏ trong cách họ sản xuất cũng có tác động rất lớn.',
            band6: 'Big companies also produce most of the emissions, so even a small change in the way they make products has a very big effect.',
            band7: 'Large companies also produce the majority of emissions, so even a small change in how they manufacture goods can have a huge impact.',
            band8: 'Large corporations are also responsible for the bulk of emissions, so even a minor change in their production methods can have a far-reaching impact.',
            keys: [
              { en: 'the majority of', vi: 'phần lớn' },
              { en: 'have an impact', vi: 'có tác động' },
            ],
            traps: ['article', 'word_choice'],
          },
          {
            id: 's6',
            vi: 'Ví dụ, nếu một hãng ô tô chuyển sang sản xuất xe điện, hàng triệu người lái xe sẽ giảm khí thải mà không cần thay đổi thói quen.',
            band6: 'For example, if a car company changes to making electric cars, millions of drivers will reduce their emissions without changing their habits.',
            band7: 'For example, if a car manufacturer switches to electric vehicles, millions of drivers will cut their emissions without changing their habits.',
            band8: 'If a major car manufacturer switches to electric vehicles, for instance, millions of drivers will cut their emissions without altering their habits.',
            keys: [
              { en: 'switch to', vi: 'chuyển sang' },
              { en: 'cut emissions', vi: 'cắt giảm khí thải' },
            ],
            traps: ['tense', 'word_form'],
          },
        ],
      },
      {
        label: 'Thân bài 2',
        sentences: [
          {
            id: 's7',
            vi: 'Mặt khác, những hành động nhỏ của từng cá nhân, khi cộng lại, có thể tạo ra sự khác biệt đáng kể.',
            band6: 'On the other hand, the small actions of each person can make a big difference when they are added together.',
            band7: 'On the other hand, small actions by individuals can make a significant difference when they are added together.',
            band8: 'On the other hand, the small actions of individuals, taken together, can make a substantial difference.',
            keys: [
              { en: 'taken together', vi: 'khi cộng lại' },
              { en: 'a significant difference', vi: 'sự khác biệt đáng kể' },
            ],
            traps: ['sentence_structure'],
          },
          {
            id: 's8',
            vi: 'Nếu mỗi gia đình dùng túi vải khi đi chợ và tiết kiệm điện, lượng rác thải và năng lượng tiêu thụ sẽ giảm rõ rệt.',
            band6: 'If every family uses cloth bags at the market and saves electricity, the amount of waste and energy they use will go down a lot.',
            band7: 'If every household used cloth bags for shopping and saved electricity, the amount of waste and energy consumed would fall noticeably.',
            band8: 'If every household switched to reusable bags and cut its electricity use, both waste and energy consumption would fall markedly.',
            keys: [
              { en: 'energy consumption', vi: 'năng lượng tiêu thụ' },
              { en: 'fall noticeably', vi: 'giảm rõ rệt' },
            ],
            traps: ['plural_agreement', 'word_choice'],
          },
          {
            id: 's9',
            vi: 'Hơn nữa, người tiêu dùng có thể gây áp lực lên các công ty bằng cách chọn mua sản phẩm thân thiện với môi trường.',
            band6: 'Moreover, consumers can put pressure on companies by choosing to buy environmentally friendly products.',
            band7: 'Moreover, consumers can put pressure on companies by choosing environmentally friendly products.',
            band8: 'Consumers can also put pressure on businesses by favouring eco-friendly products.',
            keys: [
              { en: 'put pressure on', vi: 'gây áp lực lên' },
              { en: 'environmentally friendly', vi: 'thân thiện với môi trường' },
            ],
            traps: ['preposition', 'word_form'],
          },
        ],
      },
      {
        label: 'Kết bài',
        sentences: [
          {
            id: 's10',
            vi: 'Tóm lại, tôi cho rằng chính phủ và doanh nghiệp đóng vai trò lớn nhất, nhưng nỗ lực của cá nhân vẫn rất cần thiết.',
            band6: 'In conclusion, I think governments and businesses play the biggest role, but the efforts of individuals are still very important.',
            band7: 'In conclusion, I believe governments and businesses play the most important role, but individual efforts are still essential.',
            band8: 'In conclusion, although governments and businesses play the leading role, individual efforts remain indispensable.',
            keys: [
              { en: 'play the leading role', vi: 'đóng vai trò chính' },
              { en: 'remain indispensable', vi: 'vẫn không thể thiếu' },
            ],
            traps: ['word_choice'],
          },
        ],
      },
    ],
  },
  {
    id: 'tr_t1_commuting',
    source: 'bundled',
    task: 'task_1',
    title: 'Task 1 · Phương tiện đi làm năm 2000 và 2020 (bar chart)',
    prompt:
      'The bar chart below shows the percentage of workers in a city who travelled to work by car, by bus, by bicycle and on foot in 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    dataNote: 'Số liệu: ô tô 45% → 30% · xe buýt 25% → 35% · xe đạp 10% → 25% · đi bộ 20% → 10%',
    paragraphs: [
      {
        label: 'Mở bài',
        sentences: [
          {
            id: 's1',
            vi: 'Biểu đồ cột cho thấy tỉ lệ người lao động ở một thành phố đi làm bằng ô tô, xe buýt, xe đạp và đi bộ vào năm 2000 và năm 2020.',
            band6: 'The bar chart shows the percentage of workers in a city who went to work by car, bus, bicycle and on foot in 2000 and 2020.',
            band7: 'The bar chart illustrates the proportion of workers in a city who travelled to work by car, bus, bicycle and on foot in 2000 and 2020.',
            band8: "The bar chart compares the proportions of a city's workers who commuted by car, bus, bicycle and on foot in 2000 and 2020.",
            keys: [
              { en: 'the proportion of', vi: 'tỉ lệ' },
              { en: 'commute by', vi: 'đi làm bằng' },
            ],
            traps: ['preposition'],
          },
        ],
      },
      {
        label: 'Tổng quan',
        sentences: [
          {
            id: 's2',
            vi: 'Nhìn chung, xe buýt và xe đạp trở nên phổ biến hơn, trong khi ngày càng ít người lái ô tô hoặc đi bộ đi làm.',
            band6: 'Overall, buses and bicycles became more popular, while fewer people drove or walked to work.',
            band7: 'Overall, buses and cycling became more popular, whereas fewer people drove or walked to work.',
            band8: 'Overall, bus travel and cycling gained popularity over the period, while driving and walking declined.',
            keys: [
              { en: 'gain popularity', vi: 'trở nên phổ biến hơn' },
              { en: 'over the period', vi: 'trong cả giai đoạn' },
            ],
            traps: ['tense'],
          },
        ],
      },
      {
        label: 'Thân bài 1',
        sentences: [
          {
            id: 's3',
            vi: 'Năm 2000, ô tô là phương tiện phổ biến nhất, chiếm 45% tổng số người đi làm.',
            band6: 'In 2000, the car was the most popular way to travel, with 45% of all workers.',
            band7: 'In 2000, the car was the most popular means of transport, accounting for 45% of all commuters.',
            band8: 'In 2000, the car was by far the most common mode of transport, accounting for 45% of all commuters.',
            keys: [
              { en: 'account for', vi: 'chiếm (bao nhiêu phần trăm)' },
              { en: 'mode of transport', vi: 'phương tiện đi lại' },
            ],
            traps: ['word_choice'],
          },
          {
            id: 's4',
            vi: 'Tuy nhiên, đến năm 2020, con số này đã giảm xuống còn 30%.',
            band6: 'However, by 2020, this number had decreased to 30%.',
            band7: 'By 2020, however, this figure had fallen to 30%.',
            band8: 'By 2020, however, this figure had dropped by a third, to 30%.',
            keys: [
              { en: 'this figure', vi: 'con số này' },
              { en: 'had fallen to', vi: 'đã giảm xuống còn' },
            ],
            traps: ['tense', 'preposition'],
          },
          {
            id: 's5',
            vi: 'Ngược lại, tỉ lệ người đi xe buýt tăng từ 25% lên 35%, khiến xe buýt trở thành lựa chọn phổ biến nhất.',
            band6: 'In contrast, the percentage of people who took the bus rose from 25% to 35%, so the bus became the most popular choice.',
            band7: 'In contrast, the proportion of bus users rose from 25% to 35%, making the bus the most popular option.',
            band8: 'Bus use, by contrast, climbed from 25% to 35%, making it the most popular option by 2020.',
            keys: [
              { en: 'rise from ... to', vi: 'tăng từ ... lên' },
              { en: 'making X the most popular', vi: 'khiến X phổ biến nhất' },
            ],
            traps: ['preposition', 'sentence_structure'],
          },
        ],
      },
      {
        label: 'Thân bài 2',
        sentences: [
          {
            id: 's6',
            vi: 'Tỉ lệ người đi xe đạp tăng mạnh nhất, từ 10% lên 25%.',
            band6: 'The percentage of people who cycled increased the most, from 10% to 25%.',
            band7: 'Cycling saw the largest increase, rising from 10% to 25%.',
            band8: 'Cycling saw the most dramatic growth, rising two and a half times from 10% to 25%.',
            keys: [
              { en: 'saw the largest increase', vi: 'tăng mạnh nhất' },
              { en: 'rising from', vi: 'tăng từ' },
            ],
            traps: ['sentence_structure'],
          },
          {
            id: 's7',
            vi: 'Trong khi đó, tỉ lệ người đi bộ đi làm giảm một nửa, từ 20% xuống còn 10%.',
            band6: 'Meanwhile, the percentage of people who walked to work decreased by half, from 20% to 10%.',
            band7: 'Meanwhile, the proportion of people walking to work halved, falling from 20% to 10%.',
            band8: 'Meanwhile, the share of commuters travelling on foot halved, from 20% to 10%.',
            keys: [
              { en: 'halve', vi: 'giảm một nửa' },
              { en: 'the share of', vi: 'tỉ lệ' },
            ],
            traps: ['preposition', 'word_form'],
          },
          {
            id: 's8',
            vi: 'Đến năm 2020, xe buýt và ô tô vẫn là hai phương tiện được dùng nhiều nhất, chiếm tổng cộng 65% số người đi làm.',
            band6: 'In 2020, the bus and the car were still the two most used types of transport, with 65% of workers in total.',
            band7: 'In 2020, buses and cars remained the two most widely used forms of transport, together accounting for 65% of commuters.',
            band8: 'Even so, buses and cars remained the two dominant modes of transport in 2020, together accounting for almost two thirds of commuters.',
            keys: [
              { en: 'remain', vi: 'vẫn là' },
              { en: 'together accounting for', vi: 'chiếm tổng cộng' },
            ],
            traps: ['word_choice'],
          },
        ],
      },
    ],
  },
];
