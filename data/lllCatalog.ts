import type { LllEditorial, LllLanguage, LllTopic } from '../services/lllLogic';

type Source = [url: string, publisher: string, minutes: number, title: string, description: string];

function picks(topic: LllTopic, language: LllLanguage, sources: Source[]): LllEditorial[] {
  return sources.map(([url, publisher, minutes, title, description]) => ({
    url, publisher, minutes, title, description, topic, language,
  }));
}

// Reading and viewing times are editorial estimates in whole minutes.
export const LLL_CATALOG = [
  ...picks('tech', 'vi', [
    ['https://aws.amazon.com/vi/what-is/artificial-intelligence/', 'AWS', 10, 'AI là gì?', 'Làm quen với các loại AI và những việc chúng có thể làm.'],
    ['https://aws.amazon.com/vi/what-is/machine-learning/', 'AWS', 10, 'Học máy là gì?', 'Tìm hiểu cách hệ thống nhận ra quy luật từ dữ liệu.'],
    ['https://aws.amazon.com/vi/what-is-cloud-computing/', 'AWS', 8, 'Điện toán đám mây là gì?', 'Hiểu chuyện gì xảy ra khi bạn dùng tài nguyên máy tính qua Internet.'],
    ['https://www.youtube.com/watch?v=AMjfizNVOm0', 'VTV24', 20, 'Thuyết tiến hóa của trí tuệ nhân tạo', 'Một góc nhìn về sự phát triển của AI.'],
  ]),
  ...picks('tech', 'en', [
    ['https://www.cloudflare.com/learning/dns/what-is-dns/', 'Cloudflare', 7, 'What is DNS?', 'Theo dấu một tên miền từ trình duyệt đến địa chỉ máy chủ.'],
    ['https://www.cloudflare.com/learning/ssl/what-is-https/', 'Cloudflare', 5, 'What is HTTPS?', 'Hiểu chữ S trên thanh địa chỉ bảo vệ kết nối như thế nào.'],
    ['https://aws.amazon.com/what-is/generative-ai/', 'AWS', 12, 'What is generative AI?', 'Tìm hiểu nguyên lý và ví dụ ứng dụng của AI tạo sinh.'],
    ['https://www.youtube.com/watch?v=LPZh9BOjkQs', '3Blue1Brown', 8, 'Large language models explained briefly', 'Xem minh họa trực quan về cách mô hình ngôn ngữ dự đoán từ tiếp theo.'],
  ]),
  ...picks('skills', 'vi', [
    ['https://vietcetera.com/vn/commonplace-book-phuong-phap-ghi-chep-co-xua-van-huu-ich-trong-thoi-dai-so', 'Vietcetera', 7, 'Commonplace Book', 'Thử một cách gom ý tưởng và trích đoạn để tìm lại khi cần.'],
    ['https://vietcetera.com/vn/problem-based-learning-khi-hoc-di-doi-voi-hanh', 'Vietcetera', 7, 'Học qua vấn đề', 'Bắt đầu bằng một câu hỏi thực tế rồi lần tìm kiến thức cần dùng.'],
    ['https://vietcetera.com/vn/chuyen-cong-viec-lam-dung-thi-do-cuc', 'Vietcetera', 8, 'Chuyện công việc: Làm đúng thì đỡ cực', 'Đọc một góc nhìn về cách làm việc hiệu quả hơn.'],
    ['https://www.youtube.com/watch?v=2mdJ9H0r63Y', 'TED-Ed Tiếng Việt', 7, 'Ba phương pháp học của sinh viên y khoa', 'Khám phá ba cách học dựa trên cách não ghi nhớ thông tin.'],
  ]),
  ...picks('skills', 'en', [
    ['https://www.learningscientists.org/retrieval-practice', 'The Learning Scientists', 5, 'Retrieval practice', 'Xem cách tự gọi lại kiến thức sau khi đóng tài liệu.'],
    ['https://www.learningscientists.org/spaced-practice', 'The Learning Scientists', 5, 'Spaced practice', 'Tìm cách chia thời gian ôn thành nhiều buổi ngắn.'],
    ['https://www.learningscientists.org/interleaving', 'The Learning Scientists', 5, 'Interleaving', 'Khám phá cách xen kẽ các dạng bài để luyện chọn phương pháp phù hợp.'],
    ['https://www.youtube.com/watch?v=TjPFZaMe2yw', 'TED-Ed', 6, 'Three tips on how to study effectively', 'Xem ba kỹ thuật học qua câu chuyện của sinh viên y khoa.'],
  ]),
  ...picks('life', 'vi', [
    ['https://vnexpress.net/vi-sao-bau-troi-xanh-ma-khong-tia-2028459.html', 'VnExpress', 4, 'Vì sao bầu trời xanh mà không tía?', 'Một câu hỏi về ánh sáng và cách mắt người cảm nhận màu sắc.'],
    ['https://vnexpress.net/tai-sao-cau-vong-lai-tron-va-thuong-kep-2002151.html', 'VnExpress', 4, 'Tại sao cầu vồng lại tròn?', 'Khám phá hình dạng của cầu vồng và vì sao đôi khi thấy hai vòng.'],
    ['https://vnexpress.net/ly-giai-hien-tuong-mat-trang-to-hon-o-sat-duong-chan-troi-3471333.html', 'VnExpress', 4, 'Khi Mặt Trăng trông lớn hơn', 'Tìm hiểu ảo giác khi quan sát Mặt Trăng sát đường chân trời.'],
    ['https://www.youtube.com/watch?v=-bgctJKDmHg', 'YouTube', 10, 'Vì sao bầu trời có màu xanh?', 'Xem một cách giải thích màu bầu trời bằng hiện tượng tán xạ ánh sáng.'],
  ]),
  ...picks('life', 'en', [
    ['https://spaceplace.nasa.gov/blue-sky/en/', 'NASA Space Place', 4, 'Why is the sky blue?', 'Tìm hiểu vì sao ánh sáng xanh tán xạ mạnh hơn trong khí quyển.'],
    ['https://spaceplace.nasa.gov/moon-phases/en/', 'NASA Space Place', 5, 'What are the moon phases?', 'Nhìn các pha Mặt Trăng qua vị trí của Mặt Trời, Trái Đất và Mặt Trăng.'],
    ['https://spaceplace.nasa.gov/seasons/en/', 'NASA Space Place', 5, 'What causes the seasons?', 'Xem vì sao độ nghiêng của Trái Đất tạo ra các mùa.'],
    ['https://www.youtube.com/watch?v=zQGOcOUBi6s', 'Kurzgesagt', 7, 'The immune system explained', 'Theo dõi cách hệ miễn dịch phản ứng khi vi khuẩn xâm nhập.'],
  ]),
] satisfies readonly LllEditorial[];
