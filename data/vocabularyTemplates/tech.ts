import { DifficultyLevel, VocabularyTemplate } from '../../types';

export const TECH_TEMPLATES: VocabularyTemplate[] = [
  {
    id: 'tech-a1',
    name: 'Điện thoại & máy tính',
    topic: 'Technology',
    cefrLevel: DifficultyLevel.A1,
    words: ['phone', 'computer', 'screen', 'keyboard', 'mouse', 'email', 'internet', 'click', 'message', 'photo', 'video', 'game'],
    meanings: ['điện thoại', 'máy tính', 'màn hình', 'bàn phím', 'chuột máy tính', 'thư điện tử', 'mạng internet', 'nhấp chuột', 'tin nhắn', 'bức ảnh', 'video', 'trò chơi'],
    samplePreview: ['phone', 'keyboard', 'internet', 'message'],
  },
  {
    id: 'tech-a2',
    name: 'Công nghệ cơ bản',
    topic: 'Technology',
    cefrLevel: DifficultyLevel.A2,
    words: ['software', 'hardware', 'download', 'upload', 'password', 'website', 'application', 'database', 'network', 'device'],
    meanings: ['phần mềm', 'phần cứng', 'tải xuống', 'tải lên', 'mật khẩu', 'trang web', 'ứng dụng', 'cơ sở dữ liệu', 'mạng', 'thiết bị'],
    samplePreview: ['software', 'database', 'network', 'application'],
  },
  {
    id: 'tech-b1',
    name: 'Công nghệ nâng cao',
    topic: 'Technology',
    cefrLevel: DifficultyLevel.B1,
    words: ['algorithm', 'encryption', 'bandwidth', 'cloud computing', 'artificial intelligence', 'cybersecurity', 'blockchain', 'automation', 'scalable', 'interface'],
    meanings: ['thuật toán', 'mã hóa', 'băng thông', 'điện toán đám mây', 'trí tuệ nhân tạo', 'an ninh mạng', 'chuỗi khối', 'tự động hóa', 'có thể mở rộng', 'giao diện'],
    samplePreview: ['algorithm', 'encryption', 'artificial intelligence', 'blockchain'],
  },
  {
    id: 'tech-b2',
    name: 'Lập trình',
    topic: 'Technology',
    cefrLevel: DifficultyLevel.B2,
    words: ['debug', 'deploy', 'repository', 'framework', 'variable', 'function', 'server', 'backend', 'frontend', 'compile', 'bug', 'version control'],
    meanings: ['gỡ lỗi', 'triển khai', 'kho mã nguồn', 'khung phát triển', 'biến', 'hàm', 'máy chủ', 'phần xử lý phía máy chủ', 'phần giao diện người dùng', 'biên dịch', 'lỗi phần mềm', 'quản lý phiên bản'],
    samplePreview: ['debug', 'deploy', 'repository', 'framework'],
  },
  {
    id: 'tech-c1',
    name: 'AI & dữ liệu',
    topic: 'Technology',
    cefrLevel: DifficultyLevel.C1,
    words: ['machine learning', 'neural network', 'dataset', 'training data', 'inference', 'accuracy', 'large language model', 'prompt', 'hallucination', 'generative', 'fine-tune', 'benchmark'],
    meanings: ['học máy', 'mạng nơ-ron', 'tập dữ liệu', 'dữ liệu huấn luyện', 'suy luận', 'độ chính xác', 'mô hình ngôn ngữ lớn', 'câu lệnh cho AI', 'ảo giác (AI bịa thông tin)', 'tạo sinh', 'tinh chỉnh', 'bài đánh giá chuẩn'],
    samplePreview: ['machine learning', 'dataset', 'large language model', 'hallucination'],
  },
];
