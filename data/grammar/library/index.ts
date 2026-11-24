import { tenses } from './tenses';
import { foundations } from './foundations';
import { structures } from './structures';
import { advancedTopics } from './advancedTopics';
import { contrasts } from './contrasts';
import type { GrammarTopic } from './types';

const selectTopics = (bank: GrammarTopic[], ids: string[]) =>
  ids.map((id) => {
    const topic = bank.find((entry) => entry.id === id);
    if (!topic) throw new Error('Missing grammar topic: ' + id);
    return topic;
  });

export const topicGroups = [
  {
    id: 'tenses',
    title: '12 thì tiếng Anh',
    description: 'Xem công thức và cách dùng theo từng mốc thời gian.',
    topics: tenses,
  },
  {
    id: 'contrast',
    title: 'Phân biệt các thì',
    description: 'Chọn cấu trúc dựa vào ý bạn muốn nói.',
    topics: contrasts,
  },
  {
    id: 'sentence',
    title: 'Câu và trật tự từ',
    description: 'Dựng câu hoàn chỉnh, đặt câu hỏi và chia động từ.',
    topics: selectTopics(
      [...foundations, ...advancedTopics],
      ['sentence', 'questions', 'agreement', 'imperative', 'punctuation']
    ),
  },
  {
    id: 'word-classes',
    title: 'Từ loại và cụm từ',
    description: 'Danh từ, mạo từ, đại từ, tính từ, phó từ và giới từ.',
    topics: selectTopics(foundations, [
      'nouns',
      'articles',
      'pronouns',
      'determiners',
      'adjectives',
      'adverbs',
      'prepositions',
      'comparison',
    ]),
  },
  {
    id: 'clauses',
    title: 'Liên từ và mệnh đề',
    description: 'Nối ý, bổ nghĩa và diễn đạt nguyên nhân, điều kiện.',
    topics: selectTopics(structures, ['conjunctions', 'relative', 'conditions', 'clauses']),
  },
  {
    id: 'verbs',
    title: 'Động từ và cấu trúc câu',
    description: 'Bị động, tình thái, tường thuật và các mẫu động từ.',
    topics: selectTopics(structures, [
      'passive',
      'modals',
      'nonfinite',
      'reported',
      'causative',
      'phrasal',
      'used-to',
    ]),
  },
  {
    id: 'advanced',
    title: 'Cấu trúc nâng cao',
    description: 'Rút gọn, nhấn mạnh và diễn đạt chính xác trong IELTS.',
    topics: advancedTopics.filter((topic) => topic.id !== 'punctuation'),
  },
];

export const topics = topicGroups.flatMap((group) => group.topics);
export const groupFor = (id: string) => topicGroups.find((group) => group.topics.some((topic) => topic.id === id));

export function normalizeTopicSearch(value: string) {
  return value.toLocaleLowerCase('vi').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').trim();
}

export function searchTopics(query: string, level: GrammarTopic['level'] | '') {
  const tokens = normalizeTopicSearch(query).split(/\s+/).filter(Boolean);
  return topics.filter((topic) => {
    if (level && topic.level !== level) return false;
    const searchable = normalizeTopicSearch(
      [topic.title, topic.en, groupFor(topic.id)?.title, ...(topic.aliases ?? [])].join(' ')
    );
    return tokens.every((term) => searchable.includes(term));
  });
}

export const relatedTopics: Partial<Record<string, string[]>> = {
  'present-simple': ['present-contrast', 'questions', 'agreement'],
  'present-continuous': ['present-contrast', 'future-contrast'],
  'present-perfect': ['perfect-contrast', 'present-perfect-continuous'],
  'past-simple': ['perfect-contrast', 'past-contrast'],
  'past-continuous': ['past-contrast'],
  'past-perfect': ['past-contrast'],
  'future-simple': ['future-contrast', 'future-continuous'],
  passive: ['advanced-passive', 'causative', 'participle'],
  conjunctions: ['clauses', 'punctuation', 'cohesion'],
  adverbs: ['adjectives', 'inversion', 'cohesion'],
  conditions: ['advanced-conditions', 'wish'],
};

export function optionsFor(topic: GrammarTopic, position: number) {
  const question = topic.questions[position];
  const options = [...question.alternatives];
  const seed = [...topic.id].reduce((sum, letter) => sum + letter.charCodeAt(0), position);
  options.splice(seed % (options.length + 1), 0, question.answer);
  return options;
}
