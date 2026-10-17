/**
 * IELTS AI ChatBox Knowledge Base
 * 
 * Quick actions for the chat box. The mentor system prompt lives in
 * supabase/functions/ai-proxy/ops/ieltsMentorPrompt.ts.
 * Nguồn: tong_hop_chu_de_dang_bai_ielts_writing_speaking.md + ieltsFrameworks.ts
 */

/**
 * Quick action templates cho chat box
 */
export interface QuickAction {
  id: string;
  icon: string;
  label: string;
  labelVi: string;
  prompt: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'grade_writing',
    icon: '📝',
    label: 'Grade Writing',
    labelVi: 'Chấm bài Writing',
    prompt: 'Tôi muốn gửi bài Writing để bạn chấm và góp ý. Bạn sẵn sàng chưa?',
  },
  {
    id: 'speaking_tips',
    icon: '🎤',
    label: 'Speaking Tips',
    labelVi: 'Tips Speaking',
    prompt: 'Cho tôi mẹo trả lời Speaking Part 2 thật tự nhiên, kèm ví dụ cụ thể nhé.',
  },
  {
    id: 'analyze_chart',
    icon: '📊',
    label: 'Analyze Chart',
    labelVi: 'Phân tích biểu đồ',
    prompt: 'Tôi sẽ upload một biểu đồ/chart. Hãy giúp tôi phân tích và hướng dẫn viết Task 1 nhé.',
  },
  {
    id: 'framework_peel',
    icon: '📚',
    label: 'PEEL Framework',
    labelVi: 'Framework PEEL',
    prompt: 'Giải thích framework PEEL chi tiết, kèm ví dụ thực tế cho Writing Task 2.',
  },
  {
    id: 'improve_band',
    icon: '🎯',
    label: 'Improve Band',
    labelVi: 'Lên band 6.0+',
    prompt: 'Tôi đang ở khoảng band 5.0-5.5. Cho tôi lộ trình cải thiện lên band 6.0-6.5 trong 2-3 tháng, tập trung vào những điểm yếu phổ biến nhất.',
  },
  {
    id: 'study_tips',
    icon: '💡',
    label: 'Study Tips',
    labelVi: 'Mẹo học IELTS',
    prompt: 'Cho tôi 5 mẹo học IELTS hiệu quả nhất cho người mới bắt đầu, đặc biệt là cách quản lý thời gian khi luyện thi.',
  },
  {
    id: 'essay_types',
    icon: '✍️',
    label: 'Essay Types',
    labelVi: 'Dạng bài Task 2',
    prompt: 'Liệt kê tất cả dạng bài Writing Task 2 và cách nhận biết từng dạng từ đề bài, kèm ví dụ đề mẫu.',
  },
  {
    id: 'vocabulary',
    icon: '📖',
    label: 'IELTS Vocab',
    labelVi: 'Từ vựng IELTS',
    prompt: 'Cho tôi 20 từ/cụm từ academic vocabulary phổ biến nhất cho Writing Task 2, kèm ví dụ câu.',
  },
];
