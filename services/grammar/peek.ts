/** Where the grammar module keeps its state. Kept apart so the dashboard can read it cheaply. */
export const grammarStateKey = (user: string) => 'workflow:grammar:v1:' + user + ':state';

/** Title of the grammar lesson in progress, read without loading the grammar module. */
export function grammarLessonNow(user: string): string | undefined {
  try {
    const s = JSON.parse(localStorage.getItem(grammarStateKey(user)) || 'null');
    return typeof s?.current?.title === 'string' ? s.current.title : undefined;
  } catch {
    return undefined;
  }
}
