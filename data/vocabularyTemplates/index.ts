import type { VocabularyTemplate } from '../../types';
import { ACADEMIC_TEMPLATES } from './academic';
import { DAILY_TEMPLATES } from './daily';
import { ENVIRONMENT_TEMPLATES } from './environment';
import { FOOD_TEMPLATES } from './food';
import { HEALTH_TEMPLATES } from './health';
import { IELTS_TEMPLATES } from './ielts';
import { SOCIETY_TEMPLATES } from './society';
import { TECH_TEMPLATES } from './tech';
import { TRAVEL_TEMPLATES } from './travel';
import { WORK_TEMPLATES } from './work';

export { TEMPLATE_TOPICS } from './topics';

/**
 * Pre-built vocabulary templates organized by Topic × CEFR Level.
 * Users can browse and select these to quickly start a lesson without
 * manually typing words. Each topic group lives in its own file.
 */
export const VOCABULARY_TEMPLATES: VocabularyTemplate[] = [
  ...DAILY_TEMPLATES,
  ...TRAVEL_TEMPLATES,
  ...WORK_TEMPLATES,
  ...ACADEMIC_TEMPLATES,
  ...IELTS_TEMPLATES,
  ...TECH_TEMPLATES,
  ...HEALTH_TEMPLATES,
  ...FOOD_TEMPLATES,
  ...ENVIRONMENT_TEMPLATES,
  ...SOCIETY_TEMPLATES,
];
