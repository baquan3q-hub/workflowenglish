import { IeltsFramework } from '../types';

export const ieltsFrameworks: IeltsFramework[] = [
  // ─── Writing Frameworks ──────────────────────────────
  {
    id: 'fw_opinion_essay',
    skill: 'writing',
    name: 'Opinion Essay (Agree/Disagree)',
    nameVi: 'Bài luận ý kiến (Đồng ý/Không đồng ý)',
    description: 'Use this framework when the question asks: "To what extent do you agree or disagree?" or "Do the advantages outweigh the disadvantages?"',
    descriptionVi: 'Sử dụng khi đề bài hỏi: "Bạn đồng ý hay không đồng ý ở mức nào?" hoặc "Ưu điểm có vượt trội hơn nhược điểm không?"',
    steps: [
      { label: 'Introduction', detail: 'Paraphrase the topic + state your clear opinion' },
      { label: 'Body 1', detail: 'First reason + explanation + specific example (PEEL)' },
      { label: 'Body 2', detail: 'Second reason + explanation + specific example (PEEL)' },
      { label: 'Conclusion', detail: 'Restate your opinion + summarise main reasons' },
    ],
    sample: `Introduction: [Paraphrase topic]. I strongly believe that [your opinion].

Body 1: One major reason is that [reason 1]. This means that [explanation]. For example, [specific example]. Therefore, [link back to opinion].

Body 2: Another important reason is that [reason 2]. This is because [explanation]. For instance, [specific example]. As a result, [link back].

Conclusion: In conclusion, I firmly believe that [restate opinion] because [summarise reason 1] and [summarise reason 2].`,
  },
  {
    id: 'fw_discussion_essay',
    skill: 'writing',
    name: 'Discussion Essay',
    nameVi: 'Bài luận thảo luận 2 quan điểm',
    description: 'Use when the question asks: "Discuss both views and give your own opinion."',
    descriptionVi: 'Sử dụng khi đề bài yêu cầu thảo luận cả hai quan điểm rồi đưa ra ý kiến riêng.',
    steps: [
      { label: 'Introduction', detail: 'Paraphrase + mention both views + briefly state your opinion' },
      { label: 'Body 1 – View 1', detail: 'Explain the first view + reason + example' },
      { label: 'Body 2 – View 2 + Opinion', detail: 'Explain the second view + state which you agree with + example' },
      { label: 'Conclusion', detail: 'Summarise both sides + restate your opinion' },
    ],
    sample: `Introduction: [Topic] is a matter of debate. Some people argue that [view 1], while others believe [view 2]. In my opinion, [your view].

Body 1: On the one hand, those who support [view 1] argue that [reason]. For example, [example].

Body 2: On the other hand, others contend that [view 2] because [reason]. For instance, [example]. I tend to agree with this perspective because [your reasoning].

Conclusion: In conclusion, while both views have merit, I believe [restate opinion].`,
  },
  {
    id: 'fw_problem_solution_essay',
    skill: 'writing',
    name: 'Problem–Solution Essay',
    nameVi: 'Bài luận vấn đề – giải pháp',
    description: 'Use when the question asks: "What are the problems and solutions?" or "What are the causes and how can they be addressed?"',
    descriptionVi: 'Sử dụng khi đề bài hỏi về nguyên nhân/vấn đề và giải pháp.',
    steps: [
      { label: 'Introduction', detail: 'Paraphrase the problem + say you will discuss causes and solutions' },
      { label: 'Body 1 – Problems/Causes', detail: 'Describe 2-3 main problems or causes with examples' },
      { label: 'Body 2 – Solutions', detail: 'Propose 2-3 practical solutions with explanations' },
      { label: 'Conclusion', detail: 'Summarise problems and solutions briefly' },
    ],
    sample: `Introduction: [Problem] has become a serious issue in many countries. This essay will examine the main causes and suggest some practical solutions.

Body 1: One of the primary causes is [cause 1]. [Explanation]. In addition, [cause 2]. For example, [example].

Body 2: To address these issues, [solution 1]. This would [benefit]. Furthermore, [solution 2]. For instance, [example of solution working].

Conclusion: In conclusion, while [problem] is caused by [summary], measures such as [solutions] could help to alleviate the situation.`,
  },
  {
    id: 'fw_two_part_essay',
    skill: 'writing',
    name: 'Two-Part Question Essay',
    nameVi: 'Bài luận 2 câu hỏi',
    description: 'Use when the question has two distinct parts, e.g. "Why is this happening? Is it positive or negative?"',
    descriptionVi: 'Sử dụng khi đề bài có 2 câu hỏi riêng biệt, ví dụ: "Tại sao? Tích cực hay tiêu cực?"',
    steps: [
      { label: 'Introduction', detail: 'Paraphrase + briefly mention you will answer both questions' },
      { label: 'Body 1 – Answer Q1', detail: 'Answer the first question with 2-3 reasons + examples' },
      { label: 'Body 2 – Answer Q2', detail: 'Answer the second question with reasons + examples' },
      { label: 'Conclusion', detail: 'Summarise answers to both questions' },
    ],
    sample: `Introduction: [Topic] has become increasingly common. This essay will explore the reasons behind this trend and assess whether it is a positive or negative development.

Body 1: There are several reasons why [Q1 answer]. Firstly, [reason 1]. Secondly, [reason 2]. For example, [example].

Body 2: I believe this is largely a [positive/negative] development. [Reason]. For instance, [example]. However, [acknowledge other side].

Conclusion: In conclusion, [summary of Q1] and I consider this to be [summary of Q2].`,
  },
  {
    id: 'fw_peel',
    skill: 'writing',
    name: 'PEEL Paragraph Structure',
    nameVi: 'Cấu trúc đoạn văn PEEL',
    description: 'A framework for writing strong body paragraphs in any essay type.',
    descriptionVi: 'Framework để viết đoạn thân bài chặt chẽ, áp dụng cho mọi dạng essay.',
    steps: [
      { label: 'P – Point', detail: 'State your main idea clearly in one sentence' },
      { label: 'E – Explain', detail: 'Explain why this point is true or important' },
      { label: 'E – Example', detail: 'Give a specific example to support your point' },
      { label: 'L – Link', detail: 'Link back to the main question or your overall argument' },
    ],
    sample: `One major reason is that [POINT].
This means that [EXPLANATION].
For example, [EXAMPLE].
Therefore, [LINK back to argument].`,
  },

  // ─── Speaking Frameworks ──────────────────────────────
  {
    id: 'fw_area',
    skill: 'speaking',
    name: 'A.R.E.A Framework (Part 1)',
    nameVi: 'Framework A.R.E.A (Part 1)',
    description: 'Best for short answers in Speaking Part 1. Aim for 2-4 sentences.',
    descriptionVi: 'Phù hợp nhất cho câu trả lời ngắn ở Part 1. Nên trả lời 2-4 câu.',
    steps: [
      { label: 'A – Answer', detail: 'Answer the question directly (Yes/No or a clear statement)' },
      { label: 'R – Reason', detail: 'Give a reason why' },
      { label: 'E – Example', detail: 'Provide a brief example' },
      { label: 'A – Add', detail: 'Add a small extra detail or contrast' },
    ],
    sample: `"Do you like reading books?"

A: Yes, I do.
R: I usually read self-development books because they give me new ideas about life and study.
E: For example, I recently read a book about building better habits.
A: I do not read every day, but I try to read when I have free time.`,
  },
  {
    id: 'fw_prep_story',
    skill: 'speaking',
    name: 'P.R.E.P + Story (Part 2)',
    nameVi: 'Framework P.R.E.P + Story (Part 2)',
    description: 'Structure for the 1-2 minute long turn in Speaking Part 2 (cue card).',
    descriptionVi: 'Cấu trúc cho phần nói dài 1-2 phút ở Part 2 (cue card).',
    steps: [
      { label: 'P – Point', detail: 'Introduce the topic (I would like to talk about...)' },
      { label: 'R – Reason', detail: 'Explain why you chose this topic/thing/person' },
      { label: 'E – Experience', detail: 'Tell a detailed story or describe your experience' },
      { label: 'P – Personal feeling', detail: 'Share your personal feeling or lesson learned' },
    ],
    sample: `"Describe a useful website you often use."

P: I would like to talk about YouTube, which is the website I use most frequently.
R: I use it mainly for learning English and watching tutorials about programming.
E: For example, last month I found a channel that teaches IELTS speaking, and I practised along with the videos every evening.
P: Overall, I think YouTube is incredibly useful because it gives free access to knowledge from experts around the world.`,
  },
  {
    id: 'fw_oreo',
    skill: 'speaking',
    name: 'O.R.E.O Framework (Part 3)',
    nameVi: 'Framework O.R.E.O (Part 3)',
    description: 'Best for discussion-style questions in Speaking Part 3.',
    descriptionVi: 'Phù hợp cho câu hỏi thảo luận sâu ở Part 3.',
    steps: [
      { label: 'O – Opinion', detail: 'State your opinion clearly' },
      { label: 'R – Reason', detail: 'Explain the reason behind your opinion' },
      { label: 'E – Example', detail: 'Give a concrete example' },
      { label: 'O – Outcome', detail: 'Conclude or add a broader perspective' },
    ],
    sample: `"How has technology changed the way students learn?"

O: I think technology has made learning more flexible and personalised.
R: Students can now access videos, online courses, and AI tools at any time, so they are not limited to the classroom.
E: For example, many learners use YouTube or language apps to practise English after school.
O: However, they still need guidance from teachers, because too much information online can be confusing.`,
  },
];
