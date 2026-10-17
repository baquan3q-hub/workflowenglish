/**
 * How to write each IELTS Writing question type: paragraph plan, sentence
 * patterns, useful language and common mistakes. Written for this app; shown
 * in the Writing study screen, the Library and next to the practice editor.
 */

import type { IeltsWritingTask } from '../../types';

export interface GuideStep {
  label: string;
  detail: string;
}

export interface WritingGuide {
  id: string;
  task: IeltsWritingTask;
  /** `questionType` values of bank questions this guide covers. */
  questionTypes: string[];
  title: string;
  summary: string;
  /** How to tell this type from the prompt. */
  recognise: string;
  structure: GuideStep[];
  templates: string[];
  language?: { heading: string; items: string[] };
  mistakes: string[];
  example?: string;
}

export const WRITING_GUIDES: readonly WritingGuide[] = [
  // ─── Task 1 ───────────────────────────────────────────────────────
  {
    id: 'line_graph',
    task: 'task_1',
    questionTypes: ['line_graph'],
    title: 'Biểu đồ đường (Line graph)',
    summary: 'Mô tả thay đổi theo thời gian: xu hướng chung, điểm cao nhất, điểm giao nhau.',
    recognise: 'Có trục thời gian (năm, tháng) và một hoặc nhiều đường. Trọng tâm là sự thay đổi, không phải từng con số.',
    structure: [
      { label: 'Mở bài', detail: 'Paraphrase đề: biểu đồ cho thấy gì, ở đâu, khoảng thời gian nào. 1 câu.' },
      { label: 'Overview', detail: 'Xu hướng chung của các đường và đường nào cao nhất hoặc thay đổi nhiều nhất. Không có số liệu.' },
      { label: 'Thân bài 1', detail: 'Nửa đầu giai đoạn, hoặc nhóm các đường có cùng xu hướng. Có số liệu và so sánh.' },
      { label: 'Thân bài 2', detail: 'Nửa sau giai đoạn, hoặc nhóm đường còn lại. Nêu điểm cao nhất, thấp nhất, chỗ giao nhau.' },
    ],
    templates: [
      'The line graph illustrates changes in [what] in [where] between [year] and [year].',
      'Overall, [A] rose significantly over the period, while [B] remained relatively stable.',
      '[A] started at [number] in [year] and then climbed steadily to reach a peak of [number] in [year].',
      'By contrast, [B] fell sharply from [number] to [number] over the same period.',
      'In [year], [A] overtook [B] for the first time.',
    ],
    language: {
      heading: 'Từ mô tả xu hướng',
      items: [
        'Tăng: rise, increase, grow, climb; mạnh: surge, soar, rocket',
        'Giảm: fall, decrease, decline, drop; mạnh: plummet, plunge',
        'Ổn định: remain stable, stay constant, level off, plateau',
        'Dao động: fluctuate, fluctuation, there were fluctuations in',
        'Mức độ: dramatically, sharply, significantly > steadily, gradually > slightly, marginally',
        'Đỉnh và đáy: reach a peak of, hit a high of, hit a low of, bottom out at',
      ],
    },
    mistakes: [
      'Liệt kê từng năm một mà không nhóm thông tin.',
      'Dùng sai thì: dữ liệu quá khứ dùng quá khứ đơn; dự báo tương lai dùng "is predicted to", "is expected to".',
      'Sai giới từ với số: "rose to 50%" (đạt tới), "rose by 10%" (tăng thêm), "from 20% to 30%".',
      'Quên overview hoặc đặt số liệu vào overview.',
    ],
    example:
      'Overall, the number of visitors staying on cruise ships increased dramatically, eventually overtaking those staying on the island, whose numbers grew more steadily.',
  },
  {
    id: 'bar_chart',
    task: 'task_1',
    questionTypes: ['bar_chart'],
    title: 'Biểu đồ cột (Bar chart)',
    summary: 'So sánh các hạng mục: nhóm cột theo điểm giống và khác nhau thay vì mô tả từng cột.',
    recognise: 'Các cột đứng hoặc nằm ngang. Có thể là so sánh tĩnh (một thời điểm) hoặc theo nhiều năm.',
    structure: [
      { label: 'Mở bài', detail: 'Biểu đồ so sánh cái gì, giữa những nhóm nào, năm nào.' },
      { label: 'Overview', detail: 'Hạng mục cao nhất và thấp nhất, hoặc xu hướng chung nếu có nhiều năm.' },
      { label: 'Thân bài 1', detail: 'Nhóm hạng mục nổi bật (cao nhất, tăng mạnh nhất) kèm số liệu.' },
      { label: 'Thân bài 2', detail: 'Các hạng mục còn lại, so sánh với nhóm đầu.' },
    ],
    templates: [
      'The bar chart compares [what] in [groups] in [year] and [year].',
      'Overall, [A] had the highest [x] in both years, whereas [B] recorded the lowest.',
      '[A] accounted for [number], roughly twice as much as [B].',
      'The figure for [A] was [number], compared with only [number] for [B].',
      'While [A] saw a marked increase, [B] showed little change.',
    ],
    language: {
      heading: 'So sánh và tỉ lệ',
      items: [
        'twice / three times as many as, half as much as',
        'slightly higher than, considerably lower than, the same as',
        'the highest / the second highest / the lowest',
        'the figure for, the proportion of, the number of (đếm được), the amount of (không đếm được)',
      ],
    },
    mistakes: [
      'Mô tả lần lượt từng cột từ trái sang phải như đọc biểu đồ.',
      'Nhầm "the number of" (đếm được) với "the amount of" (không đếm được).',
      'Chỉ đưa số liệu mà không so sánh: band Task Achievement đòi hỏi "make comparisons".',
    ],
  },
  {
    id: 'pie_chart',
    task: 'task_1',
    questionTypes: ['pie_chart'],
    title: 'Biểu đồ tròn (Pie chart)',
    summary: 'Mô tả tỉ lệ phần trăm: phần lớn nhất, phần nhỏ nhất và sự thay đổi giữa các biểu đồ.',
    recognise: 'Một hoặc nhiều hình tròn chia phần, tổng là 100%. Nhiều biểu đồ thường là các năm hoặc nhóm khác nhau.',
    structure: [
      { label: 'Mở bài', detail: 'Các biểu đồ cho thấy tỉ lệ của cái gì, theo năm hoặc nhóm nào.' },
      { label: 'Overview', detail: 'Phần chiếm tỉ trọng lớn nhất và thay đổi đáng kể nhất.' },
      { label: 'Thân bài 1', detail: 'Các phần lớn, kèm phần trăm và thay đổi.' },
      { label: 'Thân bài 2', detail: 'Các phần nhỏ hơn, gom nhóm nếu có thể.' },
    ],
    templates: [
      'The pie charts show the proportion of [what] in [year] and [year].',
      'Overall, [A] made up the largest share in both years, while [B] was the smallest category.',
      '[A] accounted for just over a third of [total] ([number]%).',
      'The share of [B] doubled from [number]% to [number]%.',
    ],
    language: {
      heading: 'Diễn đạt tỉ lệ',
      items: [
        'account for, make up, represent, comprise',
        '50% = a half; 25% = a quarter; 33% = a third; 75% = three quarters',
        'just over / just under / nearly / approximately / roughly',
        'the majority of, a minority of, a small fraction of',
      ],
    },
    mistakes: [
      'Lặp lại "percent" quá nhiều: hãy luân phiên với phân số và "proportion", "share".',
      'Viết "the percentage of A is 20%" ở mọi câu; nên đổi cấu trúc câu.',
      'Không chỉ ra phần nào lớn nhất ở overview.',
    ],
  },
  {
    id: 'table',
    task: 'task_1',
    questionTypes: ['table'],
    title: 'Bảng số liệu (Table)',
    summary: 'Nhiều số liệu nhất trong các dạng: chọn lọc, đừng đưa hết vào bài.',
    recognise: 'Hàng và cột chứa số. Thường có 4–6 hạng mục và 2–4 năm hoặc chỉ số.',
    structure: [
      { label: 'Mở bài', detail: 'Bảng đưa ra thông tin gì, về những nhóm nào.' },
      { label: 'Overview', detail: 'Hạng mục cao nhất, thấp nhất hoặc xu hướng chung của cả bảng.' },
      { label: 'Thân bài 1', detail: 'Theo hàng hoặc cột nổi bật nhất, kèm số liệu chọn lọc.' },
      { label: 'Thân bài 2', detail: 'Phần còn lại, nhấn mạnh điểm khác thường.' },
    ],
    templates: [
      'The table gives information about [what] in [groups].',
      'Overall, [A] was by far the most [x], while [B] ranked lowest in every category.',
      'In terms of [criterion], [A] led with [number], followed by [B] at [number].',
      'At the other end of the scale, [C] recorded just [number].',
    ],
    mistakes: [
      'Cố đưa tất cả số liệu vào bài: chỉ chọn số lớn nhất, nhỏ nhất, khác thường.',
      'Viết quá 200 từ vì chép số: Task 1 chỉ cần 170–190 từ.',
      'Không nhóm theo hàng hoặc cột nên bài bị rời rạc.',
    ],
  },
  {
    id: 'map',
    task: 'task_1',
    questionTypes: ['map'],
    title: 'Bản đồ (Map)',
    summary: 'Mô tả thay đổi của một địa điểm: cái gì được xây, bị dỡ bỏ, mở rộng hay giữ nguyên.',
    recognise: 'Hai bản đồ cùng một nơi ở hai thời điểm, hoặc một bản đồ với các phương án xây dựng.',
    structure: [
      { label: 'Mở bài', detail: 'Bản đồ cho thấy nơi nào, thay đổi giữa năm nào và năm nào.' },
      { label: 'Overview', detail: 'Thay đổi lớn nhất: nơi trở nên hiện đại, đô thị hoá hay mất đi không gian xanh.' },
      { label: 'Thân bài 1', detail: 'Thay đổi ở một khu vực (phía Bắc, trung tâm), dùng từ chỉ hướng.' },
      { label: 'Thân bài 2', detail: 'Khu vực còn lại và những gì giữ nguyên.' },
    ],
    templates: [
      'The maps illustrate the changes that took place in [place] between [year] and [year].',
      'Overall, [place] was transformed from a rural area into a residential district.',
      'The forest to the north of the village was cleared to make way for a housing estate.',
      'The main road was extended, and a new bridge was built across the river.',
      'The school remained in the same position, although it was enlarged.',
    ],
    language: {
      heading: 'Bị động và vị trí',
      items: [
        'was built / constructed / replaced / demolished / converted into / expanded / relocated',
        'in the north-east of, to the south of, next to, opposite, alongside, between',
        'make way for, give way to, be replaced by',
      ],
    },
    mistakes: [
      'Dùng chủ động "they built": nên dùng bị động vì người làm không quan trọng.',
      'Nhầm "in the north of" (bên trong khu vực) với "to the north of" (bên ngoài, ở phía bắc).',
      'Mô tả không theo trật tự không gian, người đọc khó hình dung.',
    ],
  },
  {
    id: 'process',
    task: 'task_1',
    questionTypes: ['process'],
    title: 'Quy trình (Process)',
    summary: 'Mô tả các bước theo thứ tự, dùng bị động và từ nối trình tự.',
    recognise: 'Sơ đồ có mũi tên nối các bước: sản xuất (nhân tạo) hoặc vòng đời (tự nhiên).',
    structure: [
      { label: 'Mở bài', detail: 'Sơ đồ mô tả quá trình gì.' },
      { label: 'Overview', detail: 'Có bao nhiêu bước, bắt đầu từ đâu và kết thúc bằng gì; có phải vòng tuần hoàn không.' },
      { label: 'Thân bài 1', detail: 'Nửa đầu các bước.' },
      { label: 'Thân bài 2', detail: 'Nửa sau các bước cho đến sản phẩm cuối.' },
    ],
    templates: [
      'The diagram illustrates how [product] is made / the life cycle of [animal].',
      'Overall, there are [number] stages in the process, beginning with [x] and ending with [y].',
      'First, [raw material] is collected and transported to [place].',
      'Once [x] has been [done], it is then [done].',
      'Finally, the [product] is packaged and delivered to [place].',
    ],
    language: {
      heading: 'Từ trình tự',
      items: [
        'First / To begin with, Next / Then / After that / Subsequently, Finally / In the final stage',
        'Once / After / As soon as + mệnh đề; before being + V3',
        'which is then + V3 (nối hai bước trong một câu)',
      ],
    },
    mistakes: [
      'Dùng chủ động cho quy trình sản xuất ("workers cut the wood").',
      'Bỏ sót bước hoặc thay đổi thứ tự.',
      'Overview không nêu số bước hoặc điểm đầu và cuối.',
    ],
  },
  {
    id: 'mixed_charts',
    task: 'task_1',
    questionTypes: ['mixed_charts'],
    title: 'Biểu đồ kết hợp (Mixed charts)',
    summary: 'Hai loại biểu đồ trong cùng đề: mỗi thân bài một biểu đồ, overview nêu ý chính của cả hai.',
    recognise: 'Hai hình khác loại, ví dụ một biểu đồ đường và một biểu đồ tròn, cùng một chủ đề.',
    structure: [
      { label: 'Mở bài', detail: 'Paraphrase cả hai biểu đồ trong một câu.' },
      { label: 'Overview', detail: 'Một ý chính cho mỗi biểu đồ, nối bằng "while" hoặc "and".' },
      { label: 'Thân bài 1', detail: 'Biểu đồ thứ nhất.' },
      { label: 'Thân bài 2', detail: 'Biểu đồ thứ hai, liên hệ với biểu đồ thứ nhất nếu có thể.' },
    ],
    templates: [
      'The line graph shows [x], while the pie chart illustrates [y].',
      'Overall, [main point of chart 1], and [main point of chart 2].',
      'Turning to the pie chart, [A] accounted for the largest share.',
    ],
    mistakes: [
      'Dành quá nhiều từ cho một biểu đồ và bỏ quên biểu đồ còn lại.',
      'Overview chỉ nói về một biểu đồ.',
      'Không có câu chuyển ý rõ ràng giữa hai phần.',
    ],
  },

  // ─── Task 2 ───────────────────────────────────────────────────────
  {
    id: 'opinion',
    task: 'task_2',
    questionTypes: ['opinion'],
    title: 'Nêu quan điểm (Opinion)',
    summary: 'Đồng ý hay không đồng ý: chọn một lập trường rõ và giữ nó xuyên suốt bài.',
    recognise: '"To what extent do you agree or disagree?", "Do you agree or disagree?"',
    structure: [
      { label: 'Mở bài', detail: 'Paraphrase đề, sau đó câu thesis nêu rõ quan điểm (đồng ý hoàn toàn, một phần, hay phản đối).' },
      { label: 'Thân bài 1', detail: 'Lý do chính thứ nhất: câu chủ đề, giải thích, ví dụ cụ thể.' },
      { label: 'Thân bài 2', detail: 'Lý do thứ hai, hoặc nêu ý kiến ngược lại rồi phản bác.' },
      { label: 'Kết bài', detail: 'Nhắc lại quan điểm bằng cách diễn đạt khác và tóm tắt hai lý do.' },
    ],
    templates: [
      'I completely agree that [x], because [reason 1] and [reason 2].',
      'While I accept that [opposing view], I believe that [your view].',
      'The main reason I hold this view is that [reason].',
      'Admittedly, [counter-argument]. However, [rebuttal].',
      'In conclusion, I firmly believe that [restated view].',
    ],
    mistakes: [
      'Không nêu quan điểm ở mở bài, hoặc thay đổi quan điểm giữa bài.',
      'Viết như bài Discussion: trình bày hai phía ngang nhau mà không chọn bên.',
      'Ví dụ chung chung ("many people think") thay vì cụ thể.',
    ],
    example: 'Some people believe that online learning will replace classrooms. While I accept that it offers flexibility, I disagree that it will ever fully replace face-to-face teaching.',
  },
  {
    id: 'discussion',
    task: 'task_2',
    questionTypes: ['discussion'],
    title: 'Thảo luận hai quan điểm (Discussion)',
    summary: 'Trình bày cả hai phía công bằng, sau đó nêu ý kiến của bạn nếu đề yêu cầu.',
    recognise: '"Discuss both views and give your own opinion."',
    structure: [
      { label: 'Mở bài', detail: 'Giới thiệu hai quan điểm và cho biết bạn nghiêng về phía nào.' },
      { label: 'Thân bài 1', detail: 'Quan điểm thứ nhất: vì sao một số người nghĩ vậy, ví dụ.' },
      { label: 'Thân bài 2', detail: 'Quan điểm thứ hai, thường là phía bạn đồng ý, kèm lý do mạnh hơn.' },
      { label: 'Kết bài', detail: 'Tóm tắt hai phía và khẳng định ý kiến của bạn.' },
    ],
    templates: [
      'While some argue that [view A], others believe that [view B].',
      'This essay will discuss both views before explaining why I support the latter.',
      'Those who favour [A] point out that [reason].',
      'On the other hand, supporters of [B] claim that [reason].',
      'Having considered both sides, I am convinced that [your view].',
    ],
    mistakes: [
      'Quên nêu ý kiến cá nhân: mất điểm Task Response.',
      'Viết ý kiến của mình vào cả hai thân bài khiến bài lẫn lộn.',
      'Một phía được phát triển kỹ, phía kia chỉ một câu.',
    ],
  },
  {
    id: 'advantages_disadvantages',
    task: 'task_2',
    questionTypes: ['advantages_disadvantages', 'positive_negative'],
    title: 'Ưu điểm và nhược điểm',
    summary: 'Đọc kỹ đề hỏi gì: chỉ liệt kê, hay hỏi "lợi nhiều hơn hại không" (cần quan điểm).',
    recognise: '"What are the advantages and disadvantages?", "Do the advantages outweigh the disadvantages?", "Is this a positive or negative development?"',
    structure: [
      { label: 'Mở bài', detail: 'Paraphrase đề. Nếu đề hỏi "outweigh" hoặc "positive or negative", nêu ngay câu trả lời.' },
      { label: 'Thân bài 1', detail: 'Ưu điểm (hoặc mặt tích cực): 1–2 ý có giải thích và ví dụ.' },
      { label: 'Thân bài 2', detail: 'Nhược điểm (hoặc mặt tiêu cực), viết dài hơn nếu đây là phía bạn cho là nặng hơn.' },
      { label: 'Kết bài', detail: 'Tóm tắt và, khi đề hỏi, kết luận phía nào lớn hơn.' },
    ],
    templates: [
      'The most significant benefit of [x] is that [reason].',
      'Another advantage is that [reason], which means [result].',
      'However, [x] also has a number of drawbacks.',
      'In my view, the benefits of [x] far outweigh its drawbacks, because [reason].',
      'Overall, I consider this to be a largely positive development.',
    ],
    mistakes: [
      'Đề hỏi "outweigh" nhưng không nói phía nào lớn hơn.',
      'Liệt kê quá nhiều ý ngắn thay vì phát triển sâu 2 ý mỗi đoạn.',
      'Dùng "advantage" cho mọi câu: đổi sang benefit, merit, drawback, downside.',
    ],
  },
  {
    id: 'problem_solution',
    task: 'task_2',
    questionTypes: ['problem_solution'],
    title: 'Vấn đề và giải pháp',
    summary: 'Mỗi giải pháp phải khớp với một vấn đề đã nêu, và cần nói rõ ai làm, làm thế nào.',
    recognise: '"What problems does this cause? What solutions can you suggest?", "What measures could be taken?"',
    structure: [
      { label: 'Mở bài', detail: 'Paraphrase tình huống, nêu bài sẽ phân tích vấn đề và đề xuất giải pháp.' },
      { label: 'Thân bài 1', detail: 'Hai vấn đề chính, mỗi vấn đề có nguyên nhân hoặc hậu quả cụ thể.' },
      { label: 'Thân bài 2', detail: 'Giải pháp cho từng vấn đề: ai thực hiện (chính phủ, trường học, cá nhân) và cách làm.' },
      { label: 'Kết bài', detail: 'Tóm tắt vấn đề và giải pháp chính.' },
    ],
    templates: [
      'One major problem associated with [x] is [problem], which leads to [consequence].',
      'A further issue is that [problem].',
      'To tackle this, governments should [action], for example by [specific measure].',
      'Another effective measure would be to [action].',
      'If these steps were taken, [positive result].',
    ],
    mistakes: [
      'Giải pháp chung chung: "the government should do something".',
      'Giải pháp không liên quan đến vấn đề đã nêu.',
      'Nêu quá nhiều vấn đề mà không giải thích.',
    ],
  },
  {
    id: 'cause_effect',
    task: 'task_2',
    questionTypes: ['cause_effect'],
    title: 'Nguyên nhân và hệ quả',
    summary: 'Giải thích vì sao một hiện tượng xảy ra và nó ảnh hưởng đến ai, như thế nào.',
    recognise: '"What are the causes of this? What effects does it have?", "Why is this happening?"',
    structure: [
      { label: 'Mở bài', detail: 'Paraphrase hiện tượng và nói bài sẽ phân tích nguyên nhân và hệ quả.' },
      { label: 'Thân bài 1', detail: 'Hai nguyên nhân chính, mỗi nguyên nhân có giải thích và ví dụ.' },
      { label: 'Thân bài 2', detail: 'Hai hệ quả, nói rõ ai bị ảnh hưởng (cá nhân, gia đình, xã hội).' },
      { label: 'Kết bài', detail: 'Tóm tắt; có thể thêm một câu dự đoán hoặc đề xuất ngắn.' },
    ],
    templates: [
      'There are several reasons why [x] is becoming more common.',
      'The primary cause is [cause], as [explanation].',
      'This trend has had a number of serious consequences.',
      'As a result, [effect]. Consequently, [further effect].',
      '[x] has led to / resulted in / contributed to [effect].',
    ],
    language: {
      heading: 'Từ chỉ nguyên nhân và kết quả',
      items: [
        'Nguyên nhân: because of, due to, owing to, stem from, be attributed to',
        'Kết quả: result in, lead to, give rise to, contribute to, as a result, consequently',
      ],
    },
    mistakes: [
      'Nhầm nguyên nhân với hệ quả, hoặc viết cả hai lẫn lộn trong một đoạn.',
      'Nhầm "result in" (dẫn đến) với "result from" (bắt nguồn từ).',
      'Bỏ qua một nửa đề, ví dụ chỉ viết nguyên nhân.',
    ],
  },
  {
    id: 'two_part',
    task: 'task_2',
    questionTypes: ['two_part'],
    title: 'Đề hai câu hỏi (Two-part)',
    summary: 'Hai câu hỏi riêng biệt: mỗi thân bài trả lời trực tiếp một câu.',
    recognise: 'Đề kết thúc bằng hai câu hỏi, ví dụ "Why is this the case? Is it a positive development?"',
    structure: [
      { label: 'Mở bài', detail: 'Paraphrase đề và trả lời ngắn gọn cả hai câu hỏi.' },
      { label: 'Thân bài 1', detail: 'Trả lời đầy đủ câu hỏi thứ nhất.' },
      { label: 'Thân bài 2', detail: 'Trả lời đầy đủ câu hỏi thứ hai.' },
      { label: 'Kết bài', detail: 'Tóm tắt câu trả lời cho cả hai câu hỏi.' },
    ],
    templates: [
      'This essay will explain why [x] and argue that this is a [positive/negative] trend.',
      'There are two main reasons why [x].',
      'As for whether this is a positive development, I believe that [view].',
    ],
    mistakes: [
      'Trả lời một câu hỏi quá dài, câu còn lại chỉ vài dòng.',
      'Viết theo khung Opinion thông thường mà bỏ sót một câu hỏi.',
      'Câu trả lời ở kết bài khác với mở bài.',
    ],
  },
];

export function guideForQuestionType(questionType: string): WritingGuide | undefined {
  return WRITING_GUIDES.find((g) => g.questionTypes.includes(questionType));
}
