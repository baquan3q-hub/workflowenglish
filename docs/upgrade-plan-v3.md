# Kế hoạch nâng cấp v3 — Ghi nhớ chủ động, luyện câu, thống kê, sổ từ SRS

> Ngày lập: 2026-10-17 · Trạng thái: **đã chốt phạm vi (mục 8), sẵn sàng thực thi**
> Tham chiếu schema: [database-schema.md](database-schema.md)

## 0. Tóm tắt

Có 5 hạng mục yêu cầu. Sau khi rà code, mình đề xuất làm thêm một **Giai đoạn 0 (nền tảng)**
trước, vì ba trong số năm hạng mục phụ thuộc vào nó:

| # | Hạng mục | Phụ thuộc | Ước lượng |
|---|---|---|---|
| 0 | Nền tảng: bảng nhật ký ôn tập, gom logic chấm SRS, sửa lỗi từ mới bị "đến hạn" ngay | — | 1–1.5 ngày |
| 1 | Sổ từ SRS: xem danh sách (theo bài học + bộ từ tự tạo), ôn lại, đổi trạng thái | 0 | 2.5 ngày |
| 2 | Ghi chữ trên flashcard: gõ từ, ghi chú, bảng viết tay | 0 | 2 ngày |
| 3 | Edge Function `ai-proxy` (giấu API key) + Luyện mẫu câu cuối bài | 0 | 3–4 ngày |
| 4 | Nâng cấp thống kê, phân tích | 0 (cần dữ liệu nhật ký tích luỹ) | 2 ngày |
| 5 | Cải thiện UI/UX: luồng bài học, ôn tập SRS, Dashboard, toàn app | 1–4 | 3 ngày |

**Vì sao làm Giai đoạn 0 trước:** biểu đồ hoạt động hiện tại sai về cấu trúc (xem 5.1), và dữ liệu
lịch sử ôn tập không thể bù lại sau. Ghi nhật ký càng sớm thì lúc làm dashboard mới càng có số liệu thật.

---

## 1. Giai đoạn 0 — Nền tảng

### 1.1 Vấn đề tìm thấy khi rà code

| Vấn đề | Vị trí | Hậu quả |
|---|---|---|
| Logic chấm SRS (SM-2 → chuyển trạng thái → upsert) bị **viết lặp** ở hai nơi | [Flashcards.tsx:297](../views/Flashcards.tsx:297), [ReviewSession.tsx:189](../views/ReviewSession.tsx:189) | Sửa một chỗ quên chỗ kia; thêm nguồn chấm mới (gõ từ, luyện câu) sẽ thành 4–5 bản sao |
| Từ mới tạo ra có `next_review_date = now()` | `bulkEnsureWordsWithMetadata` + default của cột | Vừa tạo bài là cả 10 từ chưa học đã nằm trong "Cần ôn hôm nay"; số đến hạn bị phồng |
| Chỉ có `last_reviewed_at`, không có lịch sử | `word_mastery` | Biểu đồ hoạt động đếm thiếu; không tính được tỉ lệ nhớ, không vẽ được lịch sử của một từ |
| Ôn trong bài học không được tính vào mục tiêu ngày | chỉ `ReviewSession` gọi `recordWordReview` | Học bài mới cả buổi nhưng vòng mục tiêu vẫn 0 |
| Mặt trước thẻ ôn tập vẫn ghi "IPA placeholder" dù đã lưu IPA từ migration 002 | [ReviewSession.tsx:411](../views/ReviewSession.tsx:411) | Thiếu thông tin |

### 1.2 Thay đổi

**Migration `005_review_logs_and_notes.sql`:**

```sql
-- Nhật ký từng lần chấm (append-only)
create table public.review_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  word_mastery_id uuid references public.word_mastery(id) on delete cascade,
  word            text not null,
  source          text not null check (source in
                    ('lesson_flashcard','review','quiz','fill_blank','spelling',
                     'handwriting','sentence','manual')),
  rating          smallint check (rating between 0 and 3),   -- null với 'manual'
  level_before    smallint, level_after smallint,
  interval_before real,     interval_after real,
  duration_ms     integer,                                   -- thời gian suy nghĩ
  reviewed_at     timestamptz not null default now()
);
create index on public.review_logs (user_id, reviewed_at desc);
create index on public.review_logs (word_mastery_id, reviewed_at desc);
-- RLS: select/insert own (auth.uid() = user_id); không cho update/delete

alter table public.word_mastery
  add column if not exists personal_note  text,
  add column if not exists is_suspended   boolean not null default false;
```

**Code:**

- `services/reviewService.ts` (mới): một hàm duy nhất
  `applyRating({ userId, record, rating, source, durationMs })` → tính SM-2, chuyển trạng thái,
  upsert `word_mastery`, ghi `review_logs` (best-effort), cộng mục tiêu ngày. Flashcards, ReviewSession,
  Quiz, gõ từ và luyện câu đều gọi hàm này.
- Hàng đợi ôn tập loại từ `NEW` và từ `is_suspended`. Từ mới chỉ vào hàng đợi sau lần chấm đầu tiên
  trong bài học.
- Test: unit test cho `applyRating` (mock Supabase), property test cho bất biến
  "không bao giờ ghi đè metadata", "log luôn khớp level_before/after".

---

## 2. Hạng mục 1 — Sổ từ SRS (xem list, ôn lại, đổi trạng thái)

### 2.1 Hiện trạng
Đã có "Sổ Tay Từ Vựng" **nằm trong trang Thống kê** ([AnalyticsDashboard.tsx:586](../views/AnalyticsDashboard.tsx:586)):
có lọc theo trạng thái nhưng **chỉ xem**, không tìm kiếm, không sửa, không ôn theo lựa chọn,
và tải toàn bộ bảng mỗi lần mở trang thống kê.

### 2.2 Đề xuất UX

Tách thành màn hình riêng **"Sổ từ"** (`AppPhase.VOCAB_LIBRARY`), mở từ Dashboard và từ thanh điều hướng.

```
┌ Sổ từ ──────────────────────────────── [🔍 Tìm từ...] ┐
│ [Tất cả 128] [⏰ Đến hạn 12] [Đang học 30] [Ôn tập 41] │
│ [Thành thạo 33] [Đã quên 9] [Tạm ẩn 3]   Sắp xếp: ▾    │
├────────────────────────────────────────────────────────┤
│ ☐ resilient   /rɪˈzɪl.jənt/  kiên cường   ● Ôn tập  3n │
│ ☐ allocate    /ˈæl.ə.keɪt/   phân bổ      ● Đã quên  ⏰ │
│ ...                                                    │
├────────────────────────────────────────────────────────┤
│ Đã chọn 5 từ:  [▶ Ôn ngay] [Đổi trạng thái ▾] [Ẩn]     │  ← thanh hành động dính đáy
└────────────────────────────────────────────────────────┘
```

- **Danh sách**: dạng hàng gọn (mobile 1 cột, desktop có cột), tìm kiếm theo từ hoặc nghĩa, sắp xếp theo
  hạn ôn / ngày thêm / độ khó / A–Z, phân trang ảo khi > 200 từ.
- **Chi tiết từ** (bottom sheet trên mobile, panel phải trên desktop): đủ metadata, phát âm, ghi chú cá nhân
  (mục 3), dòng thời gian ôn tập từ `review_logs`, lần ôn tới, khoảng cách hiện tại.
- **Đổi trạng thái** (từng từ hoặc hàng loạt): Mới · Đang học · Ôn tập · Thành thạo · Tạm ẩn.
  Có **Hoàn tác** trong toast 5 giây thay vì hộp xác nhận.
- **Ôn theo lựa chọn**: chọn từ (hoặc cả bộ lọc hiện tại) → mở ReviewSession với đúng các từ đó,
  kể cả từ chưa đến hạn ("ôn trước").

### 2.3 Quy tắc kỹ thuật khi đổi trạng thái thủ công
Không chỉ đổi `mastery_level`, phải đặt lại tham số SM-2 cho nhất quán, nếu không thuật toán sẽ "kéo" từ
về trạng thái cũ ở lần ôn sau:

| Trạng thái mới | rep | interval | next_review | EF |
|---|---|---|---|---|
| Mới | 0 | 0 | không đến hạn (chờ học) | reset 2.5 |
| Đang học | 0 | 1 | ngay bây giờ | giữ |
| Ôn tập | max(rep, 3) | max(interval, 3) | now + interval | giữ |
| Thành thạo | max(rep, 4) | max(interval, 22) | now + interval | giữ |
| Tạm ẩn | giữ nguyên | giữ nguyên | giữ nguyên | `is_suspended = true` |

Mỗi lần đổi ghi một dòng `review_logs` với `source = 'manual'` để thống kê không coi đó là "đã nhớ".

### 2.4 Danh sách từ (đã chốt: cả hai loại)

Thanh bên (desktop) / dải chip cuộn ngang (mobile) ở đầu Sổ từ:

```
Danh sách:  [Tất cả]  ── Theo bài học ──  [Du lịch · 12/10] [Công việc · 08/10] …
                      ── Bộ từ của tôi ── [⭐ Từ IELTS hay quên] [＋ Tạo bộ mới]
```

**a) Danh sách tự động theo bài học / chủ đề**
- Lấy từ `learning_history` (đã có `topic`, `words`, `completed_at`): tách chuỗi `words`,
  chuẩn hoá bằng `normalizeWord`, khớp với `word_mastery`. **Không cần đổi schema.**
- Gộp theo chủ đề (`topic`) hoặc xem từng bài. Mỗi danh sách hiện tiến độ: "8/12 từ đã ở mức Ôn tập trở lên".
- Nút "Ôn bài này" mở ReviewSession với đúng các từ của bài.

**b) Bộ từ người dùng tự tạo**
```sql
create table public.word_lists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  color      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.word_list_items (
  list_id         uuid not null references public.word_lists(id) on delete cascade,
  word_mastery_id uuid not null references public.word_mastery(id) on delete cascade,
  added_at        timestamptz not null default now(),
  primary key (list_id, word_mastery_id)
);
-- RLS: word_lists theo user_id; word_list_items kiểm tra quyền qua word_lists.user_id
```
- Thêm từ vào bộ: từ chi tiết từ, từ thanh hành động khi chọn nhiều từ, và ngay trên flashcard
  (nút ⭐ "Lưu vào bộ…").
- Đổi tên, đổi màu, xoá bộ (xoá bộ **không** xoá từ hay tiến độ SRS).

---

## 3. Hạng mục 2 — Ghi chữ trên flashcard

### 3.1 Mục tiêu học tập
Chuyển từ **nhận diện thụ động** (lật thẻ, tự đánh giá) sang **hồi tưởng chủ động** (tự gõ ra từ),
đồng thời cho người học ghi chú cá nhân (mẹo nhớ, câu của riêng mình). Hồi tưởng chủ động và
tự tạo nội dung đều giúp nhớ lâu hơn nhiều so với chỉ đọc lại.

### 3.2 Đề xuất UX
Thêm một khu vực **dưới thẻ** (không đặt trong thẻ đang xoay, vì bàn phím ảo trên mobile sẽ đẩy layout
và thao tác vuốt sẽ xung đột khi gõ), gồm 3 tab: **Gõ từ · Viết tay · Ghi chú**.

**Tab "✍️ Gõ từ"** (hồi tưởng chủ động)
1. Mặt trước hiện nghĩa tiếng Việt và định nghĩa, ẩn từ tiếng Anh.
2. Người học gõ từ → Enter.
3. So khớp **cục bộ, không gọi AI** (tức thì): đúng → xanh; sai 1–2 ký tự → "Gần đúng" kèm
   chỉ chỗ sai từng ký tự (ví dụ `recieve` → re**ie**ve vs re**ei**ve); sai → hiện đáp án.
4. Kết quả **gợi ý sẵn** nút chấm SRS (đúng lần đầu → "Tốt", gần đúng → "Khó", sai → "Lại").
   Người học vẫn bấm xác nhận, nên vẫn giữ quyền tự đánh giá.
5. Tuỳ chọn "Chép lại 3 lần" để luyện chính tả.

**Tab "🖊️ Viết tay"** (đã chốt: bảng viết, không nhận dạng chữ)
1. Bảng vẽ chiếm toàn chiều ngang, nền kẻ dòng như vở tập viết.
2. Hai chế độ:
   - **Viết theo mẫu**: từ hiện mờ trên dòng kẻ để tô theo (cho người mới).
   - **Viết từ trí nhớ**: chỉ hiện nghĩa tiếng Việt, viết xong bấm "So sánh" để hiện đáp án
     đè lên nét viết, rồi người học tự chấm (Lại / Khó / Tốt / Dễ).
3. Công cụ: Hoàn tác, Xoá, độ dày nét, bút/tẩy. Hỗ trợ chuột, ngón tay và bút cảm ứng (có lực nhấn).
4. Nét viết **không lưu lên server** (tránh tốn dung lượng). Chỉ ghi kết quả tự chấm vào `review_logs`
   với `source = 'handwriting'`.

**Tab "📝 Ghi chú"**
- Ô nhập tự lưu (debounce 800 ms) vào `word_mastery.personal_note`, có trạng thái "Đã lưu ✓".
- Gợi ý placeholder: "Mẹo nhớ của bạn, hoặc đặt một câu với từ này…".
- Ghi chú hiện lại ở mặt sau thẻ trong ReviewSession và trong Sổ từ.

**Cài đặt**: bật "Bắt buộc gõ trước khi lật" cho người muốn học nghiêm túc (mặc định tắt).

### 3.3 Kỹ thuật
- Hàm thuần `compareSpelling(input, target)` → `{ verdict, distance, diff[] }` (Levenshtein + diff),
  có property test.
- Trong lúc ô nhập có focus: tắt vuốt và tắt lật thẻ bằng click (`stopPropagation`).
- Kết quả gõ ghi `review_logs` với `source = 'spelling'`.
- Bảng viết tay: component `HandwritingPad` dùng `<canvas>` + Pointer Events (`pointerType`,
  `pressure`), `touch-action: none` để không cuộn trang khi viết, vẽ lại theo `devicePixelRatio`
  cho nét sắc trên màn hình retina, lưu nét dạng mảng điểm trong state để hoàn tác.
  Không thêm thư viện.
- Cột `review_logs.source` thêm giá trị `'handwriting'`.

---

## 4. Hạng mục 3 — Luyện mẫu câu cuối bài

### 4.1 Luồng học
```
Flashcards → Story → Quiz → Fill-blank → ✨ Luyện câu (mới) → Tổng kết bài
```
- AI tạo **5–8 câu tiếng Việt**, mỗi câu dùng 1–2 từ của bài, độ khó theo CEFR của bài.
- Người học viết câu tiếng Anh tương ứng → bấm "Chấm".
- Hiện ngay: điểm (Đúng / Chấp nhận được / Cần sửa), **bản sửa tối thiểu** (giữ cách diễn đạt của
  người học, chỉ tô đậm chỗ sửa), giải thích ngắn bằng tiếng Việt, có dùng đúng từ mục tiêu hay không,
  và một câu mẫu tự nhiên để tham khảo.
- Cuối phần: tổng kết lỗi theo nhóm (thì, mạo từ, giới từ, dùng từ, trật tự từ…) và nút "Luyện lại câu sai".

### 4.2 Đảm bảo **nhanh**
| Kỹ thuật | Hiệu quả |
|---|---|
| **Tạo đề trước (prefetch)**: gọi AI tạo câu ngay khi bài học được tạo, chạy nền trong lúc người học làm flashcard/story; lưu vào `lessonData.sentencePractice` | Khi tới phần luyện câu: **0 giây chờ**. Bài mở lại từ lịch sử cũng không phải tạo lại |
| Mỗi câu kèm sẵn **1–3 bản dịch tham chiếu** | So khớp cục bộ (chuẩn hoá dấu câu, viết hoa, viết tắt): nếu khớp → chấm "Đúng" tức thì, **không gọi AI** |
| Chấm **từng câu** với output JSON ngắn (schema cố định), `thinkingBudget: 0`, temperature thấp | Mục tiêu p50 < 2 giây, p95 < 4 giây |
| Timeout 10 giây, tự chuyển model dự phòng (giống `generateLessonContent`), nút "Thử lại" | Không treo màn hình |
| Hiện skeleton "Đang chấm…" ngay lập tức, cho gõ câu tiếp theo trong lúc chờ | Cảm giác nhanh |

### 4.3 Đảm bảo **chính xác**
- Prompt chấm luôn kèm **câu gốc tiếng Việt + bản dịch tham chiếu + từ mục tiêu + CEFR**, nên AI chấm
  có căn cứ chứ không đoán ý.
- Rubric rõ ràng trong prompt: (1) đúng nghĩa, (2) ngữ pháp, (3) dùng đúng từ mục tiêu, (4) tự nhiên.
  **Không trừ điểm** cách diễn đạt khác nhưng đúng; chỉ sửa lỗi thật.
- Bắt buộc mỗi lỗi có `{ original, corrected, category, explanationVi }`, kiểm tra JSON bằng schema,
  sai schema thì thử lại một lần.
- **Bộ đánh giá (eval set)**: khoảng 40 cặp (câu Việt, câu trả lời của người học, nhãn đúng/sai do người
  chấm) đặt trong `tests/eval/`. Chạy script so độ khớp mỗi khi đổi prompt hoặc model; mục tiêu ≥ 90%
  khớp nhãn. Đây là cách duy nhất để chứng minh "chính xác" thay vì chỉ cảm nhận.

### 4.4 Dữ liệu
```sql
create table public.sentence_attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  lesson_record_id uuid references public.learning_history(id) on delete set null,
  target_words     text[] not null,
  prompt_vi        text not null,
  user_answer      text not null,
  verdict          text check (verdict in ('correct','acceptable','incorrect')),
  score            smallint,          -- 0–100
  corrected        text,
  errors           jsonb,             -- [{original, corrected, category, explanationVi}]
  graded_by        text,              -- 'local' | tên model
  latency_ms       integer,
  created_at       timestamptz not null default now()
);
```
Kết quả còn được đưa vào SRS: dùng sai từ mục tiêu → ghi `review_logs` (`source = 'sentence'`, rating 1).

### 4.5 Edge Function `ai-proxy` (nhóm B, đã chốt: làm cùng hạng mục này)
Hạng mục luyện câu **tăng gấp đôi số lần gọi Gemini**, mà API key hiện bị nhúng vào bundle JS
(`process.env.API_KEY` qua `define` của Vite), ai mở DevTools cũng lấy được. Làm theo thứ tự:

1. **Function** `supabase/functions/ai-proxy/index.ts` (Deno):
   - Xác thực JWT của Supabase (chỉ user đăng nhập mới gọi được).
   - Key lấy từ secret `GEMINI_API_KEY`, không bao giờ trả về client.
   - Chỉ nhận một danh sách thao tác cố định: `generateLesson`, `generateSentences`, `gradeSentence`,
     `gradeIeltsWriting`, `gradeIeltsSpeaking`, `ieltsChat`, `tts`. Prompt dựng **ở server**, client chỉ
     gửi dữ liệu, nên không ai dùng proxy để gọi Gemini tuỳ ý.
   - Thử lần lượt các model dự phòng như code hiện tại.
2. **Giới hạn tần suất**: bảng `ai_usage (user_id, op, latency_ms, ok, created_at)`; function đếm số lần
   gọi trong 1 giờ theo user và thao tác (ví dụ 60 lần `gradeSentence`, 20 lần `generateLesson`), quá thì
   trả 429 kèm thông báo tiếng Việt. Bảng này cũng là nguồn đo độ trễ p50/p95 thật.
3. **Client** `services/aiClient.ts`: bọc `supabase.functions.invoke('ai-proxy', …)`, có timeout và
   thông báo lỗi thống nhất. Chuyển dần từng service (`geminiService`, `ieltsWritingService`,
   `ieltsSpeakingService`, `ieltsChatService`, `weaknessService`, `recommendationService`).
4. **Dọn dẹp**: bỏ `API_KEY` khỏi `vite.config.ts` và gói `@google/genai` khỏi bundle client, kiểm tra
   bundle không còn chuỗi key, rồi **bạn đổi (rotate) key Gemini** vì key cũ đã từng lộ công khai.

Độ trễ thêm do qua proxy khoảng 100–300 ms, vẫn nằm trong mục tiêu p95 < 4 giây ở 4.2.
TTS trả audio base64 lớn: kiểm tra giới hạn kích thước response của Edge Function khi làm bước 3.

---

## 5. Hạng mục 4 — Thống kê, phân tích học tập

### 5.1 Kết quả rà soát

| # | Vấn đề | Mức độ |
|---|---|---|
| 1 | Biểu đồ "Hoạt động 7 ngày" đếm theo `last_reviewed_at`, nên **mỗi từ chỉ được tính ở ngày ôn gần nhất**. Các ngày cũ bị "mất" số liệu mỗi khi ôn lại | **Sai dữ liệu** |
| 2 | "Cần ôn hôm nay" tính cả từ Mới chưa từng học (do `next_review_date = now()`) | **Sai dữ liệu** |
| 3 | Mỗi từ chưa chấm lần nào hiện "Tỷ lệ: 100%" | Gây hiểu nhầm |
| 4 | Đã tải xu hướng điểm quiz (`getQuizScoreTrend`) nhưng **không hiển thị**. `HeatmapGrid` import nhưng không dùng. Tiêu đề ghi 7 ngày nhưng tải 30 ngày | Lãng phí |
| 5 | Bảng `word_mastery` bị quét **3 lần** mỗi lần mở trang (distribution, total stats, all words), `user_goals` 2 lần | Chậm khi nhiều từ |
| 6 | "Từ khó nhất" xếp theo tổng số lần sai, nên từ học lâu luôn đứng đầu dù giờ đã nhớ | Sai trọng tâm |
| 7 | Không có số liệu IELTS dù đã có `ielts_attempts` | Thiếu |
| 8 | Trang là một cột dài, các số liệu không có so sánh (tuần này so với tuần trước) và ít nút hành động | UX |

### 5.2 Hướng đề xuất
Nguyên tắc: **mỗi con số phải trả lời "tôi đang tiến bộ không?" và dẫn tới một hành động.**

Chia trang thành 3 tab:

**Tab "Tổng quan" (hôm nay)**
- 4 chỉ số chính, mỗi ô có so sánh với 7 ngày trước (▲/▼): *Từ đã ôn tuần này*, *Tỉ lệ nhớ*,
  *Chuỗi ngày*, *Đến hạn hôm nay*.
- Một nút hành động chính theo ngữ cảnh: "Ôn 12 từ đến hạn" / "Học bài mới" / "Luyện 3 câu sai".
- Lịch hoạt động 12 tuần (kiểu GitHub) từ `review_logs`.

**Tab "Từ vựng"**
- **Tỉ lệ nhớ (retention)**: % lần chấm Tốt/Dễ trên từ đã qua giai đoạn học, 30 ngày gần nhất.
  Đây là chỉ số quan trọng nhất của SRS (mục tiêu lành mạnh: 85–90%).
- **Dự báo khối lượng ôn** 7/30 ngày tới (từ `next_review_date`), giúp người học thấy trước ngày bận.
- Phễu trạng thái: Mới → Đang học → Ôn tập → Thành thạo, kèm số từ chuyển cấp trong tuần.
- Tốc độ học: số từ mới mỗi tuần.
- "Từ hay quên": xếp theo **tỉ lệ quên gần đây** (số lần "Lại" trong 30 ngày / số lần ôn).

**Tab "Kỹ năng"**
- Xu hướng điểm quiz và điểm luyện câu (biểu đồ đường, đã có sẵn `LineChart`).
- Nhóm lỗi ngữ pháp hay gặp từ luyện câu, mỗi nhóm có nút "Luyện nhóm lỗi này".
- Band IELTS Writing/Speaking theo thời gian và theo tiêu chí.

**Kỹ thuật**
- Một lần tải `word_mastery` (chỉ các cột cần), một lần tải `review_logs` 90 ngày; mọi phép tính là
  **hàm thuần** trong `analyticsService` có unit test (retention, forecast, streak…).
- Khi dữ liệu lớn (> 5.000 dòng log) thì chuyển sang view/RPC Postgres. Hiện chưa cần.
- Chỉ số nào chưa đủ dữ liệu thì hiện "Cần thêm N lần ôn để tính", không hiện số 0 hay 100% giả.

---

## 6. Hạng mục 5 — Giao diện và trải nghiệm học tập (đã chốt: cả 4 phần)

Làm **sau** các hạng mục 1–4, vì chúng đã thêm màn hình mới; làm UI một lượt cuối giúp đồng bộ
thay vì sửa hai lần.

### 6.1 Toàn app: nền móng giao diện (làm đầu tiên)
- **Thống nhất ngôn ngữ giao diện là tiếng Việt.** Hiện đang lẫn: "Smart Flashcards", "Tap to flip to show
  mean vocab", "Start Reading", "Prev/Next"… Thuật ngữ tiếng Anh chỉ giữ khi là nội dung học.
- **Token thiết kế** trong `tailwind.config` (đang chạy CDN ở `index.html`): bảng màu ngữ nghĩa thống nhất
  cho 5 trạng thái SRS (hiện mỗi màn tự định nghĩa màu riêng: Analytics, MasteryBadge, ReviewSession),
  thang chữ, bán kính, bóng. Gom các badge/nút trạng thái về một component dùng chung.
- **Điều hướng**: thanh tab dưới cùng trên mobile (Học · Ôn tập · Sổ từ · Thống kê · IELTS), có badge
  số từ đến hạn. Hiện người dùng phải quay về Dashboard để đi tiếp.
- **Khả năng truy cập**: vùng chạm ≥ 44px, focus ring khi dùng bàn phím, `aria-label` cho nút chỉ có icon,
  độ tương phản chữ xám nhạt trên nền trắng đạt WCAG AA, tôn trọng `prefers-reduced-motion`
  (thẻ xoay và hiệu ứng bay).
- **Trạng thái tải / lỗi / rỗng** thống nhất: skeleton thay spinner toàn trang, thông báo lỗi có nút thử lại.

### 6.2 Luồng bài học
- **Thanh tiến độ bài học** cố định ở đầu: Flashcard ● Story ● Quiz ● Điền từ ● Luyện câu, cho bấm quay
  lại bước trước, hiện bước nào đã xong.
- **Màn "Tổng kết bài"** (mới, cuối luồng): số từ đã nhớ / cần ôn, điểm quiz, điểm luyện câu, các lỗi
  chính, lịch ôn tới ("Ngày mai ôn 6 từ"). Hai nút: "Lưu và về trang chủ", "Ôn ngay các từ sai".
  Lưu bài **tự động** ở đây thay vì phải bấm nút lưu trong Fill-blank.
- Flashcard: chấm 4 mức như ReviewSession thay vì 2 nút (Đã nhớ / Cần ôn), giữ vuốt trái/phải cho nhanh;
  hiện "Đã chấm 7/10 thẻ" để người học biết còn thẻ chưa chấm trước khi sang Story.
- Fill-blank: dùng `compareSpelling`, chấp nhận "gần đúng" thay vì sai cả câu vì một ký tự.

### 6.3 Ôn tập SRS
- **Phím tắt**: Space lật thẻ, 1–4 chấm, Z hoàn tác lần chấm vừa rồi. Có gợi ý phím trên desktop.
- Mặt trước hiện IPA và nút phát âm (dữ liệu đã có từ migration 002); mặt sau hiện ghi chú cá nhân.
- **Giới hạn phiên**: mặc định tối đa 20 từ mỗi lượt, có "Ôn tiếp 20 từ" ở màn kết thúc, để người có
  200 từ tồn không bị ngợp.
- **Chế độ ôn đa dạng**: lật thẻ (hiện có), gõ từ, viết tay; chọn ở đầu phiên.
- Màn kết thúc: thay "Mức độ tự tin trung bình" bằng số liệu dễ hiểu hơn: "Nhớ 15/20 · 5 từ sẽ gặp lại
  ngày mai", kèm danh sách từ "Lại" để xem lại.

### 6.4 Dashboard
- Đưa **một hành động chính** lên đầu theo trạng thái người học: có từ đến hạn → "Ôn 12 từ (~4 phút)";
  không có → "Học bài mới"; giữa bài → "Tiếp tục bài Du lịch".
- Vòng mục tiêu ngày + streak gọn trong thẻ chính, bỏ các khối trùng với trang Thống kê.
- Khu tạo bài mới: chọn chủ đề/cấp độ dạng chip, hiện thời gian ước tính, mẫu bộ từ có sẵn ở dạng
  cuộn ngang.
- Danh sách bài gần đây kèm tiến độ SRS của từng bài (liên kết với Sổ từ, mục 2.4a).

### 6.5 Kiểm chứng UI
- Chụp màn hình trước/sau từng màn ở 375px và 1280px, sáng/tối.
- Đi hết một vòng: tạo bài → học → luyện câu → tổng kết → ôn tập → sổ từ → thống kê,
  trên trình duyệt thật, không lỗi console.

---

## 7. Thứ tự thực hiện và cách kiểm chứng

> **Đã thay bằng [roadmap-v3.md](roadmap-v3.md)** (2026-10-17): 8 phase, nền móng UI làm đầu tiên,
> thiết kế làm thẳng trong code, số từ mỗi phiên ôn do người dùng chọn. Thứ tự bên dưới chỉ để tham khảo.

```
Đợt 1:  [0 Nền tảng] → [1 Sổ từ SRS + danh sách] → [2 Ghi chữ: gõ / viết tay / ghi chú]
Đợt 2:  [3a Edge Function ai-proxy] → [3b Luyện mẫu câu] → [4 Thống kê]
Đợt 3:  [5.1 Nền móng UI] → [5.2–5.4 Luồng bài học, Ôn tập, Dashboard]
```
Tổng ước lượng khoảng 14–16 ngày làm việc. Giai đoạn 0 nên lên production sớm nhất để
`review_logs` bắt đầu tích luỹ dữ liệu cho dashboard ở hạng mục 4.

**Việc bạn cần làm (mình không tự làm được):**
- Chạy các migration SQL trên Supabase (hoặc cho phép mình chạy qua Supabase MCP sau khi bạn xác nhận
  đúng project).
- Đặt secret `GEMINI_API_KEY` cho Edge Function và **đổi key Gemini** sau khi gỡ key khỏi client.

Mỗi hạng mục là một commit/PR riêng, gồm:
- Migration SQL có `if not exists`, chạy lại được, có RLS.
- Unit/property test cho logic thuần; `tsc --noEmit` sạch; `vite build` thành công.
- Kiểm tra trên trình duyệt (desktop + mobile 375px, sáng/tối) cho mọi màn hình bị đổi.
- Cập nhật [database-schema.md](database-schema.md).

**Rủi ro chính**
| Rủi ro | Giảm thiểu |
|---|---|
| Migration chạy trên DB thật làm hỏng dữ liệu | Chỉ thêm bảng/cột, không đổi kiểu hay xoá; thử trên Supabase branch trước nếu có |
| AI chấm không ổn định | Eval set + schema JSON + so khớp cục bộ trước khi gọi AI |
| Chi phí Gemini tăng | Prefetch một lần mỗi bài, cache trong `lesson_data`, giới hạn tần suất ở Edge Function |
| App.tsx đã ~1.500 dòng | Phase mới tách thành component riêng; không thêm state vào App nếu không cần |

---

## 8. Quyết định đã chốt (2026-10-17)

| Câu hỏi | Quyết định |
|---|---|
| Cải thiện UI/UX ở phần nào? | Cả bốn: luồng bài học, ôn tập SRS, Dashboard, toàn app (mục 6) |
| "List từ" là gì? | Cả hai: danh sách tự động theo bài học/chủ đề **và** bộ từ tự tạo (mục 2.4) |
| Ghi chữ trên flashcard | Gõ từ + ghi chú + **bảng viết tay** không nhận dạng chữ (mục 3) |
| Edge Function giấu API key | Làm cùng hạng mục luyện câu (mục 4.5) |

**Mặc định mình tự chọn, có thể đổi:** chấm luyện câu **ngay từng câu** (không đợi cuối);
5–8 câu mỗi bài; phiên ôn tối đa 20 từ; nét viết tay không lưu lên server.
