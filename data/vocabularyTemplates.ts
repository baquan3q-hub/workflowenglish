import { DifficultyLevel, VocabularyTemplate } from '../types';

/**
 * Pre-built vocabulary templates organized by Topic × CEFR Level.
 * Users can browse and select these to quickly start a lesson without
 * manually typing words.
 */
export const VOCABULARY_TEMPLATES: VocabularyTemplate[] = [
  // ─── TRAVEL ───────────────────────────────────────────────────────
  {
    id: 'travel-a1',
    name: 'Du lịch cơ bản',
    topic: 'Travel & Tourism',
    cefrLevel: DifficultyLevel.A1,
    words: ['airport', 'hotel', 'ticket', 'passport', 'luggage', 'taxi', 'map', 'beach', 'restaurant', 'camera'],
    meanings: ['sân bay', 'khách sạn', 'vé', 'hộ chiếu', 'hành lý', 'taxi', 'bản đồ', 'bãi biển', 'nhà hàng', 'máy ảnh'],
    samplePreview: ['airport', 'hotel', 'passport', 'beach'],
  },
  {
    id: 'travel-a2',
    name: 'Du lịch nâng cao',
    topic: 'Travel & Tourism',
    cefrLevel: DifficultyLevel.A2,
    words: ['itinerary', 'destination', 'reservation', 'sightseeing', 'souvenir', 'departure', 'arrival', 'accommodation', 'currency', 'guidebook'],
    meanings: ['lịch trình', 'điểm đến', 'đặt chỗ', 'tham quan', 'quà lưu niệm', 'khởi hành', 'đến nơi', 'chỗ ở', 'tiền tệ', 'sách hướng dẫn'],
    samplePreview: ['itinerary', 'destination', 'reservation', 'souvenir'],
  },
  {
    id: 'travel-b1',
    name: 'Du lịch chuyên sâu',
    topic: 'Travel & Tourism',
    cefrLevel: DifficultyLevel.B1,
    words: ['excursion', 'hospitality', 'customs', 'immigration', 'layover', 'turbulence', 'expedition', 'backpacking', 'jet lag', 'embark'],
    meanings: ['chuyến tham quan', 'lòng hiếu khách', 'hải quan', 'nhập cư', 'quá cảnh', 'nhiễu động', 'cuộc thám hiểm', 'du lịch bụi', 'lệch múi giờ', 'lên tàu/bắt đầu'],
    samplePreview: ['excursion', 'hospitality', 'customs', 'expedition'],
  },

  // ─── BUSINESS ─────────────────────────────────────────────────────
  {
    id: 'business-a2',
    name: 'Công việc cơ bản',
    topic: 'Business & Office',
    cefrLevel: DifficultyLevel.A2,
    words: ['meeting', 'deadline', 'colleague', 'salary', 'interview', 'resume', 'schedule', 'project', 'manager', 'office'],
    meanings: ['cuộc họp', 'hạn chót', 'đồng nghiệp', 'lương', 'phỏng vấn', 'sơ yếu lý lịch', 'lịch trình', 'dự án', 'quản lý', 'văn phòng'],
    samplePreview: ['meeting', 'deadline', 'colleague', 'salary'],
  },
  {
    id: 'business-b1',
    name: 'Giao tiếp công sở',
    topic: 'Business & Office',
    cefrLevel: DifficultyLevel.B1,
    words: ['negotiate', 'proposal', 'revenue', 'stakeholder', 'feedback', 'collaboration', 'strategy', 'benchmark', 'outsource', 'quarterly'],
    meanings: ['đàm phán', 'đề xuất', 'doanh thu', 'bên liên quan', 'phản hồi', 'hợp tác', 'chiến lược', 'tiêu chuẩn', 'thuê ngoài', 'hàng quý'],
    samplePreview: ['negotiate', 'proposal', 'revenue', 'strategy'],
  },
  {
    id: 'business-b2',
    name: 'Kinh doanh nâng cao',
    topic: 'Business & Office',
    cefrLevel: DifficultyLevel.B2,
    words: ['acquisition', 'leverage', 'scalability', 'disruption', 'synergy', 'diversification', 'compliance', 'depreciation', 'equity', 'volatility'],
    meanings: ['mua lại', 'đòn bẩy', 'khả năng mở rộng', 'đột phá', 'cộng hưởng', 'đa dạng hóa', 'tuân thủ', 'khấu hao', 'vốn chủ sở hữu', 'biến động'],
    samplePreview: ['acquisition', 'leverage', 'scalability', 'disruption'],
  },

  // ─── ACADEMIC / IELTS ─────────────────────────────────────────────
  {
    id: 'academic-b1',
    name: 'Học thuật cơ bản',
    topic: 'Academic & IELTS',
    cefrLevel: DifficultyLevel.B1,
    words: ['research', 'hypothesis', 'analysis', 'conclusion', 'evidence', 'methodology', 'significant', 'theory', 'data', 'survey'],
    meanings: ['nghiên cứu', 'giả thuyết', 'phân tích', 'kết luận', 'bằng chứng', 'phương pháp', 'đáng kể', 'lý thuyết', 'dữ liệu', 'khảo sát'],
    samplePreview: ['research', 'hypothesis', 'analysis', 'evidence'],
  },
  {
    id: 'academic-b2',
    name: 'IELTS Academic',
    topic: 'Academic & IELTS',
    cefrLevel: DifficultyLevel.B2,
    words: ['phenomenon', 'correlation', 'paradigm', 'empirical', 'ambiguous', 'comprehensive', 'subsequent', 'predominant', 'fluctuate', 'inherent'],
    meanings: ['hiện tượng', 'tương quan', 'mô hình', 'thực nghiệm', 'mơ hồ', 'toàn diện', 'tiếp theo', 'chiếm ưu thế', 'dao động', 'vốn có'],
    samplePreview: ['phenomenon', 'correlation', 'paradigm', 'empirical'],
  },
  {
    id: 'academic-c1',
    name: 'IELTS Band 7+',
    topic: 'Academic & IELTS',
    cefrLevel: DifficultyLevel.C1,
    words: ['ubiquitous', 'exacerbate', 'unprecedented', 'juxtapose', 'proliferate', 'mitigate', 'substantiate', 'dichotomy', 'pragmatic', 'conundrum'],
    meanings: ['phổ biến khắp nơi', 'làm trầm trọng', 'chưa từng có', 'đặt cạnh nhau', 'phát triển nhanh', 'giảm nhẹ', 'chứng minh', 'sự phân đôi', 'thực dụng', 'câu hỏi hóc búa'],
    samplePreview: ['ubiquitous', 'unprecedented', 'mitigate', 'pragmatic'],
  },

  // ─── TECHNOLOGY ───────────────────────────────────────────────────
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

  // ─── DAILY LIFE ───────────────────────────────────────────────────
  {
    id: 'daily-a1',
    name: 'Đời sống hàng ngày',
    topic: 'General Communication',
    cefrLevel: DifficultyLevel.A1,
    words: ['breakfast', 'weather', 'family', 'friend', 'school', 'morning', 'evening', 'weekend', 'hobby', 'shopping'],
    meanings: ['bữa sáng', 'thời tiết', 'gia đình', 'bạn bè', 'trường học', 'buổi sáng', 'buổi tối', 'cuối tuần', 'sở thích', 'mua sắm'],
    samplePreview: ['breakfast', 'weather', 'family', 'hobby'],
  },
  {
    id: 'daily-a2',
    name: 'Giao tiếp hàng ngày',
    topic: 'General Communication',
    cefrLevel: DifficultyLevel.A2,
    words: ['appointment', 'neighbour', 'routine', 'grocery', 'commute', 'chores', 'celebration', 'invitation', 'complaint', 'suggestion'],
    meanings: ['cuộc hẹn', 'hàng xóm', 'thói quen', 'tạp hóa', 'đi lại', 'việc nhà', 'lễ kỷ niệm', 'lời mời', 'phàn nàn', 'gợi ý'],
    samplePreview: ['appointment', 'routine', 'commute', 'celebration'],
  },

  // ─── HEALTH ───────────────────────────────────────────────────────
  {
    id: 'health-a2',
    name: 'Sức khỏe cơ bản',
    topic: 'Health & Lifestyle',
    cefrLevel: DifficultyLevel.A2,
    words: ['exercise', 'medicine', 'symptom', 'appointment', 'prescription', 'headache', 'allergy', 'nutrition', 'vitamin', 'recovery'],
    meanings: ['tập thể dục', 'thuốc', 'triệu chứng', 'cuộc hẹn', 'đơn thuốc', 'đau đầu', 'dị ứng', 'dinh dưỡng', 'vitamin', 'hồi phục'],
    samplePreview: ['exercise', 'symptom', 'nutrition', 'recovery'],
  },
  {
    id: 'health-b1',
    name: 'Sức khỏe & Lối sống',
    topic: 'Health & Lifestyle',
    cefrLevel: DifficultyLevel.B1,
    words: ['metabolism', 'immunity', 'diagnosis', 'rehabilitation', 'chronic', 'supplement', 'meditation', 'insomnia', 'therapy', 'wellness'],
    meanings: ['trao đổi chất', 'miễn dịch', 'chẩn đoán', 'phục hồi chức năng', 'mãn tính', 'thực phẩm bổ sung', 'thiền', 'mất ngủ', 'liệu pháp', 'sức khỏe toàn diện'],
    samplePreview: ['metabolism', 'immunity', 'diagnosis', 'meditation'],
  },

  // ─── FOOD ─────────────────────────────────────────────────────────
  {
    id: 'food-a1',
    name: 'Ẩm thực cơ bản',
    topic: 'Food & Dining',
    cefrLevel: DifficultyLevel.A1,
    words: ['menu', 'waiter', 'bill', 'delicious', 'spicy', 'dessert', 'appetizer', 'beverage', 'ingredient', 'recipe'],
    meanings: ['thực đơn', 'phục vụ', 'hóa đơn', 'ngon', 'cay', 'tráng miệng', 'khai vị', 'đồ uống', 'nguyên liệu', 'công thức'],
    samplePreview: ['menu', 'delicious', 'dessert', 'recipe'],
  },
];
