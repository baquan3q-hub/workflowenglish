export interface GrammarForm {
  label: string;
  pattern: string;
}

export interface GrammarQuestion {
  prompt: string;
  answer: string;
  alternatives: string[];
  why: string;
}

export interface GrammarTopic {
  id: string;
  title: string;
  en: string;
  level: 'Nền tảng' | 'Trung cấp' | 'Nâng cao';
  aliases?: string[];
  forms: GrammarForm[];
  uses: string[];
  trap: { wrong: string; right: string; why: string };
  examples: { en: string; vi: string }[];
  questions: GrammarQuestion[];
}
