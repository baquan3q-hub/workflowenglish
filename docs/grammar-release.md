# Ngữ pháp · lộ trình từ mất gốc đến C1 · nghiệm thu

Vào **Học → Ngữ pháp**. Module có bốn mục:

- **Hôm nay** trả lời ba câu: bắt đầu ở đâu (chẩn đoán khoảng 7 phút hoặc học từ số 0), đang học bài nào và ở bước nào, học tiếp bài nào.
- **Lộ trình** gồm 7 chặng, từ Chặng 0 (A1) đến Chặng 6 (C1). Mỗi chặng có bài kiểm tra cuối chặng.
- **Chuyên đề** cho phép mở thẳng: 12 thì (bảng 3×4), câu bị động, liên từ, phó từ, câu điều kiện, mệnh đề quan hệ và các chuyên đề khác. Có ô tìm kiếm, gõ có dấu hay không dấu đều được.
- **Sổ lỗi** chứa câu sai kèm câu đúng và lời giải thích, câu chờ AI nhận xét, và nút luyện lại bằng câu mới.

Lộ trình và chuyên đề dùng chung một kho bài, nên học qua chuyên đề vẫn được tính vào tiến độ của lộ trình.

## Cấu trúc nội dung

| File | Nội dung |
| --- | --- |
| `data/grammar/meta.ts` | Danh sách chặng, toàn bộ thông tin ngắn của các bài (nạp ngay), hub chuyên đề, bảng 12 thì, tìm kiếm |
| `data/grammar/lessons/stage0.ts … stage6.ts` | Nội dung bài, nạp lười theo chặng |
| `data/grammar/author.ts` | Hàm viết tắt để soạn câu luyện: `c` chọn, `s` chọn câu đúng, `f` điền, `x` sửa lỗi, `o` sắp xếp, `t` dịch, `w` viết, `sp` nói, `diag`, `rev` |
| `data/grammar/legacy.ts` | Bảng chuyển ID bài của bản cũ sang bài mới, và bảng nối lỗi IELTS Writing với bài tương ứng |

Mỗi bài có các phần sau:

- Khi nào dùng (ít nhất 2 ý).
- Vì sao: logic của cấu trúc, so với tiếng Việt.
- Công thức.
- Ví dụ Anh–Việt. Phần trong `[ngoặc vuông]` được tô đậm.
- Đối chiếu với cấu trúc dễ nhầm, lỗi hay gặp của người Việt, và cách dùng trong IELTS.
- Câu luyện theo 5 mức:

| Mức | Dạng câu | Chấm |
| --- | --- | --- |
| 1 Nhận biết | chọn đáp án, chọn câu đúng | tại trình duyệt |
| 2 Luyện có khung | điền, sửa lỗi, sắp xếp | tại trình duyệt |
| 3 Dịch | Việt → Anh | AI |
| 4 Tự viết | viết 1–2 câu | AI |
| 5 Tự nói | ghi âm → chép lời → AI (có thể gõ thay) | AI |

Mỗi bài có một câu `diag` dùng cho chẩn đoán và kiểm tra cuối chặng, cùng ít nhất 2 câu `rev` để dành cho lượt ôn trễ.

ID câu được tạo từ ID bài và nội dung câu. Vì vậy đổi thứ tự câu không làm mất tiến độ. Sửa chữ trong câu sẽ tạo câu mới; kết quả cũ vẫn tính cho bài.

`data/__tests__/grammarContent.test.ts` kiểm tra:

- ID bài và ID câu không trùng.
- Bài tiên quyết, hub và bảng chuyển ID đều trỏ tới bài có thật.
- Mỗi bài đủ các phần và đủ 5 mức.
- Đáp án của câu đóng tự chấm đúng.

Các kiểm tra này chỉ bảo đảm cấu trúc. Chất lượng sư phạm cần giáo viên duyệt.

**Phiếu duyệt của giáo viên.** Với mỗi bài:

1. Đọc phần "Khi nào, vì sao" và tự làm từng câu luyện.
2. Ghi lại: ID bài, nội dung câu, đáp án hợp lệ khác (thêm vào `accept` của câu đó bằng dấu `|`), lý do sửa, tên người duyệt và ngày duyệt.
3. Với câu mở, thử ít nhất ba câu trả lời: đúng, sai cấu trúc, và đổi ý.

| Nhiệm vụ "Chị gái tôi là giáo viên" | Giữ ý | Dùng cấu trúc be | Phản hồi mong đợi |
| --- | --- | --- | --- |
| My older sister is a teacher. / My elder sister is a teacher. | Đạt | Đạt | Công nhận cả hai cách nói |
| My older sister a teacher. | Đạt | Cần sửa | Gợi ý thêm is trước cụm nghề nghiệp |
| My older sister is a doctor. | Cần sửa | Đạt | Chỉ ra nghề bị đổi, giữ nguyên phần dùng is đúng |

## Tiến độ và dữ liệu cũ

Trạng thái một bài đi theo thứ tự: **Chưa học → Đang học → Đã hiểu → Vận dụng được → Vững**.

| Trạng thái | Điều kiện |
| --- | --- |
| Đã hiểu | Mức 1–2 đúng từ 80% |
| Vận dụng được | Tự làm đúng câu mức 3–5 qua 2 phiên |
| Vững | Đúng ở lượt ôn trễ |

Lịch ôn là sau 1, 3, 7 rồi 21 ngày. Bài kiểm tra chẩn đoán dừng ở chặng đầu tiên có câu sai. Bài ở các chặng trước được đánh dấu "Đã biết qua chẩn đoán": người học có thể bỏ qua, nhưng chưa được tính là vững.

Dữ liệu cũ được giữ nguyên, không bị ghi đè:

- Kết quả của bản trước nằm trong khóa `workflow:grammar:v1:<user>:event:*` và bảng `grammar_attempts`. Khi đọc, kết quả được chuyển sang bài mới qua `legacy.ts`.
- Bài "đạt" trong kho chuyên đề cũ được tính là **Đã hiểu**.
- Phiên cũ đang làm dở được bỏ một lần, kèm thông báo. Các câu đã nộp trong phiên đó đều đã được lưu.

## AI

`supabase/functions/ai-proxy/ops/grammar.ts` có thêm ba trường tùy chọn:

- `errorTag`: loại lỗi, dùng để lọc trong Sổ lỗi.
- `natural`: cách nói tự nhiên hơn.
- `question`: câu hỏi tự do gửi cho trợ giảng AI.

Frontend vẫn chạy với proxy cũ, chỉ là chưa có ba phần trên. Muốn có chúng thì cần triển khai lại `ai-proxy`.

## Chạy thử trước khi phát hành

1. Trên môi trường thử nghiệm, áp dụng migration `20261124122746_grammar_attempts.sql` (nếu chưa có) và triển khai lại `ai-proxy`.
2. Dùng một tài khoản đã học ở bản cũ. Kiểm tra rằng bài đã đạt và lỗi cũ hiện đúng ở Lộ trình và Sổ lỗi.
3. Dùng một tài khoản mới, đi hết luồng:
   1. Hôm nay → Chẩn đoán.
   2. Xem kết quả, rồi vào bài được đề xuất.
   3. Học 6 bước của bài.
   4. Luyện đủ các dạng câu.
   5. Kiểm tra câu sai đã vào Sổ lỗi.
   6. Bấm "Bài tiếp theo".
4. Nộp một câu viết khi mất mạng, tải lại trang, rồi vào Sổ lỗi và chọn **Nhận xét lại**.
5. Thử trên điện thoại thật, cả khi cấp và khi từ chối quyền micro.

Lệnh kiểm tra tại repo: `npm test`, `npx tsc --noEmit`, `npm run build`.

Nguồn tham khảo cho thiết kế chương trình: [British Council Grammar](https://learnenglish.britishcouncil.org/free-resources/grammar), [CEFR Companion Volume](https://rm.coe.int/common-european-framework-of-reference-for-languages-learning-teaching/16809ea0d4), [tiêu chí IELTS](https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail).
