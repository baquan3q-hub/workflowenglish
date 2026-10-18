/**
 * Answer sheet for one question group: completion (form, notes, table,
 * sentences), short answer, multiple choice, choose-two, matching and map.
 */
import React from 'react';
import type { ListeningAnswers, ListeningGroup } from '../../../data/ielts/listening/types';
import type { GroupKind } from '../questions/questionLogic';
import {
  ChoiceQuestions,
  CompletionBody,
  GroupHeader,
  groupPanel,
  MatchingQuestions,
  MultiChoice,
  OptionsBox,
  ShortAnswers,
  textBlanks,
} from '../questions/parts';
import ListeningMap from './ListeningMap';

interface Props {
  group: ListeningGroup;
  answers: ListeningAnswers;
  onChange: (number: number, value: string) => void;
}

const KIND: Record<ListeningGroup['type'], GroupKind> = {
  completion: 'completion',
  short_answer: 'short_answer',
  mcq: 'mcq',
  mcq_multi: 'mcq_multi',
  matching: 'matching_feature',
  map: 'map',
};

function Body({ group, answers, onChange }: Props) {
  switch (group.type) {
    case 'completion':
      return <CompletionBody title={group.title} lines={group.lines} table={group.table} renderBlank={textBlanks(answers, group.wordLimit > 1, onChange)} />;
    case 'short_answer':
      return <ShortAnswers questions={group.questions} answers={answers} onChange={onChange} />;
    case 'mcq':
      return <ChoiceQuestions questions={group.questions} answers={answers} onChange={onChange} />;
    case 'mcq_multi':
      return <MultiChoice questions={group.questions} prompt={group.prompt} options={group.options} answers={answers} onChange={onChange} />;
    case 'matching':
      return (
        <>
          <OptionsBox title={group.optionsTitle} options={group.options} />
          <MatchingQuestions questions={group.questions} letters={group.options.map((o) => o.key)} answers={answers} onChange={onChange} />
        </>
      );
    case 'map':
      return (
        <>
          <ListeningMap map={group.map} />
          <div className="mt-4">
            <MatchingQuestions
              questions={group.questions}
              letters={group.map.shapes.flatMap((s) => (s.key ? [s.key] : [])).sort()}
              answers={answers}
              onChange={onChange}
              stacked
            />
          </div>
        </>
      );
  }
}

export default function QuestionGroupView(props: Props) {
  const { group } = props;
  return (
    <section className={groupPanel}>
      <GroupHeader kind={KIND[group.type]} questions={group.questions} instruction={group.instruction} />
      <Body {...props} />
    </section>
  );
}
