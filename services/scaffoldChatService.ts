/**
 * Scaffold Chat Service
 *
 * Integrates multimodal input (images, audio, document files) and constructs
 * high-impact educational scaffolding prompts for deep sentence breakdown,
 * vocabulary extraction with SRS integration, and interactive quiz generation.
 */

import { QUIZ_FORMAT, type ChatAttachment } from './chatLogic';
import { ScaffoldActionType } from './scaffoldActionTypes';

// ─── Document / Text File Extraction ─────────────────────────────

const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5MB limit for text docs

export async function extractDocumentText(file: File): Promise<{ text: string; fileName: string; mimeType: string }> {
  if (file.size > MAX_DOC_SIZE) {
    throw new Error('Tệp tài liệu vượt quá kích thước 5MB.');
  }

  const name = file.name.toLowerCase();

  // Plain text / markdown / code / csv
  if (
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.csv') ||
    name.endsWith('.json') ||
    name.endsWith('.srt') ||
    name.endsWith('.vtt') ||
    name.endsWith('.ts') ||
    name.endsWith('.html') ||
    file.type.startsWith('text/')
  ) {
    const text = await file.text();
    return {
      text: text.slice(0, 15000), // Max 15k chars for prompt safety
      fileName: file.name,
      mimeType: file.type || 'text/plain',
    };
  }

  // PDF or other document fallback: read as base64 or basic string
  try {
    const text = await file.text();
    // Filter non-binary readable text
    const cleanText = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ').trim();
    if (cleanText.length > 50) {
      return {
        text: cleanText.slice(0, 15000),
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
      };
    }
  } catch {
    // ignore
  }

  return {
    text: `[Tệp đính kèm: ${file.name} (${Math.round(file.size / 1024)} KB)]`,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
  };
}

// ─── Scaffolding Action Prompt Builders ──────────────────────────

export function buildScaffoldActionPrompt(action: ScaffoldActionType, targetContent: string): string {
  switch (action) {
    case 'sentence_breakdown':
      return `Bạn là giảng viên IELTS chuyên sâu. Hãy phân tích và DỊCH CHI TIẾT TỪNG CÂU cho văn bản sau sang tiếng Việt tự nhiên.
Với mỗi câu:
1. Dịch chuẩn nghĩa, văn phong tự nhiên.
2. Phân tích ngữ pháp: cấu trúc S-V-O, mệnh đề, thì động từ, liên từ.
3. Nêu lưu ý ngữ cảnh, sắc thái hoặc lỗi người Việt hay gặp.
4. Trích xuất các từ/cụm từ quan trọng.

BẮT BUỘC trả về khối JSON tương tác sau đây (kèm lời mở đầu và nhận xét ngắn gọn):
\`\`\`json:scaffold_sentences
[
  {
    "id": "s1",
    "original": "English sentence...",
    "translationVi": "Bản dịch tiếng Việt...",
    "grammarAnalysis": "Cấu trúc ngữ pháp...",
    "nuanceNotes": "Lưu ý ngữ cảnh...",
    "keyWords": [{"word": "example", "meaning": "ví dụ"}]
  }
]
\`\`\`

Nội dung cần phân tích:
"${targetContent}"`;

    case 'vocab_extract':
      return `Bạn là chuyên gia từ vựng IELTS. Hãy trích xuất từ 4 đến 8 từ vựng học thuật hoặc cụm từ (collocations/idioms) đắt giá nhất từ nội dung sau để người học có thể nâng band.
BẮT BUỘC trả về khối JSON tương tác sau đây (kèm giải thích ngắn):
\`\`\`json:scaffold_vocab
[
  {
    "id": "v1",
    "word": "từ_vựng",
    "ipa": "/phiên_âm/",
    "partOfSpeech": "noun | verb | adj | adv | collocation",
    "level": "B2 | C1 | Band 6.5 | Band 7.5+",
    "meaningVi": "nghĩa tiếng Việt ngắn gọn",
    "exampleSentence": "câu ví dụ tiếng Anh ngắn",
    "exampleTranslationVi": "dịch câu ví dụ",
    "collocations": ["cụm 1", "cụm 2"]
  }
]
\`\`\`

Nội dung cần trích xuất từ vựng:
"${targetContent}"`;

    case 'quiz_generate':
      return `Bạn là chuyên gia khảo thí IELTS. Dựa trên nội dung sau, tạo quiz trắc nghiệm 5 câu kiểm tra từ vựng, ngữ pháp và ý chính của nội dung.
Mỗi câu có "hint" là gợi ý tư duy (không lộ đáp án) và "context" là câu trích từ nội dung khi phù hợp.
${QUIZ_FORMAT}

Nội dung cần tạo câu hỏi:
"${targetContent}"`;

    default:
      return targetContent;
  }
}

// ─── Proactive Multimodal Prompt Suggestions ──────────────────────

export function getProactiveSuggestionsForAttachment(att: ChatAttachment): {
  id: string;
  label: string;
  action: ScaffoldActionType;
}[] {
  if (att.type === 'image') {
    return [
      { id: 'sb', label: '🔍 Mổ xẻ từng câu', action: 'sentence_breakdown' },
      { id: 've', label: '⭐ Trích từ vựng & Lưu SRS', action: 'vocab_extract' },
      { id: 'qg', label: '🎯 Tạo Quiz ôn tập', action: 'quiz_generate' },
    ];
  }

  if (att.type === 'audio') {
    return [
      { id: 'sb', label: '🔍 Transcribe & Dịch từng câu', action: 'sentence_breakdown' },
      { id: 've', label: '⭐ Trích từ vựng phát âm', action: 'vocab_extract' },
      { id: 'qg', label: '🎯 Tạo Quiz nghe hiểu', action: 'quiz_generate' },
    ];
  }

  return [
    { id: 'sb', label: '🔍 Dịch chi tiết từng câu', action: 'sentence_breakdown' },
    { id: 've', label: '⭐ Trích xuất từ vựng học thuật', action: 'vocab_extract' },
    { id: 'qg', label: '🎯 Tạo câu hỏi ôn tập', action: 'quiz_generate' },
  ];
}

// ─── Context-Aware Phase Help ────────────────────────────────────

export function getPhaseContextTip(currentPhase?: string): {
  badge: string;
  defaultPrompt: string;
} | null {
  if (!currentPhase) return null;

  switch (currentPhase) {
    case 'IELTS_WRITING_PRACTICE':
    case 'IELTS_WRITING_HUB':
      return {
        badge: 'Gợi ý Writing Task 1/2',
        defaultPrompt: 'Tôi đang chuẩn bị viết bài Writing. Hãy gợi ý cho tôi dàn ý theo framework PEEL và 5 từ vựng đắt giá theo chủ đề này nhé.',
      };
    case 'IELTS_SPEAKING_PRACTICE':
    case 'IELTS_SPEAKING_HUB':
      return {
        badge: 'Cố vấn Speaking A.R.E.A',
        defaultPrompt: 'Hãy đóng vai giám khảo IELTS, phỏng vấn tôi và nhận xét về phản xạ cũng như từ vựng của tôi theo framework A.R.E.A nhé.',
      };
    case 'IELTS_READING_PRACTICE':
    case 'IELTS_READING_HUB':
      return {
        badge: 'Hỗ trợ Reading & Dịch câu',
        defaultPrompt: 'Tôi đang đọc một bài IELTS Reading khó. Hãy sẵn sàng giúp tôi mổ xẻ các câu phức và giải thích các bẫy đề thi nhé.',
      };
    case 'FLASHCARDS':
    case 'REVIEW_SESSION':
    case 'VOCAB_LIBRARY':
      return {
        badge: 'Ôn tập Từ vựng SRS',
        defaultPrompt: 'Hãy giúp tôi đặt 3 câu ví dụ thực tế và tạo 1 câu hỏi trắc nghiệm nhanh để ghi nhớ các từ vựng tôi vừa ôn tập nhé.',
      };
    default:
      return null;
  }
}
