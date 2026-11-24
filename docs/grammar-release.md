# Ngữ pháp nền tảng · nghiệm thu bản đầu

Vào **Học → Ngữ pháp → Học ngữ pháp** để mở kho 50 bài theo chuyên đề, gồm bảng 12 thì, các bài đối chiếu và nội dung từ nền tảng đến nâng cao. Bài tập trong kho chấm tại trình duyệt và lưu kết quả đạt trên thiết bị theo tài khoản. Kho dùng `data/grammar/library` để biên soạn. Tham khảo [British Council Grammar](https://learnenglish.britishcouncil.org/free-resources/grammar) và [British Council C1 Grammar](https://learnenglish.britishcouncil.org/free-resources/grammar/c1).

Trong tab **Luyện tập**, sáu cụm gồm 24 kỹ năng theo thứ tự trong bản đồ. B1, B2 và C1 hiện có mô tả đầu ra và điều kiện học trước. Mục tiêu CEFR mô tả năng lực trong phạm vi học liệu. Điểm của bài luyện thể hiện kết quả ở cấu trúc đang học.

## Biên soạn và duyệt nội dung

Mỗi bài trong `data/grammar/unit*.ts` có một mục tiêu, một quy tắc, hai ví dụ Anh–Việt, tám câu luyện và ba yêu cầu tự tạo câu. Các phần trong ngoặc vuông của ví dụ có thể bấm để xem giải thích. Trong câu đóng, cú pháp `[đáp án/phương án nhiễu]` tạo chỗ trống. Giữ ổn định ID kỹ năng và vị trí câu sau khi phát hành.

| Vị trí (từ 0) | Mục đích |
| --- | --- |
| 0–7 | Luyện nhận diện và tự điền |
| 8 | Chẩn đoán, lấy hai kỹ năng đại diện mỗi cụm |
| 9 | Kiểm tra cuối cụm |
| 10–11 | Ôn trễ |
| 12–14 | Dịch Việt–Anh, viết, nói |
| 15–16 | Viết trong ngữ cảnh ôn mới và nhiệm vụ tổng hợp của cụm |

Mở rộng chương trình bằng cách bổ sung bài vào cụm, ma trận kỹ năng và câu vận dụng mới. Khi thay đổi ý nghĩa của câu đã phát hành, cấp mã nội dung hoặc phiên bản mới để báo cáo vẫn diễn giải được kết quả cũ.

**Phiếu duyệt của giáo viên.** Đọc hai câu ví dụ thành tiếng, đối chiếu bản dịch, tự làm cả hai phương án trong từng ngữ cảnh. Ghi lại ID bài, vị trí câu, đáp án hợp lệ khác, lý do chấp nhận hoặc sửa, tên người duyệt và ngày duyệt. Với đầu ra mở, thử tối thiểu ba tình huống dưới đây trước khi duyệt cụm.

| Nhiệm vụ “Chị gái tôi là giáo viên” | Giữ ý | Dùng cấu trúc be | Phản hồi mong đợi |
| --- | --- | --- | --- |
| My older sister is a teacher. / My elder sister is a teacher. | Đạt | Đạt | Công nhận cả hai cách nói |
| My older sister a teacher. | Đạt | Cần sửa | Gợi ý thêm is trước cụm nghề nghiệp |
| My older sister is a doctor. | Cần sửa | Đạt | Chỉ ra nghề bị đổi, giữ nguyên phần dùng is đúng |

Nguồn tham khảo cho thiết kế chương trình: [British Council Grammar](https://learnenglish.britishcouncil.org/free-resources/grammar), [CEFR Companion Volume](https://rm.coe.int/common-european-framework-of-reference-for-languages-learning-teaching/16809ea0d4), [tiêu chí IELTS](https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail).

## Tích hợp và chạy thử

1. Trên môi trường thử nghiệm, áp dụng migration `20261124122746_grammar_attempts.sql` và triển khai phiên bản `ai-proxy` có hai tác vụ ngữ pháp trước khi phát hành frontend. Dùng các thiết lập Auth, ai_usage và Gemini của môi trường hiện tại.
2. Đăng nhập hai tài khoản thử. Tạo một bài đang dở ở tài khoản A, đổi sang B rồi quay lại A. Kiểm tra nháp theo tài khoản trên cùng thiết bị. Kiểm tra kết quả đã đồng bộ của A bằng trình duyệt thứ hai.
3. Nộp một câu khi AI mất kết nối, tải lại, vào Sổ lỗi và chọn **Nhận xét lại**. Một event_id có thể có bản chờ và bản đã chấm. Khi tổng hợp lấy revision cao nhất của ID đó. Tiến độ kỹ năng và lịch ôn được tính lại từ các lượt đã chấm.
4. Thử trên điện thoại thật cả khi cấp và từ chối quyền micro. Nghe lại đoạn ghi âm, kiểm tra bản chép lời, xác nhận rồi chấm. Thử sửa bản chép nếu dịch vụ nghe nhầm. Bản ghi âm chỉ dùng để chuyển lời nói thành chữ. Dữ liệu lịch sử của module lưu nội dung đã xác nhận.
5. Sau khi giáo viên duyệt, thử với người học mất gốc. Đo tỷ lệ kết thúc phiên đầu, tỷ lệ tự sửa đúng sau một lỗi, tỷ lệ đúng độc lập ở lần ôn sau 7 ngày và số câu AI cần giáo viên sửa. Đối chiếu theo skill_id, phương thức trả lời và việc dùng gợi ý. Với mẫu thử nhỏ, đọc từng câu bị chấm lệch trước khi chỉnh ngưỡng chung.

Lệnh kiểm tra tại repo: `npm test`, `npx tsc --noEmit`, `npm run build`. Việc giáo viên xác nhận và kết quả thử nghiệm người học cần được ghi nhận riêng trong đợt phát hành.
