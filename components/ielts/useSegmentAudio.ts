import { useCallback, useEffect, useMemo, useState } from 'react';
import { aiErrorMessage } from '../../services/aiClient';
import { prepareSegmentAudio, type AudioSegment, type AudioUrls } from '../../services/listeningAudioService';

export type SegmentAudioState =
  | { status: 'loading'; done: number; total: number }
  | { status: 'ready'; urls: AudioUrls }
  | { status: 'error'; message: string };

type Prepare = typeof prepareSegmentAudio;

/**
 * Prepares the clips for a part before it starts, with progress. `prepare`
 * can be swapped out (tests, previews without the AI server).
 */
export function useSegmentAudio(segments: readonly AudioSegment[], prepare: Prepare = prepareSegmentAudio) {
  const [state, setState] = useState<SegmentAudioState>({ status: 'loading', done: 0, total: segments.length });
  const [attempt, setAttempt] = useState(0);
  // Re-run only when the content changes, not on every new array.
  const signature = useMemo(() => JSON.stringify(segments), [segments]);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: 'loading', done: 0, total: segments.length });
    prepare(segments, {
      signal: ctrl.signal,
      onProgress: (done, total) => !ctrl.signal.aborted && setState({ status: 'loading', done, total }),
    })
      .then((urls) => !ctrl.signal.aborted && setState({ status: 'ready', urls }))
      .catch((err) => !ctrl.signal.aborted && setState({ status: 'error', message: aiErrorMessage(err) }));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, attempt, prepare]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
