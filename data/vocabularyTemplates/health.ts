import { DifficultyLevel, VocabularyTemplate } from '../../types';

export const HEALTH_TEMPLATES: VocabularyTemplate[] = [
  {
    id: 'health-a1',
    name: 'Cơ thể người',
    topic: 'Health & Lifestyle',
    cefrLevel: DifficultyLevel.A1,
    words: ['head', 'eye', 'ear', 'nose', 'mouth', 'hand', 'arm', 'leg', 'foot', 'back', 'stomach', 'tooth'],
    meanings: ['đầu', 'mắt', 'tai', 'mũi', 'miệng', 'bàn tay', 'cánh tay', 'chân', 'bàn chân', 'lưng', 'bụng, dạ dày', 'răng'],
    samplePreview: ['head', 'hand', 'stomach', 'tooth'],
  },
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
  {
    id: 'health-b2',
    name: 'Y tế & bệnh viện',
    topic: 'Health & Lifestyle',
    cefrLevel: DifficultyLevel.B2,
    words: ['surgery', 'outpatient', 'anaesthetic', 'side effect', 'contagious', 'vaccine', 'ward', 'emergency room', 'referral', 'check-up', 'inflammation', 'dosage'],
    meanings: ['phẫu thuật', 'bệnh nhân ngoại trú', 'thuốc gây mê', 'tác dụng phụ', 'dễ lây', 'vắc-xin', 'phòng bệnh', 'phòng cấp cứu', 'giấy chuyển viện', 'khám tổng quát', 'viêm', 'liều lượng'],
    samplePreview: ['surgery', 'side effect', 'contagious', 'check-up'],
  },
  {
    id: 'health-c1',
    name: 'Tâm lý & tinh thần',
    topic: 'Health & Lifestyle',
    cefrLevel: DifficultyLevel.C1,
    words: ['resilience', 'mindfulness', 'burnout', 'cognitive', 'coping mechanism', 'self-esteem', 'trauma', 'compulsive', 'psychosomatic', 'therapeutic', 'stigma', 'introspection'],
    meanings: ['khả năng phục hồi', 'chánh niệm', 'kiệt sức', 'thuộc về nhận thức', 'cơ chế đối phó', 'lòng tự trọng', 'sang chấn', 'cưỡng chế, không kiểm soát được', 'bệnh do tâm lý', 'có tác dụng chữa lành', 'sự kỳ thị', 'sự tự xét mình'],
    samplePreview: ['resilience', 'mindfulness', 'self-esteem', 'stigma'],
  },
];
