# VocabMaster - Project Context & Analysis

## 📋 Tổng quan dự án

**Tên dự án:** VocabMaster  
**Mô tả:** Ứng dụng học từ vựng tiếng Anh sử dụng AI (Gemini) để tạo bài học tự động gồm flashcard, story, quiz và fill-in-the-blank.  
**Loại ứng dụng:** Single Page Application (SPA) - Progressive Web App (PWA)  
**Ngôn ngữ giao diện:** Tiếng Việt (UI) + Tiếng Anh (nội dung học)

---

## 🛠️ Tech Stack

| Layer | Công nghệ | Phiên bản |
|-------|-----------|-----------|
| **Framework** | React | ^19.2.4 |
| **Language** | TypeScript | ~5.8.2 |
| **Build Tool** | Vite | ^6.2.0 |
| **Styling** | Tailwind CSS (CDN) | Latest |
| **Icons** | Lucide React | ^0.563.0 |
| **AI/LLM** | Google Gemini (@google/genai) | ^1.41.0 |
| **Backend/DB** | Supabase | ^2.95.3 |
| **PWA** | vite-plugin-pwa | ^1.2.0 |

### Đặc điểm kỹ thuật:
- **Không sử dụng router** — điều hướng bằng state (`AppPhase` enum)
- **Không có CSS file riêng** — toàn bộ styling dùng Tailwind utility classes + inline styles trong `index.html`
- **Tailwind qua CDN** — không cài đặt local, config inline trong `<script>` tag
- **Dark mode** — hỗ trợ qua class `dark` trên `<html>`, lưu localStorage

---

## 📁 Cấu trúc thư mục

```
Work-FlowEnglish/
├── index.html              # Entry HTML, chứa Tailwind config + animations CSS
├── index.tsx               # React entry point (ReactDOM.createRoot)
├── App.tsx                 # Root component, state management, routing logic
├── types.ts                # TypeScript interfaces & enums
├── vite.config.ts          # Vite config (PWA, env vars, path alias)
├── tsconfig.json           # TypeScript config
├── package.json            # Dependencies & scripts
├── metadata.json           # App metadata
├── .env.local              # Environment variables (GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY)
├── components/
│   └── Common.tsx          # Reusable UI components (Button, Select, Badge, ProgressBar)
├── services/
│   ├── geminiService.ts    # Gemini AI integration (lesson generation + TTS)
│   └── supabaseClient.ts   # Supabase auth + database operations
├── views/
│   ├── LandingPage.tsx     # Marketing/landing page
│   ├── AuthPage.tsx        # Login/Signup form
│   ├── Dashboard.tsx       # Input vocabulary + settings
│   ├── Flashcards.tsx      # Flashcard learning mode
│   ├── StoryMode.tsx       # Story reading + audio player
│   ├── QuizMode.tsx        # Multiple choice quiz
│   ├── FillBlankMode.tsx   # Fill-in-the-blank exercise
│   └── LearningHistory.tsx # Saved lessons history
└── public/
    ├── logo.svg            # App logo
    └── manifest.webmanifest # PWA manifest
```

---

## 🔄 Application Flow (User Journey)

```
LANDING → AUTH → DASHBOARD → FLASHCARDS → STORY → QUIZ → FILL_BLANK
                     ↑                                         |
                     |_________________________________________|
                     ↕
                  HISTORY (xem lại bài cũ)
```

### Các phase (AppPhase enum):
1. **LANDING** — Trang giới thiệu, marketing
2. **AUTH** — Đăng nhập / Đăng ký
3. **DASHBOARD** — Nhập từ vựng, chọn level (A1-C2), chọn topic
4. **FLASHCARDS** — Học từ vựng qua flashcard (flip card, TTS browser)
5. **STORY** — Đọc câu chuyện AI tạo, nghe audio (Gemini TTS)
6. **QUIZ** — Trắc nghiệm (câu hỏi tiếng Anh, đáp án tiếng Việt)
7. **FILL_BLANK** — Điền từ vào chỗ trống
8. **HISTORY** — Xem lịch sử bài học đã lưu

---

## 🧠 Core Features Analysis

### 1. AI Lesson Generation (`geminiService.ts`)

- **Model:** `gemini-3-flash-preview`
- **Input:** Danh sách từ vựng + CEFR Level + Topic
- **Output (structured JSON):**
  - `flashcards[]` — word, IPA, part of speech, Vietnamese meaning, English definition, example sentence
  - `story` — title, content (~150-200 words), Vietnamese translation
  - `quiz[]` — multiple choice questions (English question → Vietnamese options)
- **Config:** `responseMimeType: "application/json"`, `responseSchema` (structured output), `thinkingBudget: 0`

### 2. Text-to-Speech (TTS)

- **Gemini TTS:** Model `gemini-2.5-flash-preview-tts`, voice `Kore`, output raw PCM 24kHz 16-bit
- **Browser SpeechSynthesis:** Dùng cho flashcard (miễn phí, không tốn API)
- **AudioPlayerController class:** Full-featured audio player với play/pause/seek/speed/skip/download WAV
- **Word-level highlighting:** Sync text highlight theo thời gian audio (ước lượng dựa trên character weight)

### 3. Authentication & Data (Supabase)

- **Auth:** Email/password (signUp, signIn, signOut)
- **Profile table:** `profiles` (id, username, display_name, created_at)
- **History table:** `learning_history` (id, user_id, topic, level, words, quiz_score, quiz_total, lesson_data, completed_at)
- **Features:** Auto-save lesson, lazy-load full record, upsert pattern

### 4. PWA Support

- `vite-plugin-pwa` với `registerType: 'autoUpdate'`
- Manifest: standalone display, logo SVG icons
- Offline-capable (service worker auto-generated)

---

## 🎨 UI/UX Patterns

### Design System:
- **Font:** Inter (Google Fonts)
- **Color palette:** Slate (neutral), Blue/Indigo (primary), Emerald/Green (success), Red (error)
- **Border radius:** Rounded-xl đến rounded-3xl
- **Shadows:** shadow-sm đến shadow-2xl
- **Animations:** fadeInUp, float, pulseGlow, gradientShift, scaleIn (CSS keyframes)

### Responsive:
- Mobile-first approach
- Bottom navigation bar (mobile) khi đang trong lesson
- Desktop stepper (header) cho lesson progress
- Breakpoints: sm (640px), md (768px), lg (1024px)

### Dark Mode:
- Toggle button trong header
- Lưu preference vào localStorage (`vocabMaster_theme`)
- Fallback: system preference (`prefers-color-scheme`)

### UX Features:
- Save confirmation modal khi navigate away từ lesson
- Loading overlay khi mở lesson từ history
- Intersection Observer cho landing page animations
- Keyboard support (form submit)

---

## 📊 State Management

**Approach:** React useState tại App.tsx level (lifting state up)

### Key states trong App.tsx:
| State | Type | Mô tả |
|-------|------|--------|
| `currentUser` | AppUser \| null | User đang đăng nhập |
| `phase` | AppPhase | Phase hiện tại |
| `lessonData` | GeneratedLesson \| null | Dữ liệu bài học từ AI |
| `lessonSettings` | UserSettings \| null | Level + Topic đã chọn |
| `lessonWords` | string | Từ vựng đã nhập |
| `isLoading` | boolean | Loading state |
| `darkMode` | boolean | Dark mode toggle |
| `currentRecordId` | string \| null | ID record đang edit (upsert) |

---

## 🔐 Environment Variables

```env
GEMINI_API_KEY=       # Google Gemini API key
SUPABASE_URL=         # Supabase project URL
SUPABASE_ANON_KEY=    # Supabase anonymous key
```

Được inject qua `vite.config.ts` → `define` block → `process.env.*`

---

## 📦 Database Schema (Supabase)

### Table: `profiles`
| Column | Type | Note |
|--------|------|------|
| id | uuid (PK) | = auth.users.id |
| username | text (unique) | |
| display_name | text | |
| created_at | timestamp | |

### Table: `learning_history`
| Column | Type | Note |
|--------|------|------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (FK) | → profiles.id |
| topic | text | |
| level | text | A1-C2 |
| words | text | Raw input |
| quiz_score | int | |
| quiz_total | int | |
| lesson_data | jsonb | Full GeneratedLesson object |
| completed_at | timestamp | Auto-set |

---

## ⚠️ Limitations & Technical Debt

1. **No routing library** — Toàn bộ navigation bằng state, không có URL-based routing → không bookmark/share được
2. **Tailwind CDN** — Không tree-shake, bundle size lớn hơn cần thiết cho production
3. **No error boundary** — Crash toàn app nếu component throw error
4. **No offline data** — PWA shell offline nhưng data cần network
5. **No pagination** — Learning history load tất cả records
6. **Audio timing estimation** — Word highlighting dựa trên character weight, không chính xác 100%
7. **No input validation** — Không giới hạn số từ input, có thể gây timeout API
8. **Single API key** — Gemini API key exposed ở client-side (qua env define)
9. **No rate limiting** — Không có throttle cho API calls
10. **importmap trong index.html** — Có cả importmap (ESM CDN) lẫn node_modules, có thể conflict

---

## 🚀 Scripts

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run preview  # Preview production build
```

---

## 🔗 External Dependencies & APIs

- **Google Gemini API** — Lesson generation + TTS audio
- **Supabase** — Authentication + PostgreSQL database
- **Google Fonts** — Inter font family
- **Tailwind CDN** — CSS utility framework
- **ESM.sh** — CDN cho React/Lucide (importmap, có thể không dùng khi build với Vite)

---

## 📝 Ghi chú cho Developer

- Path alias `@/*` map tới root directory (tsconfig + vite)
- Dark mode cần thêm `dark:` prefix cho mọi color class
- Gemini TTS trả về raw PCM 24kHz mono 16-bit, cần convert thủ công sang AudioBuffer
- `saveLearningRecord` dùng upsert pattern — truyền `id` để update, không truyền để insert
- `getLearningHistory` chỉ load metadata (không load `lesson_data`) để tối ưu bandwidth
- `getLearningRecordFull` load full record khi user click vào lesson cụ thể
- Audio base64 được cache trong `story.audioBase64` và auto-save vào DB để tránh re-generate
