# Requirements Document

## Introduction

Tính năng Personalized Learning mở rộng hệ thống VocabMaster hiện tại để cá nhân hóa trải nghiệm học tiếng Anh cho từng người dùng. Hệ thống sẽ theo dõi mức độ thành thạo từng từ vựng, áp dụng thuật toán Spaced Repetition (lặp lại ngắt quãng) để lên lịch ôn tập tối ưu, tự động điều chỉnh độ khó dựa trên hiệu suất, cung cấp dashboard phân tích học tập trực quan, và đề xuất từ vựng mới phù hợp với trình độ và sở thích của người học.

**Bối cảnh hệ thống hiện tại:**
- SPA React + TypeScript, điều hướng bằng state (AppPhase enum), không có router
- Backend: Supabase (PostgreSQL + Auth)
- AI: Gemini 3 Flash (lesson generation) + Gemini TTS (audio)
- Database hiện tại: `profiles` + `learning_history` (lưu toàn bộ lesson_data dạng JSONB)
- Giao diện: Tiếng Việt (UI) + Tiếng Anh (nội dung học)

**Phạm vi triển khai:** Chia thành 3 phase ưu tiên:
- Phase 1 (Core): Word Mastery Tracking + SRS Engine + Review Session UI
- Phase 2 (Analytics): Learning Analytics Dashboard + Learning Goals & Streaks
- Phase 3 (AI-Enhanced): Adaptive Difficulty + Personalized Recommendations + Weakness Detection

## Glossary

- **SRS_Engine**: Module Spaced Repetition System — tính toán lịch ôn tập dựa trên thuật toán SM-2 và phản hồi của người dùng
- **Word_Mastery_Tracker**: Module theo dõi mức độ thành thạo từng từ vựng riêng lẻ qua các phiên học, lưu trữ trong bảng `word_mastery` trên Supabase
- **Adaptive_Difficulty_Engine**: Module tự động điều chỉnh cấp độ CEFR dựa trên hiệu suất quiz liên tiếp
- **Analytics_Dashboard**: View mới (AppPhase.ANALYTICS) hiển thị thống kê và biểu đồ tiến trình học tập
- **Recommendation_Engine**: Module sử dụng Gemini AI để đề xuất từ vựng mới dựa trên lịch sử học
- **Learning_Goal_Manager**: Module quản lý mục tiêu học tập hàng ngày và theo dõi streak, lưu trong bảng `user_goals` trên Supabase
- **Weakness_Detector**: Module phân tích pattern sai trong quiz để xác định điểm yếu, sử dụng Gemini AI
- **Mastery_Level**: Enum mức độ thành thạo: New (0), Learning (1), Reviewing (2), Mastered (3), Lapsed (4)
- **Review_Session**: Phiên ôn tập chứa danh sách từ cần ôn, hiển thị dưới dạng flashcard với nút đánh giá
- **Confidence_Rating**: Đánh giá sau mỗi lần ôn: Again (0), Hard (1), Good (2), Easy (3) — tương ứng SM-2
- **Learning_Streak**: Số ngày liên tiếp người dùng hoàn thành mục tiêu, reset khi bỏ lỡ 1 ngày
- **CEFR_Level**: Cấp độ A1, A2, B1, B2, C1, C2 — đã có trong enum DifficultyLevel hiện tại
- **word_mastery_table**: Bảng Supabase mới lưu: user_id, word (text), mastery_level, easiness_factor, interval_days, repetition_count, next_review_date, last_reviewed_at, correct_count, incorrect_count
- **user_goals_table**: Bảng Supabase mới lưu: user_id, daily_word_goal, current_streak, longest_streak, last_active_date, preferred_level

## Requirements

### Requirement 1: Theo dõi mức độ thành thạo từ vựng (Word Mastery Tracking)

**User Story:** As a learner, I want the system to track how well I know each word individually across all my lessons, so that I can focus on words I haven't mastered yet.

#### Acceptance Criteria

1. WHEN a user reviews a flashcard and provides a Confidence_Rating, THE Word_Mastery_Tracker SHALL create or update a record in word_mastery_table with the word, user_id, updated Mastery_Level, and timestamp
2. THE Word_Mastery_Tracker SHALL transition Mastery_Level according to these rules: New → Learning (after first review), Learning → Reviewing (after 3 consecutive Good or Easy ratings), Reviewing → Mastered (after interval exceeds 21 days with Good or Easy rating)
3. WHEN a user answers a quiz question incorrectly for a word with Mastery_Level of Reviewing or Mastered, THE Word_Mastery_Tracker SHALL transition that word to Lapsed and reset its interval to 1 day
4. THE Word_Mastery_Tracker SHALL persist each word's mastery data in Supabase, storing: easiness_factor (default 2.5), interval_days, repetition_count, next_review_date, correct_count, and incorrect_count
5. WHEN a user views flashcards in a lesson, THE Word_Mastery_Tracker SHALL display a color-coded badge on each card indicating its Mastery_Level (gray=New, yellow=Learning, blue=Reviewing, green=Mastered, red=Lapsed)
6. THE Word_Mastery_Tracker SHALL normalize words to lowercase and trim whitespace before storing, to avoid duplicate entries for the same word

### Requirement 2: Hệ thống lặp lại ngắt quãng (Spaced Repetition System)

**User Story:** As a learner, I want the system to schedule word reviews at optimal intervals based on my memory performance, so that I retain vocabulary long-term with minimal daily effort.

#### Acceptance Criteria

1. WHEN a user provides a Confidence_Rating for a word, THE SRS_Engine SHALL recalculate the next_review_date using SM-2 parameters: new_interval = old_interval × easiness_factor for Good/Easy, or reset to 1 day for Again
2. WHEN a user rates a word as "Again" (0), THE SRS_Engine SHALL set interval to 1 day, decrease easiness_factor by 0.2 (minimum 1.3), and reset repetition_count to 0
3. WHEN a user rates a word as "Hard" (1), THE SRS_Engine SHALL multiply interval by 1.2, decrease easiness_factor by 0.15 (minimum 1.3)
4. WHEN a user rates a word as "Good" (2), THE SRS_Engine SHALL multiply interval by easiness_factor, and increment repetition_count
5. WHEN a user rates a word as "Easy" (3), THE SRS_Engine SHALL multiply interval by easiness_factor × 1.3, increase easiness_factor by 0.15, and increment repetition_count
6. THE SRS_Engine SHALL query word_mastery_table for words where next_review_date is less than or equal to the current date, and display the count as a badge on the Dashboard
7. WHEN a user starts a Review_Session from the Dashboard, THE SRS_Engine SHALL present due words as flippable flashcards with 4 rating buttons (Lại, Khó, Tốt, Dễ) below each card
8. WHEN no words are due for review, THE SRS_Engine SHALL display a congratulatory message indicating the next scheduled review date

### Requirement 3: Điều chỉnh độ khó tự động (Adaptive Difficulty)

**User Story:** As a learner, I want the system to suggest adjusting my CEFR level based on my quiz performance trends, so that lessons remain appropriately challenging.

#### Acceptance Criteria

1. WHEN a user completes a quiz with a score of 90% or higher for 3 consecutive lessons at the same CEFR_Level, THE Adaptive_Difficulty_Engine SHALL display a suggestion notification to upgrade to the next level
2. WHEN a user completes a quiz with a score below 50% for 2 consecutive lessons at the same CEFR_Level, THE Adaptive_Difficulty_Engine SHALL display a suggestion notification to downgrade to the previous level
3. THE Adaptive_Difficulty_Engine SHALL present level change suggestions as a dismissible modal with "Chấp nhận" (accept) and "Giữ nguyên" (keep current) buttons
4. WHEN the user accepts a level change, THE Adaptive_Difficulty_Engine SHALL update the preferred_level field in user_goals_table and pre-select that level on the Dashboard
5. THE Adaptive_Difficulty_Engine SHALL calculate performance trends by querying the last 5 records from learning_history for the user's current level, computing average quiz_score/quiz_total ratio
6. IF the user is already at C2 and qualifies for upgrade, THEN THE Adaptive_Difficulty_Engine SHALL display a mastery congratulation message instead of an upgrade suggestion

### Requirement 4: Dashboard phân tích học tập (Learning Analytics)

**User Story:** As a learner, I want to see visual analytics of my learning progress on a dedicated page, so that I understand my improvement over time and identify areas to focus on.

#### Acceptance Criteria

1. THE Analytics_Dashboard SHALL display a summary row with 4 metric cards: total unique words tracked, words at Mastered level, words due for review today, and current CEFR_Level
2. THE Analytics_Dashboard SHALL display a 30-day activity grid (heatmap style) where each day cell is colored based on the number of words reviewed that day (0=empty, 1-5=light, 6-10=medium, 11+=dark)
3. THE Analytics_Dashboard SHALL display a horizontal bar chart showing word count at each Mastery_Level (New, Learning, Reviewing, Mastered, Lapsed) using color-coded bars
4. THE Analytics_Dashboard SHALL display quiz accuracy as a simple line chart showing the score percentage for the last 10 completed quizzes
5. WHEN a user has fewer than 3 records in learning_history, THE Analytics_Dashboard SHALL display an onboarding card with motivational text and a button to start a new lesson
6. THE Analytics_Dashboard SHALL be accessible via a new navigation button in the header, adding AppPhase.ANALYTICS to the existing phase system
7. THE Analytics_Dashboard SHALL render charts using inline SVG elements (no external charting library) to maintain the current zero-dependency approach for UI

### Requirement 5: Đề xuất từ vựng cá nhân hóa (Personalized Recommendations)

**User Story:** As a learner, I want the system to suggest new vocabulary words relevant to my interests and level, so that I can continuously expand my vocabulary without manually searching for new words.

#### Acceptance Criteria

1. WHEN a user opens the Dashboard and has completed at least 3 lessons, THE Recommendation_Engine SHALL display a "Gợi ý cho bạn" section with up to 5 recommended words
2. THE Recommendation_Engine SHALL generate recommendations by calling Gemini AI with a prompt containing: the user's top 3 most-studied topics, current CEFR_Level, and a list of already-mastered words to exclude
3. WHEN a user clicks "Học từ này" on a recommended word, THE Recommendation_Engine SHALL add that word to the Dashboard's vocabulary input textarea
4. THE Recommendation_Engine SHALL cache recommendations in localStorage with a 24-hour expiry to avoid redundant API calls
5. WHEN a user has completed lessons in fewer than 2 distinct topics, THE Recommendation_Engine SHALL display 3 popular topic suggestions (Travel, Business, Daily Life) with sample words instead of personalized recommendations
6. THE Recommendation_Engine SHALL provide each recommended word with: the English word, Vietnamese meaning, CEFR level tag, and the topic it relates to

### Requirement 6: Mục tiêu học tập và streak (Learning Goals & Streaks)

**User Story:** As a learner, I want to set a daily word review goal and track my consecutive study days, so that I build a consistent learning habit.

#### Acceptance Criteria

1. THE Learning_Goal_Manager SHALL allow users to set a daily goal from a dropdown: 5, 10, 15, or 20 words per day, stored in user_goals_table
2. WHEN a user reviews words (via lesson flashcards or Review_Session) and reaches their daily goal count, THE Learning_Goal_Manager SHALL display a congratulatory toast notification and increment current_streak
3. THE Learning_Goal_Manager SHALL display a circular progress indicator on the Dashboard showing: words reviewed today / daily goal, with percentage
4. IF the current date minus last_active_date exceeds 1 calendar day and the previous day's goal was not met, THEN THE Learning_Goal_Manager SHALL reset current_streak to 0
5. THE Learning_Goal_Manager SHALL persist daily_word_goal (default 10), current_streak, longest_streak, and last_active_date in user_goals_table on Supabase
6. WHEN a user opens the app, THE Learning_Goal_Manager SHALL display on the Dashboard: current streak (with fire emoji for streaks >= 3), today's progress, and words due for SRS review
7. THE Learning_Goal_Manager SHALL update longest_streak whenever current_streak exceeds the stored longest_streak value

### Requirement 7: Phát hiện điểm yếu bằng AI (AI-Powered Weakness Detection)

**User Story:** As a learner, I want the system to analyze my mistakes and identify specific weakness patterns, so that I can study targeted content to improve my weak areas.

#### Acceptance Criteria

1. WHEN a user has accumulated at least 10 incorrect answers across quiz sessions, THE Weakness_Detector SHALL analyze the incorrect answers to identify weakness categories
2. THE Weakness_Detector SHALL categorize weaknesses into 4 types: vocabulary_gap (unknown words), grammar_confusion (wrong part of speech selected), spelling_similarity (confused words with similar spelling), and meaning_overlap (confused words with similar Vietnamese meanings)
3. THE Weakness_Detector SHALL display identified weaknesses on the Analytics_Dashboard as a prioritized list showing: category name (in Vietnamese), count of related errors, and 2-3 example words from the user's mistakes
4. WHEN a user clicks "Luyện tập" on a weakness category, THE Weakness_Detector SHALL call Gemini AI to generate a targeted mini-lesson of 5 words addressing that specific weakness pattern
5. THE Weakness_Detector SHALL store incorrect quiz answers in a new field within word_mastery_table (incorrect_contexts: jsonb array) containing the question, user's wrong answer, and correct answer for pattern analysis
6. WHEN a user completes a targeted mini-lesson and scores above 80% on its quiz, THE Weakness_Detector SHALL mark that weakness as "improving" and reduce its priority in the weakness list

