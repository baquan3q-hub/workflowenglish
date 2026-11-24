import React, { useEffect, useRef, useState } from 'react';
import { signInWithGoogle } from '../services/supabaseClient';
import { IssueNav } from '../components/landing/IssueNav';
import { CoverAct } from '../components/landing/CoverAct';
import { LetterAct } from '../components/landing/LetterAct';
import { ForgettingCurveAct } from '../components/landing/ForgettingCurveAct';
import { LessonPeak } from '../components/landing/LessonPeak';
import { IeltsRoomAct } from '../components/landing/IeltsRoomAct';
import { GamesAct } from '../components/landing/GamesAct';
import { ProgressAct } from '../components/landing/ProgressAct';
import { CompareAct } from '../components/landing/CompareAct';
import { FaqAct } from '../components/landing/FaqAct';
import { SubscribeClose } from '../components/landing/SubscribeClose';
import './landing.css';

interface LandingPageProps {
  onGetStarted: () => void;
  onGoogle?: () => Promise<unknown>;
}

type ScrollCraftWindow = Window & {
  ScrollCraft?: { mount: (root: HTMLElement) => { destroy: () => void } };
};

const MOTION_CLASS = 'lp-motion';

/**
 * Loads the scrollcraft engine once and mounts it on the page root. With
 * reduced motion the engine is never mounted (or is torn down when the setting
 * changes), and the CSS shows every element in its finished state.
 */
function useScrollCraft(rootRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const host = window as ScrollCraftWindow;
    let engine: { destroy: () => void } | undefined;
    let script = document.querySelector<HTMLScriptElement>('script[data-vr-scrollcraft]');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');

    // destroy() stops the engine but leaves its last inline styles behind.
    const clearInline = () => {
      root.querySelectorAll<HTMLElement>('[data-sc-act]').forEach((el) => {
        el.style.removeProperty('height');
        el.style.removeProperty('--sc-p');
      });
      root
        .querySelectorAll<HTMLElement>('[data-sc-parallax], [data-sc-pan], [data-sc-cue], [data-sc-reveal], [data-sc-magnet]')
        .forEach((el) => {
          ['transform', 'opacity', 'clip-path', 'pointer-events'].forEach((prop) => el.style.removeProperty(prop));
        });
    };

    const sync = () => {
      if (motion.matches) {
        engine?.destroy();
        engine = undefined;
        root.classList.remove(MOTION_CLASS);
        clearInline();
      } else if (!engine && host.ScrollCraft) {
        root.classList.add(MOTION_CLASS);
        engine = host.ScrollCraft.mount(root);
      }
    };

    const onError = () => script?.remove();

    if (!host.ScrollCraft && !script) {
      script = document.createElement('script');
      script.dataset.vrScrollcraft = '';
      script.src = '/scrollcraft/scrollcraft.js';
      script.async = true;
    }

    script?.addEventListener('load', sync, { once: true });
    script?.addEventListener('error', onError, { once: true });
    if (script && !script.isConnected) document.head.append(script);

    motion.addEventListener('change', sync);
    sync();

    return () => {
      script?.removeEventListener('load', sync);
      script?.removeEventListener('error', onError);
      motion.removeEventListener('change', sync);
      engine?.destroy();
      root.classList.remove(MOTION_CLASS);
    };
  }, [rootRef]);
}

/** The landing page, laid out as one magazine issue: "VocabMaster, Số 01". */
export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onGoogle = signInWithGoogle }) => {
  const root = useRef<HTMLDivElement>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useScrollCraft(root);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'VocabMaster 2026 | Học từ vựng và Luyện thi IELTS Academic';
    return () => {
      document.title = prevTitle;
    };
  }, []);

  const handleGoogleAuth = async () => {
    if (googleBusy) return;
    setGoogleBusy(true);
    setGoogleError(null);
    try {
      await onGoogle();
    } catch {
      setGoogleError('Chưa thể đăng nhập bằng Google lúc này. Vui lòng bấm "Bắt đầu học miễn phí".');
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div className="lp-page" ref={root}>
      <a className="lp-skip" href="#lp-main">Bỏ qua, đến nội dung chính</a>
      <IssueNav onLogin={onGetStarted} onStart={onGetStarted} />
      <main id="lp-main">
        <CoverAct onStart={onGetStarted} />
        <LetterAct />
        <ForgettingCurveAct />
        <LessonPeak onSave={onGetStarted} />
        <IeltsRoomAct />
        <GamesAct />
        <ProgressAct />
        <CompareAct />
        <FaqAct />
        <SubscribeClose
          onStart={onGetStarted}
          onGoogle={handleGoogleAuth}
          googleBusy={googleBusy}
          googleError={googleError}
        />
      </main>
    </div>
  );
};

export default LandingPage;
