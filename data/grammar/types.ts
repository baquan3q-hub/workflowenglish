export interface GrammarLesson {
  id: string;
  title: string;
  goal: string;
  rule: string;
  examples: { en: string; vi: string }[];
  translation: string;
  write: string;
  speak: string;
  /** Eight practice items, placement, checkpoint, then two delayed-review items.
   * Brackets mark the answer and a distractor, in that order in the authored source. */
  items: string[];
}
