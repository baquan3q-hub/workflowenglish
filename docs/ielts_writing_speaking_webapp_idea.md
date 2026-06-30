# Ý tưởng tích hợp IELTS Writing & Speaking vào Web App

> Phiên bản: 1.0  
> Mục tiêu tài liệu: tổng hợp ý tưởng sản phẩm, kiến thức IELTS cần tích hợp, framework học, tiêu chí chấm, AI feedback flow và đề xuất lộ trình MVP.

---

## 1. Tóm tắt ý tưởng

Bạn muốn mở rộng web app học tập bằng **2 module mới: IELTS Writing và IELTS Speaking**. Hai module này không chỉ cung cấp đề bài, tài nguyên và framework làm bài, mà còn dùng AI để:

- chấm điểm theo tiêu chí IELTS;
- phân tích lỗi cụ thể;
- chữa bài theo hướng nâng band;
- đề xuất câu trả lời/bài viết tốt hơn;
- cá nhân hóa lộ trình luyện tập cho từng người học.

Về bản chất, đây không nên chỉ là một “kho đề IELTS”, mà nên được thiết kế thành một **IELTS Skill Improvement System**: người học làm bài → AI phân tích → AI feedback → người học sửa lại → hệ thống ghi nhận tiến bộ.

---

## 2. Phạm vi sản phẩm đề xuất

### 2.1. Module Writing

Module Writing tập trung vào 2 phần chính của IELTS Writing:

| Phần | Nội dung | Mục tiêu người học |
|---|---|---|
| Writing Task 1 | Academic: mô tả biểu đồ, bảng, bản đồ, quy trình. General Training: viết thư. | Biết cách phân tích đề, lập bố cục, viết overview, chọn số liệu chính, dùng ngôn ngữ mô tả chính xác. |
| Writing Task 2 | Viết essay tối thiểu 250 từ về một quan điểm, vấn đề hoặc lập luận. | Biết lập luận, phát triển ý, dùng ví dụ, tổ chức đoạn văn và kiểm soát ngữ pháp/từ vựng. |

Nên ưu tiên **Academic Writing** trước, vì phù hợp với phần lớn người học IELTS để du học/học thuật. Sau đó có thể mở rộng sang General Training.

### 2.2. Module Speaking

Module Speaking tập trung vào 3 phần chính:

| Phần | Nội dung | Mục tiêu người học |
|---|---|---|
| Speaking Part 1 | Câu hỏi ngắn về bản thân, học tập, công việc, sở thích, thói quen. | Trả lời tự nhiên, ngắn gọn, đúng trọng tâm, phát âm rõ. |
| Speaking Part 2 | Nói dài 1–2 phút theo cue card. | Biết mở rộng ý, kể chuyện, dùng ví dụ, duy trì mạch nói. |
| Speaking Part 3 | Thảo luận sâu hơn, mang tính xã hội/trừu tượng. | Biết đưa quan điểm, giải thích nguyên nhân, so sánh, dự đoán, đánh giá. |

Module này nên có chức năng **ghi âm voice**, chuyển voice thành transcript, sau đó AI phân tích cả nội dung nói, ngữ pháp, từ vựng, độ mạch lạc và phát âm.

### 2.3. Ghi chú về Listening

Trong mô tả cuối bạn có nhắc “speaking và listening”, nhưng phần nội dung chi tiết đang tập trung vào **Writing và Speaking**. Vì vậy tài liệu này ưu tiên 2 module chính là Writing + Speaking. Listening có thể được xem là **module mở rộng giai đoạn sau**.

---

## 3. Format đề thi IELTS Writing cần tích hợp

### 3.1. IELTS Academic Writing

IELTS Academic Writing gồm 2 task và cả hai đều phải hoàn thành.

| Task | Thời gian gợi ý | Số từ tối thiểu | Dạng bài |
|---|---:|---:|---|
| Task 1 | khoảng 20 phút | ít nhất 150 từ | Mô tả graph, chart, table, diagram, process, map. |
| Task 2 | khoảng 40 phút | ít nhất 250 từ | Viết essay phản hồi một quan điểm, lập luận hoặc vấn đề. |

### 3.2. Writing Task 1 Academic – Các dạng đề

| Dạng đề | Người học cần làm gì | Framework nên dạy |
|---|---|---|
| Line graph | Mô tả xu hướng theo thời gian | Introduction → Overview → Details 1 → Details 2 |
| Bar chart | So sánh số liệu giữa nhóm/cột | Introduction → Overview → Main comparisons → Details |
| Pie chart | Mô tả tỉ lệ/phần trăm | Introduction → Overview → Largest/smallest categories → Other details |
| Table | So sánh dữ liệu trong bảng | Introduction → Overview → Key patterns → Specific figures |
| Mixed charts | Kết hợp nhiều biểu đồ | Introduction → Overview → Chart 1 details → Chart 2 details |
| Process | Mô tả quy trình | Introduction → Overview → Stage group 1 → Stage group 2 |
| Map | Mô tả sự thay đổi địa điểm | Introduction → Overview → Major changes → Specific area changes |

### 3.3. Writing Task 2 – Các dạng essay phổ biến

| Dạng đề | Tín hiệu đề bài | Framework gợi ý |
|---|---|---|
| Opinion / Agree or Disagree | To what extent do you agree or disagree? | Introduction → Reason 1 → Reason 2 → Conclusion |
| Discussion | Discuss both views and give your opinion | Introduction → View 1 → View 2 + opinion → Conclusion |
| Advantages / Disadvantages | Do the advantages outweigh the disadvantages? | Introduction → Advantages → Disadvantages → Judgement |
| Problem / Solution | What are the problems and solutions? | Introduction → Problems → Solutions → Conclusion |
| Cause / Effect / Solution | What are the causes? What effects? What solutions? | Introduction → Causes → Effects/Solutions → Conclusion |
| Two-part question | Why is this? Is it positive or negative? | Introduction → Answer Q1 → Answer Q2 → Conclusion |

---

## 4. Tiêu chí chấm IELTS Writing cần đưa vào hệ thống

IELTS Writing được đánh giá theo 4 tiêu chí chính. Task 1 dùng **Task Achievement**, còn Task 2 dùng **Task Response**. Ba tiêu chí còn lại giống nhau.

| Tiêu chí | Áp dụng | Ý nghĩa trong hệ thống |
|---|---|---|
| Task Achievement / Task Response | Task 1 / Task 2 | Người học có trả lời đúng đề không, có đủ ý không, có phát triển lập luận/số liệu đúng không. |
| Coherence and Cohesion | Task 1 & 2 | Bố cục có rõ không, ý có logic không, liên kết câu/đoạn có tự nhiên không. |
| Lexical Resource | Task 1 & 2 | Từ vựng có đa dạng, chính xác, phù hợp ngữ cảnh không. |
| Grammatical Range and Accuracy | Task 1 & 2 | Ngữ pháp có đúng không, có dùng được câu phức/cấu trúc đa dạng không. |

### 4.1. Cách AI nên trả feedback Writing

AI không nên chỉ trả ra một con điểm. Feedback nên có cấu trúc như sau:

```text
1. Estimated Band Score
- Overall: 5.5
- Task Response / Achievement: 5.0
- Coherence and Cohesion: 5.5
- Lexical Resource: 5.5
- Grammar Range and Accuracy: 5.0

2. What you did well
- ...

3. Main problems
- ...

4. Sentence-level corrections
- Original: ...
- Corrected: ...
- Explanation: ...

5. Band-up rewrite
- A stronger version of your answer / paragraph

6. Next practice task
- One targeted exercise based on your weakness
```

### 4.2. Cảnh báo quan trọng về AI chấm Writing

AI có thể hỗ trợ đánh giá và chữa bài rất tốt, nhưng điểm AI nên được gọi là **Estimated Band Score** hoặc **AI-estimated score**, không nên ghi là “official IELTS score”. Lý do: điểm IELTS chính thức chỉ đến từ giám khảo IELTS được chứng nhận trong kỳ thi thật.

---

## 5. Framework Writing nên tích hợp

### 5.1. Framework chung cho Writing Task 1 Academic

#### A. Framework 4 đoạn cơ bản

```text
Paragraph 1 – Introduction
Paraphrase lại đề bài.

Paragraph 2 – Overview
Nêu 2–3 đặc điểm nổi bật nhất, không cần số liệu quá chi tiết.

Paragraph 3 – Details 1
Mô tả nhóm thông tin chính đầu tiên.

Paragraph 4 – Details 2
Mô tả nhóm thông tin chính thứ hai.
```

#### B. Công thức Introduction

```text
The chart/graph/table illustrates/shows/compares + what + where + when.
```

Ví dụ:

```text
The line graph illustrates changes in the number of international students in three countries between 2010 and 2020.
```

#### C. Công thức Overview

```text
Overall, it is clear that + main trend 1, while + main contrast/trend 2.
```

Ví dụ:

```text
Overall, it is clear that the number of students increased in all three countries, while Canada experienced the most significant growth.
```

#### D. Checklist Task 1

- Có paraphrase đề bài không?
- Có overview rõ ràng không?
- Có chọn số liệu quan trọng không?
- Có so sánh thay vì liệt kê máy móc không?
- Có dùng đúng thì không?
- Có đạt ít nhất 150 từ không?

---

### 5.2. Framework Writing Task 2

#### A. Framework PEEL cho body paragraph

```text
P – Point: Nêu luận điểm chính.
E – Explanation: Giải thích vì sao luận điểm đúng.
E – Example: Đưa ví dụ cụ thể.
L – Link: Liên kết lại với câu hỏi/luận điểm chung.
```

Ví dụ khung câu:

```text
One major reason is that ...
This means that ...
For example, ...
Therefore, ...
```

#### B. Framework Opinion Essay

```text
Introduction
- Paraphrase topic
- Give clear opinion

Body 1
- Reason 1
- Explain
- Example

Body 2
- Reason 2
- Explain
- Example

Conclusion
- Restate opinion
- Summarise main reasons
```

#### C. Framework Discussion Essay

```text
Introduction
- Paraphrase topic
- Say both views will be discussed
- Give your opinion briefly

Body 1
- Explain view 1
- Give example

Body 2
- Explain view 2
- Give your opinion
- Give example

Conclusion
- Summarise both sides
- Restate your opinion
```

#### D. Framework Problem–Solution Essay

```text
Introduction
- Paraphrase problem
- Briefly mention that causes/problems and solutions will be discussed

Body 1
- Problem 1
- Problem 2

Body 2
- Solution 1
- Solution 2

Conclusion
- Summarise problems and solutions
```

#### E. Checklist Task 2

- Có trả lời đúng toàn bộ câu hỏi không?
- Opinion có rõ không?
- Mỗi body paragraph có một main idea rõ không?
- Ý có được giải thích đủ sâu không?
- Ví dụ có liên quan không?
- Có dùng linking words tự nhiên không?
- Có đạt ít nhất 250 từ không?

---

## 6. Format đề thi IELTS Speaking cần tích hợp

### 6.1. Cấu trúc Speaking

| Part | Nội dung | Thời lượng tham khảo | Dạng câu hỏi |
|---|---|---:|---|
| Part 1 | Câu hỏi cá nhân, chủ đề quen thuộc | khoảng 4–5 phút | Study, work, hometown, hobbies, daily life. |
| Part 2 | Nói dài theo cue card | khoảng 3–4 phút | Describe a person/place/event/object/experience. |
| Part 3 | Thảo luận sâu, trừu tượng hơn | khoảng 4–5 phút | Society, education, technology, culture, future trends. |

### 6.2. Tiêu chí chấm IELTS Speaking

| Tiêu chí | Ý nghĩa | AI có thể đánh giá bằng gì? |
|---|---|---|
| Fluency and Coherence | Nói trôi chảy, ít ngập ngừng, ý mạch lạc | Tốc độ nói, số lần pause, độ dài câu trả lời, logic ý. |
| Lexical Resource | Vốn từ đa dạng, đúng ngữ cảnh | Từ vựng theo chủ đề, collocation, paraphrase. |
| Grammatical Range and Accuracy | Cấu trúc câu đa dạng và chính xác | Tỉ lệ lỗi ngữ pháp, câu đơn/câu phức, thì, mệnh đề. |
| Pronunciation | Phát âm dễ hiểu, trọng âm, ngữ điệu | Speech-to-text confidence, lỗi âm, word stress, sentence stress, rhythm. |

### 6.3. Cách AI nên trả feedback Speaking

```text
1. Estimated Speaking Band
- Overall: 5.5
- Fluency and Coherence: 5.5
- Lexical Resource: 5.0
- Grammar Range and Accuracy: 5.5
- Pronunciation: 5.0

2. Transcript
- Full transcript from the voice recording

3. Strengths
- ...

4. Problems
- Fluency: ...
- Vocabulary: ...
- Grammar: ...
- Pronunciation: ...

5. Corrected answer
- Rewrite the answer in a natural band 6.0 version

6. Better answer suggestion
- A sample answer at the learner's target level

7. Pronunciation focus
- Words to practise
- Stress pattern
- Common mispronunciations

8. Next speaking drill
- A 3–5 minute targeted exercise
```

---

## 7. Framework Speaking nên tích hợp

### 7.1. Speaking Part 1 – Framework A.R.E.A

Phù hợp cho câu trả lời 2–4 câu.

```text
A – Answer directly
R – Reason
E – Example
A – Add a small extra detail
```

Ví dụ câu hỏi:

```text
Do you like reading books?
```

Câu trả lời mẫu band 5.5–6.0:

```text
Yes, I do. I usually read self-development books because they give me new ideas about life and study. For example, I recently read a book about building better habits. I do not read every day, but I try to read when I have free time.
```

### 7.2. Speaking Part 2 – Framework P.R.E.P + Story

```text
P – Point: Giới thiệu nhanh chủ đề.
R – Reason: Vì sao chọn người/vật/sự kiện đó.
E – Example/Experience: Kể chi tiết trải nghiệm.
P – Personal feeling: Cảm xúc hoặc bài học cá nhân.
```

Cue card ví dụ:

```text
Describe a useful website you often use.
You should say:
- what it is
- how often you use it
- what you use it for
- and explain why it is useful.
```

Khung trả lời:

```text
I would like to talk about ...
I use it mainly for ...
One reason I find it useful is that ...
For example, ...
Another thing I like is ...
Overall, I think it is useful because ...
```

### 7.3. Speaking Part 3 – Framework O.R.E.O

Phù hợp cho câu hỏi thảo luận sâu.

```text
O – Opinion: Nêu quan điểm.
R – Reason: Giải thích lý do.
E – Example: Đưa ví dụ.
O – Outcome/Opinion again: Kết luận hoặc mở rộng.
```

Ví dụ câu hỏi:

```text
How has technology changed the way students learn?
```

Câu trả lời mẫu:

```text
I think technology has made learning more flexible and personalised. Students can now access videos, online courses and AI tools at any time, so they are not limited to the classroom. For example, many learners use YouTube or language apps to practise English after school. However, they still need guidance from teachers, because too much information online can be confusing.
```

---

## 8. Kho câu hỏi và tài nguyên cần xây dựng

### 8.1. Speaking Question Bank

Nên phân loại câu hỏi theo 4 lớp:

| Lớp phân loại | Ví dụ |
|---|---|
| Part | Part 1, Part 2, Part 3 |
| Topic | Education, Technology, Work, Hometown, Travel, Health, Environment |
| Difficulty | Easy, Medium, Hard |
| Popularity | Common, Recent, Rare, High-frequency |

Ví dụ cấu trúc dữ liệu:

```json
{
  "id": "sp_p1_education_001",
  "part": 1,
  "topic": "Education",
  "difficulty": "easy",
  "popularity": "high",
  "question": "Do you prefer studying alone or with other people?",
  "target_band": "5.5-6.0",
  "framework": "AREA",
  "sample_answer": "I prefer studying alone because I can focus better...",
  "vocabulary": ["focus", "distraction", "productive"],
  "grammar_focus": ["present simple", "because clause"]
}
```

### 8.2. Writing Question Bank

| Lớp phân loại | Ví dụ |
|---|---|
| Task | Task 1, Task 2 |
| Type | Line graph, Bar chart, Opinion essay, Discussion essay |
| Topic | Education, Technology, Environment, Work, Society |
| Level | Band 4.5–5.0, 5.5–6.0, 6.5+ |
| Skill focus | Overview, idea development, cohesion, grammar, vocabulary |

Ví dụ cấu trúc dữ liệu:

```json
{
  "id": "wr_t2_technology_001",
  "task": 2,
  "essay_type": "opinion",
  "topic": "Technology and education",
  "difficulty": "medium",
  "question": "Some people believe that online learning will replace traditional classrooms. To what extent do you agree or disagree?",
  "target_band": "5.5-6.0",
  "framework": "Opinion Essay",
  "planning_prompts": [
    "What is your clear opinion?",
    "What are two main reasons?",
    "What example can support each reason?"
  ]
}
```

---

## 9. AI feedback flow đề xuất

### 9.1. Writing flow

```text
User chọn task/de bài
→ User viết bài
→ Hệ thống kiểm tra số từ + thời gian
→ AI phân tích theo 4 tiêu chí
→ AI trả estimated band + lỗi + gợi ý sửa
→ User viết lại phiên bản 2
→ AI so sánh version 1 và version 2
→ Lưu tiến bộ vào dashboard
```

### 9.2. Speaking flow

```text
User chọn Part/Topic/Question
→ User ghi âm câu trả lời
→ Speech-to-text tạo transcript
→ AI phân tích transcript + audio signals nếu có
→ AI chấm theo 4 tiêu chí
→ AI sửa câu trả lời
→ AI gợi ý câu trả lời band cao hơn
→ User luyện lại lần 2
→ Hệ thống so sánh lần 1 và lần 2
```

### 9.3. Dashboard tiến bộ

Dashboard nên có các chỉ số:

| Chỉ số | Ý nghĩa |
|---|---|
| Average estimated band | Điểm trung bình AI ước lượng theo thời gian. |
| Weakest criterion | Tiêu chí yếu nhất: grammar, vocabulary, fluency, task response… |
| Practice streak | Số ngày luyện liên tục. |
| Common mistakes | Lỗi lặp lại nhiều nhất. |
| Improved answers | Số bài/câu đã sửa lần 2. |
| Topic coverage | Người học đã luyện những topic nào. |

---

## 10. Prompt AI chấm điểm mẫu

### 10.1. Prompt chấm Writing

```text
You are an IELTS Writing examiner assistant.
Evaluate the user's answer based on IELTS public band descriptors.
Do not claim this is an official IELTS score. Provide an estimated band only.

Input:
- Test type: Academic / General Training
- Task: Task 1 / Task 2
- Question: {{question}}
- User answer: {{answer}}
- Target band: {{target_band}}

Output format:
1. Estimated overall band
2. Estimated score for each criterion
3. Strengths
4. Main weaknesses
5. Sentence-level corrections
6. Improved version at target band
7. 3 specific actions for the next attempt

Rules:
- Be strict but helpful.
- Explain in simple language.
- Prioritise the top 3 problems only.
- Do not over-correct into an unnatural essay.
```

### 10.2. Prompt chấm Speaking

```text
You are an IELTS Speaking examiner assistant.
Evaluate the user's spoken answer using the IELTS public speaking criteria.
This is not an official IELTS score. Provide an estimated band only.

Input:
- Speaking part: {{part}}
- Question: {{question}}
- Transcript: {{transcript}}
- Audio metadata if available: pauses, speech rate, confidence score
- Target band: {{target_band}}

Output format:
1. Estimated overall band
2. Estimated score for Fluency and Coherence
3. Estimated score for Lexical Resource
4. Estimated score for Grammatical Range and Accuracy
5. Estimated score for Pronunciation
6. Corrected transcript
7. Better sample answer at target band
8. Pronunciation practice list
9. One short follow-up drill

Rules:
- Keep feedback practical.
- Focus on improvement, not just scoring.
- For pronunciation, separate likely pronunciation problems from transcript-based grammar problems.
```

---

## 11. Tính năng nên có trong MVP

### 11.1. MVP Writing

| Tính năng | Mức ưu tiên | Ghi chú |
|---|---:|---|
| Kho đề Writing Task 1 & Task 2 | Cao | Tự tạo đề gốc, tránh copy đề có bản quyền. |
| Editor viết bài | Cao | Có word count, timer, autosave. |
| AI estimated band | Cao | Chấm theo 4 tiêu chí. |
| AI chữa lỗi câu | Cao | Highlight lỗi ngữ pháp/từ vựng. |
| Sample answer theo band | Trung bình | Nên có band 5.5, 6.0, 6.5. |
| Rewrite version tracking | Trung bình | So sánh bài trước/sau. |

### 11.2. MVP Speaking

| Tính năng | Mức ưu tiên | Ghi chú |
|---|---:|---|
| Kho câu hỏi Part 1–3 | Cao | Phân loại topic, part, difficulty. |
| Ghi âm voice | Cao | Web recorder. |
| Speech-to-text | Cao | Tạo transcript để AI phân tích. |
| AI feedback | Cao | Chấm theo 4 tiêu chí. |
| Corrected answer | Cao | Sửa câu trả lời tự nhiên hơn. |
| Pronunciation notes | Trung bình | Cần engine speech/audio tốt hơn để chính xác. |
| Repeat practice | Trung bình | Cho người học ghi âm lại sau feedback. |

---

## 12. Kiến trúc dữ liệu gợi ý

### 12.1. Bảng `ielts_questions`

| Field | Type | Ghi chú |
|---|---|---|
| id | uuid | ID câu hỏi |
| skill | text | writing / speaking / listening |
| task_or_part | text | task_1, task_2, part_1, part_2, part_3 |
| question_type | text | opinion, graph, map, cue_card… |
| topic | text | education, technology, health… |
| difficulty | text | easy, medium, hard |
| popularity | text | common, recent, rare |
| prompt | text | Nội dung đề/câu hỏi |
| framework_id | uuid | Framework gợi ý |
| sample_answer | text | Bài/câu mẫu |
| target_band | text | 4.5–5.5 / 5.5–6.0 / 6.5+ |

### 12.2. Bảng `ielts_attempts`

| Field | Type | Ghi chú |
|---|---|---|
| id | uuid | ID lần làm bài |
| user_id | uuid | Người học |
| question_id | uuid | Đề/câu hỏi |
| answer_text | text | Bài viết hoặc transcript |
| audio_url | text | Link file voice nếu Speaking |
| duration_seconds | integer | Thời gian làm/nói |
| word_count | integer | Số từ |
| estimated_band | numeric | Điểm AI ước lượng |
| criterion_scores | jsonb | Điểm từng tiêu chí |
| ai_feedback | jsonb | Feedback đầy đủ |
| created_at | timestamp | Thời điểm nộp |

### 12.3. Bảng `ielts_frameworks`

| Field | Type | Ghi chú |
|---|---|---|
| id | uuid | ID framework |
| skill | text | writing / speaking |
| name | text | PEEL, AREA, OREO… |
| description | text | Mô tả framework |
| structure | jsonb | Các bước áp dụng |
| sample | text | Ví dụ minh họa |

---

## 13. UX flow đề xuất

### 13.1. Flow luyện Writing

```text
Writing Home
→ Choose Task 1 / Task 2
→ Choose topic / type / difficulty
→ Read question + framework suggestion
→ Start timer
→ Write answer
→ Submit
→ AI feedback screen
→ Rewrite answer
→ Compare improvement
```

### 13.2. Flow luyện Speaking

```text
Speaking Home
→ Choose Part 1 / Part 2 / Part 3
→ Choose topic / random question
→ Read question
→ Record answer
→ Submit voice
→ View transcript
→ AI feedback screen
→ Practise corrected version
→ Record again
```

### 13.3. Màn hình AI feedback nên có

```text
Top section:
- Estimated Band
- Target Band
- Main weakness

Middle section:
- Score by criterion
- Detailed feedback
- Highlighted mistakes

Bottom section:
- Improved answer
- Next practice recommendation
- Save to learning notebook
```

---

## 14. Rủi ro và lưu ý sản phẩm

| Rủi ro | Vì sao quan trọng | Cách xử lý |
|---|---|---|
| AI chấm không hoàn toàn giống giám khảo thật | Có thể tạo kỳ vọng sai cho người học | Ghi rõ “AI-estimated band”, calibrate bằng bài mẫu/human review. |
| Copy đề IELTS thật có bản quyền | Có thể vi phạm bản quyền | Tự tạo đề gốc theo format IELTS, không sao chép nguyên đề từ sách/trang trả phí. |
| Chấm phát âm khó chính xác | Transcript không đủ để đánh giá pronunciation | Kết hợp speech-to-text confidence, audio analysis, hoặc dịch vụ pronunciation assessment. |
| Feedback quá dài làm người học nản | Người học 4.5–5.5 cần hướng dẫn ngắn, rõ | Ưu tiên top 3 lỗi chính + hành động tiếp theo. |
| Người học phụ thuộc sample answer | Có thể học thuộc máy móc | Bắt buộc có bước tự viết/tự nói lại sau feedback. |
| Dữ liệu voice nhạy cảm | Voice là dữ liệu cá nhân | Cần consent, chính sách lưu trữ, quyền xóa dữ liệu. |

---

## 15. Lộ trình phát triển đề xuất

### Phase 1 – MVP cơ bản

- Kho đề Writing Task 2.
- Kho câu hỏi Speaking Part 1.
- Editor Writing có timer + word count.
- Recorder Speaking + transcript.
- AI feedback cơ bản theo rubric.
- Dashboard điểm gần nhất.

### Phase 2 – Cá nhân hóa học tập

- Lưu lỗi thường gặp.
- Gợi ý bài tập theo điểm yếu.
- So sánh version 1 và version 2.
- Bộ framework tương tác.
- Sample answer theo band mục tiêu.

### Phase 3 – Nâng chất lượng chấm

- Calibrate AI bằng bài mẫu có điểm chuẩn.
- Cho giáo viên/human reviewer chấm lại một số bài.
- Thêm pronunciation scoring nâng cao.
- Thêm Writing Task 1 đầy đủ dạng biểu đồ/map/process.

### Phase 4 – Mở rộng kỹ năng khác

- Listening practice.
- Reading practice.
- Mock test full IELTS.
- Study plan theo mục tiêu band.

---

## 16. Đề xuất định vị sản phẩm

Không nên định vị sản phẩm là “AI thay thế giáo viên IELTS”. Nên định vị là:

> **Một nền tảng luyện IELTS Writing & Speaking có AI feedback cá nhân hóa, giúp người học biết mình sai ở đâu, sửa như thế nào và luyện lại để cải thiện band.**

Điểm khác biệt nên tập trung vào:

- feedback rõ ràng, dễ hiểu cho người học Việt Nam;
- luyện theo framework chứ không chỉ chấm điểm;
- có quy trình sửa lại bài/câu trả lời;
- theo dõi lỗi lặp lại;
- phù hợp người học band 4.5–6.0 đang cần nền tảng và phản hồi thường xuyên.

---

## 17. Checklist kiến thức cần nghiên cứu thêm

### IELTS knowledge

- IELTS Academic Writing Task 1 format.
- IELTS Academic Writing Task 2 essay types.
- IELTS Speaking Part 1/2/3 format.
- IELTS public band descriptors.
- Common IELTS topics.
- Band 4.5–6.5 language features.

### AI / Product knowledge

- Prompt engineering cho rubric-based evaluation.
- Speech-to-text pipeline.
- Audio storage and privacy.
- Feedback UX design.
- Learning analytics.
- Error taxonomy.
- Personalized recommendation system.

### UX / Learning Design

- Microlearning.
- Deliberate practice.
- Formative assessment.
- Feedback loop.
- Skill progression map.
- Motivation and streak design.

---

## 18. Nguồn tham khảo chính

- IELTS Academic Writing format – IELTS.org: https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing
- IELTS General Training Writing format – IELTS.org: https://ielts.org/take-a-test/test-types/ielts-general-training-test/ielts-general-training-format-writing
- IELTS Speaking format – IELTS.org: https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking
- IELTS scoring in detail – IELTS.org: https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail
- IELTS Writing key assessment criteria – IELTS.org PDF: https://ielts.org/cdn/Guides/ielts-writing-key-assessment-criteria.pdf
- IELTS Speaking band descriptors – IELTS.org PDF: https://ielts.org/cdn/ielts-guides/ielts-speaking-band-descriptors.pdf

---

## 19. Kết luận

Ý tưởng này có tiềm năng tốt vì đánh trúng một vấn đề thật của người học IELTS: **luyện Writing và Speaking rất cần feedback, nhưng không phải lúc nào cũng có giáo viên sửa ngay**.

Sản phẩm nên đi theo hướng:

```text
Kho đề + Framework + AI Feedback + Sửa lại + Theo dõi tiến bộ
```

Nếu làm MVP, nên bắt đầu nhỏ với:

```text
Writing Task 2 + Speaking Part 1 + AI feedback + dashboard lỗi thường gặp
```

Sau khi luồng feedback đủ tốt, mới mở rộng sang Task 1, Speaking Part 2/3, pronunciation scoring và mock test đầy đủ.
