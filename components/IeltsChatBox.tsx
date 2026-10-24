import React, { useState } from 'react';
import { FloatingChatBubble } from './ai-scaffold/FloatingChatBubble';
import { ScaffoldWindow } from './ai-scaffold/ScaffoldWindow';
import { getPhaseContextTip } from '../services/scaffoldChatService';

export interface IeltsChatBoxProps {
  darkMode?: boolean;
  currentUser: { id: string; displayName?: string };
  currentPhase?: string;
  targetBand?: number;
}

/**
 * IELTS Mentor AI: a draggable bubble that opens the mentor window
 * (floating, docked or full screen) with chat, sentence breakdown,
 * vocabulary and quiz tools. See components/ai-scaffold.
 */
export default function IeltsChatBox({ currentUser, currentPhase, targetBand }: IeltsChatBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const contextTip = getPhaseContextTip(currentPhase);

  return (
    <>
      <ScaffoldWindow
        open={isOpen}
        onClose={() => setIsOpen(false)}
        userId={currentUser.id}
        userName={currentUser.displayName}
        currentPhase={currentPhase}
        targetBand={targetBand}
        onStreamingChange={setStreaming}
      />
      {!isOpen && <FloatingChatBubble onOpen={() => setIsOpen(true)} contextBadge={contextTip?.badge} isStreaming={streaming} />}
    </>
  );
}
