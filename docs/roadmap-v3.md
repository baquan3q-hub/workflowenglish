# Lộ trình thực thi v3: chia phase code và thiết kế

> Ngày lập: 2026-10-17 · Nguồn: [upgrade-plan-v3.md](upgrade-plan-v3.md) · Schema: [database-schema.md](database-schema.md)

## Quyết định đã chốt (bổ sung cho mục 8 của kế hoạch v3)

| Câu hỏi | Quyết định |
|---|---|
| Thiết kế giao nộp ở dạng nào? | **Thiết kế thẳng trong code.** Mỗi phase có một mục "Thiết kế" mô tả màn hình, component, trạng thái. Bạn duyệt trên preview (`npm run dev`), góp ý, mình sửa trong cùng phase. |
| Thứ tự UI | **Đưa nền móng UI lên đầu** (Phase 1). Các màn mới (Sổ từ, Luyện câu, Thống kê) dùng luôn token và component chung, không phải sửa lần hai. |
| Số từ mỗi phiên ôn | **Người dùng tự chọn** 10 / 20 / 30 / 50, mặc định 20 (code hiện tại cố định 30). |
| Chạy migration SQL | **Bạn tự chạy** trong Supabase SQL Editor. Mình viết file SQL chạy lại được (`if not exists`), có RLS, và báo trước phase nào cần migration nào. |

## Đối chiếu kế hoạch với code hiện tại

Bản cập nhật `c1dd63f` (từ máy khác) đã làm sẵn một phần kế hoạch. Phần đó được bỏ khỏi các phase dưới đây:

| Kế hoạch v3 | Hiện trạng | Xử lý |
|---|---|---|
| `compareSpelling` (mục 3.3) | Đã có `reviewLogic.gradeTypedAnswer` (OSA, gần đúng / sai chính tả / sai dạng từ) | Dùng lại. Chỉ viết thêm `spellingDiff` để tô từng ký tự sai |
| Phím tắt ôn tập (6.3) | Đã có Space/Enter lật thẻ, 1–4 chấm, Enter nhận gợi ý | Chỉ thêm **Z hoàn tác** |
| Ôn bằng gõ từ (6.3) | Đã có: tự bật cho từ Ôn tập / Thành thạo / Đã quên có nghĩa tiếng Việt | Thêm bộ chọn chế độ ở đầu phiên |
| IPA trên thẻ ôn (1.1) | Đã hiện IPA ở cả hai mặt | Xong |
| Flashcard chấm 4 mức (6.2) | Chỉ có 2 nút nhanh (Nhớ = 2, Quên = 0) + vuốt 2 hướng | Thay bằng `RatingButtons` 4 mức (Phase 3), thêm "Đã chấm 7/10 thẻ" |
| Fill-blank chấp nhận gần đúng (6.2) | Đã dùng `gradeTypedAnswer` | Chỉ hiện chỗ sai bằng `spellingDiff` |
| Giai đoạn 0 (nền tảng) | Xong (`0916fda`, `bc0f510`) | **Bạn cần chạy** `docs/migrations/005_review_logs.sql`, nếu chưa chạy thì `review_logs` không ghi được |

## Tổng quan các phase

```
P1 Nền móng UI ──┬─> P2 Sổ từ SRS ──> P3 Ôn tập + ghi chữ trên flashcard
                 │
                 └─> P4 ai-proxy ──> P5 Luyện câu ──> P6 Luồng bài học + Tổng kết
                                                            │
                         (review_logs tích luỹ từ bây giờ)  v
                                              P7 Thống kê ──> P8 Dashboard + kiểm chứng cuối
```

| Phase | Nội dung | Migration bạn cần chạy | Việc khác của bạn | Ước lượng |
|---|---|---|---|---|
| 1 | Nền móng UI: token, component chung, thanh điều hướng, Việt hoá, truy cập | 005 (nếu chưa) | Duyệt giao diện | 2 ngày |
| 2 | Sổ từ SRS + danh sách theo bài + bộ từ tự tạo | 006 `word_lists` | — | 2.5 ngày |
| 3 | Ôn tập SRS + gõ từ / viết tay / ghi chú trên flashcard | — | — | 2.5 ngày |
| 4 | Edge Function `ai-proxy`, giấu API key | 007 `ai_usage` | Đặt secret, deploy function, **đổi key Gemini** | 2 ngày |
| 5 | Luyện mẫu câu cuối bài | 008 `sentence_attempts` | Chấm nhãn bộ eval (40 câu) | 2.5 ngày |
| 6 | Luồng bài học: thanh tiến độ, màn Tổng kết bài | — | — | 1.5 ngày |
| 7 | Thống kê 3 tab | — | — | 2 ngày |
| 8 | Dashboard + kiểm chứng toàn app | — | Đi thử một vòng | 1 ngày |

Tổng khoảng **16 ngày làm việc**. P2–P3 và P4–P5 là hai nhánh độc lập, có thể làm song song nếu cần.

**Mỗi phase là một commit riêng** và đạt các điều kiện sau mới coi là xong:
- `npx vitest run` qua hết, `npx tsc --noEmit` sạch, `npx vite build` thành công.
- Mình kiểm tra trên preview ở 375px và 1280px, sáng và tối, console không có lỗi.
- Logic thuần (tính toán, so khớp, ánh xạ trạng thái) có unit test; logic có bất biến thì có property test.
- Cập nhật `docs/database-schema.md` nếu có migration, và `docs/context.md` nếu đổi luồng.

---

## Phase 1: Nền móng UI

Làm trước để mọi màn mới dùng chung một bộ màu và component. **Không đổi hành vi**, chỉ đổi giao diện.

### Thiết kế
- **Token màu ngữ nghĩa** cho 5 trạng thái SRS. Hiện mỗi màn tự định nghĩa màu riêng (MasteryBadge, AnalyticsDashboard, ReviewSession):

  | Trạng thái | Màu | Ghi chú |
  |---|---|---|
  | Mới | slate | |
  | Đang học | amber | |
  | Ôn tập | blue | |
  | Thành thạo | emerald | |
  | Đã quên | rose | |
  | Tạm ẩn | zinc, nét đứt | |

  Thêm 4 màu chấm điểm (Lại / Khó / Tốt / Dễ). Mỗi màu có biến thể nền nhạt, chữ và viền, cho cả chế độ sáng và tối.
- **Thang chữ, bán kính, bóng**: 3 cỡ tiêu đề, 2 cỡ thân, 1 cỡ chú thích. Bán kính `lg` cho nút và `2xl` cho thẻ. 2 mức bóng.
- **Thanh điều hướng**:
  - Mobile: tab cố định ở đáy với 5 mục **Học · Ôn tập · Sổ từ · Thống kê · IELTS**. Tab Ôn tập có badge số từ đến hạn.
  - Desktop: các mục nằm trên header.
  - Mục Sổ từ tạm trỏ tới Sổ tay trong trang Thống kê, đến P2 thì đổi sang màn riêng.
  - Thanh tự ẩn khi đang trong bài học và phiên ôn, để không che nút chấm.
- **Trạng thái tải / lỗi / rỗng** thống nhất: skeleton theo hình nội dung, khối lỗi có nút "Thử lại", khối rỗng có hình minh hoạ nhỏ và một nút hành động.
- **Việt hoá** toàn bộ chữ giao diện. Ví dụ: "Smart Flashcards", "Tap to flip…", "Start Reading", "Prev/Next" chuyển sang tiếng Việt. Từ tiếng Anh chỉ giữ khi là nội dung học.
- **Truy cập**:
  - Vùng chạm ≥ 44px, `focus-visible` ring.
  - `aria-label` cho nút chỉ có icon.
  - Chữ xám đạt tương phản WCAG AA.
  - `prefers-reduced-motion` tắt hiệu ứng xoay thẻ và hiệu ứng bay.

### Code
- `index.html`: mở rộng `tailwind.config` (đang chạy CDN) bằng biến CSS `--srs-*`, `--rate-*`, có bộ giá trị riêng cho `.dark`.
- `components/ui/`:
  - `StatusBadge` (thay `MasteryBadge`), `RatingButtons` (dùng chung cho Flashcards và ReviewSession).
  - `Button`, `Tabs`, `Skeleton`, `EmptyState`, `ErrorState`.
  - `Sheet`: bottom sheet trên mobile, panel phải trên desktop, cần cho P2.
  - `Toast` có nút hành động, cần cho "Hoàn tác" ở P2.
- `components/AppNav.tsx`: đặt ngoài `App.tsx`, nhận `phase` và `dueCount`. `App.tsx` chỉ thêm phần render.
- `services/preferencesService.ts`: lưu tuỳ chọn theo từng user trong localStorage (cùng kiểu với nháp bài học). Có try/catch, đọc lỗi thì dùng mặc định. P3 và P6 dùng để lưu số từ mỗi phiên, chế độ ôn, "bắt buộc gõ".
- Thay màu tự định nghĩa trong `Flashcards`, `ReviewSession`, `AnalyticsDashboard`, `MasteryBadge`, `Dashboard` bằng token.
- Test: `preferencesService` (đọc hỏng, khác user).

### Nghiệm thu
- Ảnh chụp trước/sau các màn: Dashboard, Flashcards, Ôn tập, Thống kê. Mỗi màn chụp ở 375px và 1280px, sáng và tối.
- Không còn chuỗi giao diện tiếng Anh, trừ nội dung học.
- Đi hết app được bằng bàn phím, lúc nào cũng thấy focus.

---

## Phase 2: Sổ từ SRS

Cần: P1, migration 005 (dùng `is_suspended` và `review_logs`), migration 006.

### Thiết kế
- **Màn Sổ từ** (`AppPhase.VOCAB_LIBRARY`), bố cục theo mục 2.2 kế hoạch v3:
  - Ô tìm kiếm, tìm theo từ hoặc nghĩa.
  - Chip lọc trạng thái có số đếm: Tất cả · Đến hạn · Đang học · Ôn tập · Thành thạo · Đã quên · Tạm ẩn.
  - Sắp xếp: hạn ôn / ngày thêm / độ khó / A–Z.
  - Hàng từ gọn: checkbox, từ, IPA, nghĩa, badge trạng thái, hạn ôn tương đối ("3 ngày", "⏰ đến hạn").
- **Dải danh sách**: dải chip cuộn ngang trên mobile, thanh bên trên desktop. Gồm Tất cả, nhóm "Theo bài học" (chủ đề · ngày) và nhóm "Bộ từ của tôi" (màu + tên), cuối dải có chip "＋ Tạo bộ mới".
  - Mỗi bộ hiện tiến độ, ví dụ "8/12 từ đã Ôn tập trở lên".
- **Thanh hành động** dính đáy, hiện khi có từ được chọn: "Đã chọn 5 từ" · ▶ Ôn ngay · Đổi trạng thái ▾ · Thêm vào bộ ▾ · Ẩn.
- **Chi tiết từ** hiện trong `Sheet`, gồm:
  - Metadata đầy đủ và nút phát âm.
  - Ghi chú cá nhân (sửa được, xem P3).
  - Dòng thời gian ôn tập lấy từ `review_logs` (ngày, nguồn, mức chấm, khoảng cách trước → sau).
  - Lần ôn tới.
  - Nút đổi trạng thái và nút thêm vào bộ.
- **Hoàn tác**: đổi trạng thái hoặc ẩn từ thì hiện toast 5 giây có nút "Hoàn tác", không dùng hộp xác nhận.
- **Hộp tạo / sửa bộ**: tên (1–60 ký tự), chọn 1 trong 8 màu. Có xoá bộ, kèm câu "Từ và tiến độ học vẫn giữ nguyên".
- **Trạng thái rỗng**:
  - Chưa có từ nào: hiện nút "Tạo bài học đầu tiên".
  - Bộ lọc không có kết quả: hiện nút "Xoá bộ lọc".
- Flashcard có nút ⭐ "Lưu vào bộ…" mở danh sách bộ để chọn.

### Code
- `docs/migrations/006_word_lists.sql`: hai bảng `word_lists` và `word_list_items`. RLS kiểm tra quyền qua `word_lists.user_id`. Thêm trigger cập nhật `updated_at` (thiết kế ở mục 2.4 kế hoạch v3).
- `services/srsStatusLogic.ts` (thuần):
  - `manualStatusPatch(record, target, now)` theo bảng 2.3 của kế hoạch v3.
  - Property test: kết quả nhất quán với trạng thái đích và không bao giờ đổi metadata.
- `reviewService.applyManualStatus(...)`:
  - Upsert, ghi log với `source='manual'`, `rating=null`.
  - Trả về bản chụp trước khi đổi để hoàn tác. Hoàn tác thì ghi lại bản chụp đó và xoá dòng log vừa thêm (RLS cho phép xoá dòng của chính mình).
- `services/vocabLibraryService.ts`:
  - Một lần tải `word_mastery`, chỉ lấy các cột cần.
  - Hàm thuần `filterWords`, `sortWords`, `searchWords` có test.
  - Danh sách ảo hoá khi có hơn 200 từ (tự viết windowing đơn giản, không thêm thư viện).
- `services/lessonListService.ts`: tách `learning_history.words`, chuẩn hoá bằng `normalizeWord`, ghép với `word_mastery`, gộp theo `topic`. Hàm thuần, có test.
- `services/wordListService.ts`: CRUD bộ từ, thêm và xoá từ hàng loạt.
- `masteryService`: các truy vấn đến hạn loại `is_suspended = true`. Nếu cột chưa có (chưa chạy 005) thì không lọc, chỉ cảnh báo.
- `ReviewSession` nhận prop `words?: WordMasteryRecord[]` cho "Ôn theo lựa chọn". Ôn trước hạn vẫn đi qua `applyRating` như bình thường.
- `AnalyticsDashboard`: bỏ Sổ tay, thay bằng một liên kết sang Sổ từ. Màn này cũng hết phải tải toàn bộ bảng.

### Nghiệm thu
- Đổi 5 từ sang Thành thạo rồi Hoàn tác: `word_mastery` trở về đúng như cũ, `review_logs` không còn dòng thừa.
- Từ Tạm ẩn không xuất hiện trong "Đến hạn" và phiên ôn.
- Xoá một bộ không làm mất dòng nào của `word_mastery`.

---

## Phase 3: Ôn tập SRS và ghi chữ trên flashcard

Cần: P1. Có P2 thì tốt hơn (ghi chú hiện trong Sổ từ), nhưng không bắt buộc.

### Thiết kế
- **Khu vực dưới thẻ** trong Flashcards có 3 tab **Gõ từ · Viết tay · Ghi chú**, theo mục 3.2 kế hoạch v3.
  - **Gõ từ**:
    - Ô nhập lớn, Enter để kiểm tra.
    - Kết quả có 3 màu: Đúng / Gần đúng / Sai. Bản so sánh tô từng ký tự sai.
    - Nút chấm gợi ý được làm nổi bật: Tốt khi đúng, Khó khi gần đúng, Lại khi sai.
    - Tuỳ chọn "Chép lại 3 lần".
  - **Viết tay**:
    - Bảng kẻ dòng như vở tập viết.
    - Công tắc chế độ "Theo mẫu" / "Từ trí nhớ".
    - Thanh công cụ: Hoàn tác, Xoá, độ dày nét (3 mức), Bút/Tẩy.
    - Nút "So sánh" phủ đáp án lên nét viết, sau đó hiện 4 nút tự chấm.
  - **Ghi chú**: ô nhập tự lưu kèm trạng thái "Đang lưu…" / "Đã lưu ✓". Placeholder gợi ý viết mẹo nhớ.
- Flashcards dùng `RatingButtons` 4 mức (Lại · Khó · Tốt · Dễ) thay cho 2 nút nhanh hiện tại; vuốt trái/phải vẫn là Lại/Tốt.
- Dòng "Đã chấm 7/10 thẻ" ở đầu Flashcards. Khi bấm sang Story mà còn thẻ chưa chấm thì nhắc một lần.
- **Ôn tập**:
  - **Màn bắt đầu phiên**: chọn chế độ (Tự động · Lật thẻ · Gõ từ · Viết tay) và số từ (10 / 20 / 30 / 50). Lần sau nhớ lựa chọn.
  - Mặt sau thẻ hiện ghi chú cá nhân.
  - Phím **Z hoàn tác** lần chấm vừa rồi. Trên desktop có dải gợi ý phím.
  - **Màn kết thúc**: "Nhớ 15/20 · 5 từ sẽ gặp lại ngày mai", danh sách các từ đã chấm "Lại" (bấm để xem), nút "Ôn tiếp N từ". Bỏ dòng "Mức độ tự tin trung bình".
- Cài đặt **"Bắt buộc gõ trước khi lật"** (mặc định tắt).

### Code
- `reviewLogic.spellingDiff(input, target)`: căn chỉnh hai chuỗi, trả về `[{ch, op: 'same'|'sub'|'ins'|'del'}]`. Property test: ghép phần `same`/`sub`/`del` phải ra đúng từ đích. Dùng trong Flashcards, ReviewSession và FillBlank.
- `components/HandwritingPad.tsx`:
  - `<canvas>` với Pointer Events (`pressure`, `pointerType`), `touch-action: none`.
  - Vẽ lại theo `devicePixelRatio`. Nét lưu dạng mảng điểm trong state để hoàn tác.
  - Không dùng thư viện, không lưu nét lên server.
- `components/FlashcardWorkspace.tsx` chứa 3 tab. Khi ô nhập có focus thì `stopPropagation` để tắt vuốt và tắt lật thẻ.
- `services/noteService.ts`: `savePersonalNote(userId, word, note)` có debounce 800 ms, chỉ cập nhật cột `personal_note`.
- Các nguồn chấm mới đều gọi `applyRating`:
  - Gõ từ: `source: 'spelling'`.
  - Viết tay: `source: 'handwriting'`.
  - Cả hai đặt `creditGoal: false` khi thẻ đã được chấm trong cùng bài, để không cộng mục tiêu hai lần.
- `ReviewSession`:
  - Thay `REVIEW_BATCH_SIZE` bằng tuỳ chọn trong `preferencesService`.
  - Thêm prop `mode`.
  - Hoàn tác giữ bản chụp của lần chấm trước: ghi lại bản chụp, xoá dòng log vừa thêm, lùi chỉ số thẻ.

### Nghiệm thu
- Gõ `recieve` cho từ `receive`: hiện Gần đúng, tô đúng cặp `ie`/`ei`, gợi ý Khó.
- Viết tay dùng được bằng ngón tay trên mobile (375px) mà trang không bị cuộn. Nét sắc trên màn hình retina.
- Ghi chú lưu xong vẫn còn khi tải lại trang, và hiện ở mặt sau thẻ ôn.
- Chấm rồi bấm Z thì `word_mastery` trở về đúng như cũ.

---

## Phase 4: Edge Function `ai-proxy`

Cần: migration 007. Làm trước P5 vì luyện câu làm số lần gọi Gemini tăng gấp đôi.

### Thiết kế
- Thông báo lỗi AI thống nhất bằng tiếng Việt, có nút "Thử lại":
  - Hết lượt (429): "Bạn đã dùng hết lượt chấm trong giờ này, thử lại sau HH:MM".
  - Hết thời gian chờ.
  - Mất mạng.
- Dùng `ErrorState` và `Toast` từ P1, không thêm màn hình mới.

### Code
- `supabase/functions/ai-proxy/index.ts` (Deno), theo mục 4.5 kế hoạch v3:
  - Xác thực JWT. Key lấy từ secret `GEMINI_API_KEY`.
  - Chỉ nhận danh sách thao tác cố định. Prompt dựng ở server.
  - Tự chuyển model dự phòng. Ghi `ai_usage`.
  - Giới hạn tần suất theo giờ, theo user và theo thao tác.
- `docs/migrations/007_ai_usage.sql`: bảng `ai_usage`. RLS cho user chỉ đọc dòng của mình. Function ghi bằng service role.
- `services/aiClient.ts`: `invokeAi(op, payload, {timeoutMs})`, chuẩn hoá lỗi thành `AiError {kind: 'rate_limit'|'timeout'|'network'|'server', retryAt?}`.
- Chuyển từng service, mỗi service kiểm tra trên preview rồi mới sang service tiếp:
  1. `geminiService`
  2. `ieltsWritingService`
  3. `ieltsSpeakingService`
  4. `ieltsChatService`
  5. `weaknessService`
  6. `recommendationService`
  7. TTS (đo kích thước response trước)
- Dọn dẹp:
  - Bỏ `API_KEY` khỏi `vite.config.ts` và bỏ `@google/genai` khỏi bundle client.
  - Kiểm tra `dist/` không còn chuỗi `AIza`.

### Việc của bạn
Mình sẽ đưa lệnh cụ thể khi tới phase này:
1. Cài Supabase CLI.
2. Chạy `supabase secrets set GEMINI_API_KEY=...`.
3. Chạy `supabase functions deploy ai-proxy`.
4. **Tạo key Gemini mới và thu hồi key cũ**, vì key cũ đã lộ trong bundle.

### Nghiệm thu
- Gọi function không có JWT thì nhận 401. Gọi thao tác ngoài danh sách thì nhận 400.
- Đủ các luồng tạo bài, chấm IELTS Writing/Speaking, chat và TTS đều chạy qua proxy.
- Không còn key trong `dist/`.

---

## Phase 5: Luyện mẫu câu

Cần: P4 và migration 008.

### Thiết kế
- **Bước "Luyện câu"** (`AppPhase.SENTENCE_PRACTICE`) đặt sau Fill-blank, theo mục 4.1 kế hoạch v3.
  - Mỗi câu một thẻ: câu tiếng Việt, chip từ mục tiêu, CEFR, ô viết câu tiếng Anh, nút "Chấm".
  - Bấm Chấm thì skeleton "Đang chấm…" hiện ngay, và người học viết được câu tiếp theo trong lúc chờ.
  - **Kết quả**:
    - Nhãn Đúng / Chấp nhận được / Cần sửa.
    - Bản sửa tối thiểu, phần sửa được tô đậm.
    - Giải thích ngắn bằng tiếng Việt.
    - ✓/✗ cho biết đã dùng đúng từ mục tiêu chưa.
    - Câu mẫu, mặc định thu gọn.
  - **Cuối phần**: tổng kết lỗi theo nhóm (thì, mạo từ, giới từ, dùng từ, trật tự từ) và nút "Luyện lại câu sai".
- Bài cũ chưa có câu luyện thì hiện nút "Tạo câu luyện", không chặn luồng.

### Code
- Thao tác `generateSentences`:
  - Gọi chạy nền ngay sau khi tạo bài.
  - Kết quả lưu vào `lessonData.sentencePractice`, kèm 1–3 bản dịch tham chiếu cho mỗi câu.
  - Kiểm tra schema JSON, sai thì thử lại một lần.
- `services/sentenceLogic.ts` (thuần):
  - `normalizeSentence` xử lý dấu câu, viết hoa, viết tắt.
  - `matchReference` khớp được thì chấm "Đúng" tại chỗ, không gọi AI.
  - Có test.
- Thao tác `gradeSentence`: `thinkingBudget: 0`, temperature thấp, output JSON có schema cố định, timeout 10 giây.
- `views/SentencePractice.tsx` và `services/sentenceService.ts`, ghi vào `sentence_attempts`.
- Dùng sai từ mục tiêu thì gọi `applyRating` với `rating: 1`, `source: 'sentence'`, `creditGoal: false`.
- `docs/migrations/008_sentence_attempts.sql`.
- Bộ eval:
  - Mình soạn khoảng 40 cặp câu trong `tests/eval/sentences.json`, **bạn chấm nhãn**.
  - `scripts/eval-sentences.ts` gọi thao tác chấm trên function thật, in tỉ lệ khớp nhãn và độ trễ p50/p95.
  - Script này không chạy trong `vitest`, vì gọi API thật.

### Nghiệm thu
- Tới bước luyện câu không phải chờ tạo đề.
- Câu khớp bản dịch tham chiếu được chấm Đúng ngay lập tức.
- Bộ eval khớp nhãn ≥ 90%. Độ trễ đo trong `ai_usage`: p50 < 2 giây, p95 < 4 giây.

---

## Phase 6: Luồng bài học và màn Tổng kết bài

Cần: P5, vì thanh tiến độ có bước Luyện câu.

### Thiết kế
- **Thanh tiến độ** cố định ở đầu bài: Flashcard ● Story ● Quiz ● Điền từ ● Luyện câu.
  - Bước xong có dấu ✓, bước hiện tại được tô.
  - Bấm vào để quay lại bước đã qua.
  - Mobile: dạng chấm tròn kèm tên bước hiện tại.
- **Màn "Tổng kết bài"**:
  - Số từ đã nhớ / cần ôn.
  - Điểm quiz và điểm luyện câu.
  - 3 lỗi chính.
  - Lịch ôn tới, ví dụ "Ngày mai ôn 6 từ".
  - Hai nút: "Về trang chủ" và "Ôn ngay các từ sai".
  - Bài được **lưu tự động** khi vào màn này.

### Code
- `components/LessonStepper.tsx`. Trạng thái các bước suy ra từ dữ liệu đã có (thẻ đã chấm, `quiz_score`, `fill_blank` đã nộp), không thêm state mới vào `App.tsx`.
- `views/LessonSummary.tsx`: gọi luồng lưu bài đã gom ở `c7d1946`. Bỏ nút lưu riêng trong FillBlank.
- Hàm thuần `summarizeLesson(...)` có test.

### Nghiệm thu
- Đi hết một bài không cần bấm "Lưu".
- Quay lại một bước rồi đi tiếp không làm mất điểm đã có và không lưu bài hai lần.

---

## Phase 7: Thống kê

Cần: P1. `review_logs` nên tích luỹ được vài tuần (chạy migration 005 càng sớm càng tốt). P5 cung cấp số liệu luyện câu.

### Thiết kế
3 tab, theo mục 5.2 kế hoạch v3:
- **Tổng quan**:
  - 4 ô chỉ số, mỗi ô có ▲/▼ so với 7 ngày trước.
  - Một nút hành động chính theo ngữ cảnh.
  - Lịch hoạt động 12 tuần kiểu GitHub (dùng lại `HeatmapGrid`).
- **Từ vựng**:
  - Tỉ lệ nhớ 30 ngày, kèm vùng mục tiêu 85–90%.
  - Dự báo khối lượng ôn 7/30 ngày tới.
  - Phễu trạng thái.
  - Số từ mới mỗi tuần.
  - "Từ hay quên" xếp theo tỉ lệ quên gần đây. Bấm vào một từ thì mở chi tiết từ trong Sổ từ.
- **Kỹ năng**:
  - Xu hướng điểm quiz và điểm luyện câu.
  - Nhóm lỗi ngữ pháp, mỗi nhóm có nút "Luyện nhóm lỗi này".
  - Band IELTS theo thời gian và theo tiêu chí.
- Chỉ số chưa đủ dữ liệu thì hiện "Cần thêm N lần ôn để tính", không hiện số 0 hay 100% giả.

### Code
- `services/analyticsLogic.ts` (thuần, có test):
  - `retention`, `forecast`, `streak`, `weeklyNewWords`, `lapseRate`, `funnel`, `weekOverWeek`.
- `analyticsService`:
  - Một lần tải `word_mastery` (chỉ các cột cần), một lần tải `review_logs` 90 ngày, một lần tải `ielts_attempts`, một lần tải `sentence_attempts`.
  - Bỏ các lần quét trùng lặp.
- Sửa các lỗi ở mục 5.1 kế hoạch v3: số đếm 7 ngày, "100%" giả, xu hướng quiz bị tải mà không hiển thị.

### Nghiệm thu
- Ôn 3 lần cùng một từ vào 3 ngày khác nhau thì lịch hoạt động hiện đủ cả 3 ngày.
- Từ chưa chấm lần nào không hiện tỉ lệ.
- Mở trang chỉ tạo ra 4 truy vấn trở xuống (kiểm tra trong tab network).

---

## Phase 8: Dashboard và kiểm chứng cuối

Cần: P2–P7.

### Thiết kế
- **Một hành động chính** ở đầu trang, theo thứ tự ưu tiên:
  1. Đang giữa bài: "Tiếp tục bài Du lịch".
  2. Có từ đến hạn: "Ôn 12 từ (~4 phút)".
  3. Có câu sai chưa luyện lại: "Luyện 3 câu sai".
  4. Không còn gì: "Học bài mới".
- Vòng mục tiêu ngày và streak gọn trong thẻ chính. Bỏ các khối trùng với trang Thống kê.
- **Khu tạo bài**: chọn chủ đề và cấp độ dạng chip, hiện thời gian ước tính. Mẫu bộ từ xếp thành dải cuộn ngang.
- **Bài gần đây** kèm tiến độ SRS của từng bài (dùng `lessonListService` từ P2). Bấm vào thì mở danh sách đó trong Sổ từ.

### Code
- Hàm thuần `pickPrimaryAction(state)` có test.
- Sắp xếp lại `Dashboard.tsx`, dùng component từ P1.

### Kiểm chứng toàn app (mục 6.5 kế hoạch v3)
- Đi hết một vòng trên preview: tạo bài → học → luyện câu → tổng kết → ôn tập → sổ từ → thống kê. Kiểm ở 375px và 1280px, sáng và tối, console không có lỗi.
- Bạn đi thử lại trên máy của bạn trước khi push.
