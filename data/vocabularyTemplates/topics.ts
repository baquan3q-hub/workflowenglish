import type { Tone } from '../../components/ui/palette';

/**
 * The topics a template can belong to, with their Vietnamese label and tone.
 * Values mirror TOPICS in views/Dashboard.tsx (a test checks they agree), so a
 * picked template sets a topic the Dashboard already knows.
 */
export const TEMPLATE_TOPICS: ReadonlyArray<{ value: string; label: string; tone: Tone }> = [
  { value: 'General Communication', label: 'Giao tiếp', tone: 'sky' },
  { value: 'Business & Office', label: 'Công việc', tone: 'periwinkle' },
  { value: 'Travel & Tourism', label: 'Du lịch', tone: 'aqua' },
  { value: 'Academic & IELTS', label: 'Học thuật & IELTS', tone: 'lavender' },
  { value: 'Technology', label: 'Công nghệ', tone: 'mint' },
  { value: 'Food & Dining', label: 'Ẩm thực', tone: 'peach' },
  { value: 'Health & Lifestyle', label: 'Sức khoẻ', tone: 'blush' },
];
