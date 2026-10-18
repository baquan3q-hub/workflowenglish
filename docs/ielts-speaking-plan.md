# Kế hoạch: IELTS Speaking — từ "ghi âm và chấm" thành nơi học và thi thử đầy đủ

## 1. Hiện trạng (sau I1–I13)

| Có rồi | Hạn chế |
|---|---|
| 8 gói chủ đề Part 1, 10 cue card, 4 story bank, các chủ đề Part 3 kèm O.R.E.O, 9 bài phát âm (`data/ielts/speakingTopics.ts`, `pronunciation.ts`) | Ít nội dung. Đề thật xoay vòng theo quý (tháng 1, 5, 9) với khoảng 50–60 cue card mỗi quý, mà nội dung ở đây nằm cứng trong code, muốn thêm phải deploy lại |
| Ghi âm, transcribe, chấm AI 4 tiêu chí; chỉ số trôi chảy (từ/phút, filler, khoảng ngừng) | Mỗi lần chỉ chấm một câu trả lời, chưa có vòng "nói lại → so band" như Writing |
| Mock test 3 part, giám khảo đọc câu hỏi bằng TTS | Bộ câu hỏi ghép ngẫu nhiên nên Part 3 không bám chủ đề Part 2; báo cáo chưa trích dẫn bằng chứng |
| Shadowing, thêm từ vào SRS | Chưa có video bài nói mẫu, chưa có nguồn tài nguyên ngoài, chưa có trang admin cho Speaking |

Hướng đi: dùng lại đúng mô hình đã chạy tốt ở Listening. Nội dung lưu trong cơ sở dữ liệu, giáo viên soạn trong trang Quản trị, học viên thấy ngay sau khi bấm xuất bản. Thêm một vòng luyện khép kín: **Học → Luyện từng câu → Nói lại → Thi thử → Sổ lỗi → Tiến bộ**.

## 2. Góc nhìn giảng dạy: người Việt band 5.0–6.5 vướng ở đâu

| Vấn đề | Biểu hiện | Thiết kế giải quyết |
|---|---|---|
| Sợ nói, đứng hình | Im lặng hơn 3 giây, bỏ dở Part 2 sau 40 giây | "Khởi động không chấm" 2 phút; câu đệm để câu giờ ("That's an interesting question…"); nhắc nhẹ khi im lặng; Part 2 có ghi chú và mốc 1:00 |
| Trả lời Part 1 quá ngắn hoặc quá dài | "Yes, I do." hoặc nói 1 phút như Part 2 | Vạch độ dài mục tiêu (2–4 câu, 15–25 giây) hiện ngay sau khi ghi âm |
| Part 3 nông | Chỉ nêu ý kiến, không giải thích, không ví dụ, không xét phía ngược lại | Hỏi vặn kiểu giám khảo thật ("Why do you think so?"); khung O.R.E.O và khung "nhượng bộ" |
| Học thuộc bài mẫu | Giám khảo nhận ra, Fluency và Lexical bị hạ | Story bank cá nhân: người học viết câu chuyện của chính mình, AI chỉ ra câu chuyện đó dùng được cho những cue card nào. Bài mẫu chỉ để phân tích |
| Từ vựng nghèo, lặp "good, bad, very" | Lexical dừng ở 5.5 | Ngân hàng cụm từ theo chức năng (nêu ý kiến, suy đoán, so sánh, rào đón); AI gạch chân từ lặp và gợi ý từ thay thế |
| Ngữ pháp đơn giản, sai thì | Grammar dừng ở 5.5–6 | Sổ lỗi gom theo nhãn (thì, mạo từ, số nhiều, câu phức); bài luyện câu ngắn |
| Phát âm | Mất âm cuối, sai /θ ð ʃ/, trọng âm và ngữ điệu phẳng | Phòng phát âm: cặp âm tối thiểu, shadowing, AI nhận xét bản ghi (nói rõ đây chỉ là ước lượng) |

Nguyên tắc nội dung: tự soạn toàn bộ, không chép sách Cambridge hay bài mẫu của trung tâm. Chủ đề theo quý chỉ lấy *tên chủ đề* đang được chia sẻ công khai, câu hỏi và bài mẫu đều viết lại. Band descriptor diễn giải bằng tiếng Việt.

## 3. Kiến trúc thông tin (đồng bộ với Listening và Writing)

**Speaking Hub** có 4 tab, giống cấu trúc Listening Hub:

- **Học**: bài học theo Part (cấu trúc, chiến lược, lỗi hay gặp); ngân hàng ngôn ngữ; Phòng phát âm; Video mẫu (YouTube kèm mốc thời gian và chú thích).
- **Luyện**: lọc theo Part, chủ đề, loại cue card, "Đề quý này", "Câu tôi làm kém"; story bank cá nhân.
- **Thi thử**: thi đầy đủ (11–14 phút); thi rút gọn Part 2 + 3 (khoảng 8 phút); bộ đề theo quý do giáo viên soạn.
- **Lịch sử**: các lần làm bài và biểu đồ band theo tiêu chí (dùng lại `IeltsAttemptHistory`).

Đầu trang có band ước tính và **một** nút hành động tiếp theo, chọn theo tiêu chí yếu nhất (logic giống `ieltsProgressLogic`).

**Trang Quản trị** thêm tab "Speaking": `Đề Listening | Speaking | Tài nguyên | Kiểm tra AI`.

## 4. Mô hình dữ liệu (migration 012)

```
speaking_items (
  id uuid, kind text check in ('part1_topic','cue_card','part3_theme','mock_set','video_lesson'),
  title text, quarter text null,          -- '2026-Q3' (tháng 9–12), null = luôn hiện
  status text check in ('draft','published'),
  body jsonb,                              -- nội dung theo kind
  created_at, updated_at, created_by
)
speaking_resources (id, title, url, kind 'official'|'video'|'article'|'podcast', skill, note_vi, status, sort)
speaking_stories (id, user_id, title, body, covers jsonb)  -- story bank cá nhân, RLS theo user
```

- RLS giống bảng `listening_library`: ai cũng đọc được bản published; chỉ `app_admins` được ghi. `speaking_stories` chỉ chủ sở hữu được đọc và ghi.
- `body` theo kind:
  - **part1_topic**: `questions[]`, `ideasVi[]`, `vocabulary[]`, `samples{6,7,8}` kèm chú thích.
  - **cue_card**: `category`, `bullets[]`, `notes[]`, `sample`, `vocabulary[]`, `part3ThemeId`, `roundingOff[]`.
  - **part3_theme**: `questions[]` mỗi câu có `type` (opinion, compare, predict, cause/solution), `sample` dùng O.R.E.O.
  - **mock_set**: `part1TopicIds[3]`, `cueCardId`, `part3Questions[]`.
  - **video_lesson**: `youtube`, `segments[]` (mốc thời gian), `notesVi`.
- Nội dung tĩnh hiện có được nạp vào làm dữ liệu khởi đầu. Bảng chưa có thì app vẫn dùng dữ liệu tĩnh (giống cách Listening ẩn mục "Đề luyện thêm").
- `ielts_attempts.details` thêm các trường optional: `answers[{questionId, transcript, durationSec, metrics, feedback}]` và `retakeOf`.

## 5. Các phase

Mỗi phase là một commit, sau khi vitest, tsc, Deno typecheck và build đều pass, và đã kiểm tra trên giao diện ở desktop và mobile 375 px, sáng và tối.

### S1 — Nền dữ liệu và Hub mới
- Migration 012; `speakingLibraryLogic.ts` (thuần, có test: kiểm định nội dung, gom theo quý) và `speakingLibraryService.ts`.
- Kiểu dữ liệu dùng chung cho cả nội dung tĩnh và nội dung từ DB; hàm `mergeContent(static, db)`.
- Dựng lại `IeltsSpeakingHub` theo 4 tab ở mục 3, có bộ lọc "Đề quý này".
- **Xong khi**: Hub hiện đủ nội dung cũ, lọc được theo Part, chủ đề và quý; chưa chạy migration thì vẫn hoạt động.

### S2 — Trang Quản trị Speaking
Dùng lại khung `IeltsAdmin`, `LibraryList` và mẫu editor theo bước của Listening.
- Các bước của editor: Thông tin (kind, quý, chủ đề) → Câu hỏi → Ý tưởng và từ vựng → Bài mẫu band 6/7/8 kèm chú thích → Liên kết (cue card nối với chủ đề Part 3) → Kiểm tra → Xuất bản.
- **Bước Kiểm tra** chặn xuất bản khi:
  - Part 1 có ít hơn 4 câu hỏi.
  - Độ dài bài mẫu lệch chuẩn: Part 1 khoảng 40–70 từ, Part 2 khoảng 220–300 từ, Part 3 khoảng 80–130 từ.
  - Cue card thiếu bullet hoặc thiếu liên kết Part 3.
  - Mock set thiếu thành phần.
  - Như ở Listening, đề đang xuất bản không được lưu đè khi còn lỗi.
- Nút **"AI soạn nháp"** (op `speakingDraft`): chỉ điền những ô còn trống (ý tưởng, từ vựng, bài mẫu ba band). Giáo viên duyệt lại trước khi xuất bản.
- Tab **Tài nguyên**: danh sách link ngoài, có sắp xếp, ẩn/hiện, ghi chú tiếng Việt.
- **Video mẫu**: dán link YouTube và đánh mốc bằng `TimestampMarker` có sẵn (ví dụ "0:45 câu trả lời Part 2 band 7"), kèm ghi chú.

### S3 — Mở rộng nội dung (làm song song với S2, nhập qua trang Quản trị)
| Loại | Hiện có | Mục tiêu |
|---|---|---|
| Chủ đề Part 1 | 8 | 40 (20 chủ đề cố định như work/study/hometown, 20 chủ đề theo quý) |
| Cue card Part 2 | 10 | 60, chia đều 5 loại; mỗi card có ghi chú mẫu và bài mẫu band 7 |
| Story bank | 4 | 12, phủ khoảng 80% số cue card |
| Chủ đề Part 3 | khoảng 7 | 30, mỗi chủ đề nối với ít nhất 2 cue card |
| Bộ mock theo quý | 0 | 6 mỗi quý |
| Bài phát âm | 9 | 25 (âm cuối, -ed/-s, /θ ð/, /ʃ s/, /v w/, nguyên âm dài/ngắn, trọng âm từ, trọng âm câu, nối âm, ngữ điệu) |
| Ngân hàng ngôn ngữ | — | 8 chức năng: nêu ý kiến, giải thích, ví dụ, so sánh, suy đoán, rào đón, câu giờ, kết luận |

Bài mẫu có 3 mức để so sánh song song (giống bài mẫu Writing), chú thích rõ vì sao bài band 7 hơn bài band 6. Mỗi bài mẫu có audio TTS (cache theo hash, như Listening) để shadowing.

**Tài nguyên ngoài** (chỉ để link, không chép nội dung):
- Đề mẫu và hướng dẫn chính thức: ielts.org, British Council (IELTS Ready / Road to IELTS), IDP.
- Kênh phát âm: BBC Learning English (The Sounds of English).
- Video phỏng vấn mẫu do giáo viên chọn và đánh mốc.

### S4 — Luyện từng câu 2.0: vòng nói lại
- **Luồng một câu**: nghe câu hỏi (giọng giám khảo) → chuẩn bị (Part 2: 1 phút, có ô ghi chú) → ghi âm → chỉ số tức thì (độ dài, từ/phút, filler, khoảng ngừng) → AI nhận xét câu đó → **"Nói lại"** → hiện chênh lệch band và so sánh hai transcript (dùng lại phần diff của vòng viết lại Writing) → mở bài mẫu.
- **Part 3 có hỏi vặn**: op `speakingFollowUp` đọc transcript và sinh 1 câu hỏi tiếp kiểu giám khảo ("Why?", "Is that true everywhere?"), tối đa 2 lượt.
- **Nhận xét trên transcript**: gạch chân từ lặp, câu sai ngữ pháp kèm nhãn lỗi (dùng `errorCategories`), gợi ý từ thay thế để nâng Lexical.
- **Chế độ "Khởi động không chấm"**: chỉ ghi âm, nghe lại, xem chỉ số; không gọi AI, không lưu điểm.

### S5 — Thi thử sát đề thật
- **Kịch bản giám khảo** theo trình tự thật:
  - Mở đầu: chào, hỏi tên.
  - Part 1: 3 chủ đề, khoảng 4 câu mỗi chủ đề, 4–5 phút.
  - Part 2: 1 phút chuẩn bị, nói 2 phút, **bị ngắt đúng ở 2:00**, rồi 1–2 câu rounding-off.
  - Part 3: 4–6 câu nối chủ đề Part 2, 4–5 phút.
  - Không được dừng, không nghe lại.
- **Nguồn đề**: bộ mock theo quý do giáo viên soạn, hoặc ghép tự động có kiểm tra liên kết (cue card → chủ đề Part 3 tương ứng).
- **Chấm**: transcribe từng câu, chấm cả bài một lượt (tiết kiệm lượt AI). Báo cáo gồm:
  - Band từng tiêu chí, mỗi tiêu chí trích **bằng chứng** từ chính câu trả lời ("Part 3 câu 2: …").
  - Nghe lại từng câu.
  - 3 ưu tiên cải thiện, mỗi ưu tiên kèm bài học và bài luyện.
- Có bản **thi rút gọn** Part 2 + 3 cho ngày bận.
- `speakingMockLogic.ts` (thuần, có test): dựng kịch bản, ghép đề, tính thời lượng.

### S6 — Phòng phát âm
- Mỗi bài gồm: giải thích ngắn → cặp âm tối thiểu (nghe TTS, chọn từ đúng) → câu luyện → ghi âm.
- Op `pronunciationCheck` gửi audio kèm câu mục tiêu, AI chỉ ra âm hoặc từ có vấn đề và nhận xét trọng âm, ngữ điệu. Giao diện ghi rõ "nhận xét ước lượng, không thay thế giáo viên".
- Shadowing nâng cấp: phát bản mẫu ↔ bản của mình theo từng câu, đặt hai đường sóng âm cạnh nhau.

### S7 — Cá nhân hoá và theo dõi
- **Story bank cá nhân**: người học viết 6–8 câu chuyện của mình; AI (op `storyCoverage`) gợi ý mỗi câu chuyện dùng được cho cue card nào và cần thêm chi tiết gì. Không viết thay.
- **Sổ lỗi Speaking**: gom vào Sổ lỗi chung (I9), thêm các nhãn riêng của Speaking: trả lời quá ngắn, nhiều filler, lặp từ, lỗi phát âm.
- **IELTS Home**: mục tiêu tuần cho Speaking, nhắc ôn từ vựng chủ đề trong SRS, hiện "đề quý mới" khi sang quý.

### S8 — Độ tin cậy và chi phí AI
- `scripts/eval-speaking.ts`: chấm cùng một bộ transcript mẫu (có band do giáo viên chấm) 3 lần. Mục tiêu: lệch tối đa 0.5 band và trung bình lệch so với giáo viên không quá 0.5.
- Giới hạn lượt riêng cho từng op mới, ghi rõ trong panel "Kiểm tra AI".
- TTS cache theo hash nội dung (dùng chung cơ chế của Listening), nên câu hỏi giám khảo và bài mẫu chỉ sinh một lần.

## 6. Thứ tự và phụ thuộc

```
S1 ─┬─ S2 ── S3 (nhập nội dung liên tục)
    ├─ S4 ── S5
    └─ S6
S4 + S5 ── S7 ── S8
```
Đề xuất làm theo thứ tự S1 → S2 → S4 → S5 → S6 → S7 → S8, còn S3 nhập nội dung dần trong suốt quá trình. S2 nên đi trước vì sau đó mọi nội dung đều nhập qua giao diện, không phải sửa code.

## 7. Việc bạn cần tự làm
- Chạy migration 012 trong SQL Editor (sau 009–011).
- Deploy `ai-proxy` sau S2, S4, S6 và S7 (mỗi phase có op mới).
- Duyệt nội dung AI soạn nháp trước khi xuất bản; chọn video YouTube cho mục Video mẫu.
