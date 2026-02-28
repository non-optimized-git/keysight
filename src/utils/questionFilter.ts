import type { Question } from '../types';

const SUMMARY_RE = /summary/i;

export function isSummaryQuestion(q: Question): boolean {
  return SUMMARY_RE.test(q.description) || SUMMARY_RE.test(q.id);
}

export function filterOutSummaryQuestions(questions: Question[]): Question[] {
  return questions.filter((q) => !isSummaryQuestion(q));
}
